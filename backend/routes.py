"""HTTP API. Backend team owns this file."""
from __future__ import annotations

import json
import secrets
from datetime import datetime
from pathlib import Path

from flask import Flask, g, jsonify, request, send_from_directory, session

from backend.authenticity import authenticity_report, image_stats
from backend.compliance import (
    GUIDELINES,
    OIML_R76_MPE_BANDS,
    REVERIFY_MONTHS,
    compliance_engine,
    mpe_for,
)
from backend.config import FRONTEND, UPLOADS
from backend.dates import add_months, current_quarter, now_iso, today
from backend.db import execute, query, row_to_dict, rows_to_dicts
from security.audit import audit
from security.auth import authenticate, close_session, login_required, open_session
from security.ratelimit import public_limit


def enrich_instrument(d: dict) -> dict:
    if not d:
        return d
    d["compliance"] = compliance_engine(d)
    cert = query(
        "SELECT * FROM certificates WHERE instrument_id=? ORDER BY id DESC LIMIT 1",
        (d["id"],),
        one=True,
    )
    d["certificate"] = row_to_dict(cert) if cert else None
    return d


def run_photo_check(user_id=None):
    limited = public_limit() if user_id is None else None
    if limited:
        return limited
    if "photo" not in request.files:
        return jsonify({"error": "Upload a photograph first, then tap Check."}), 400
    f = request.files["photo"]
    if not f or not f.filename:
        return jsonify({"error": "Upload a photograph first, then tap Check."}), 400
    ext = Path(f.filename or "shot.jpg").suffix.lower() or ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        return jsonify({"error": "Upload a JPG, PNG or WEBP photograph."}), 400
    fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}{ext}"
    path = UPLOADS / fname
    f.save(path)
    try:
        stats = image_stats(path)
    except Exception:
        return jsonify({"error": "Could not read that image. Try another photograph."}), 400

    serial = request.form.get("serial") or None
    claimed = request.form.get("claimed_type") or None
    iid = request.form.get("instrument_id")
    report = authenticity_report(stats, serial, claimed, user_id)
    scan_id = execute(
        """INSERT INTO scans (user_id,instrument_id,ts,photo,verdict,score,report_json)
           VALUES (?,?,?,?,?,?,?)""",
        (
            user_id, int(iid) if iid else None, now_iso(),
            f"uploads/{fname}", report["label"], report["confidence"], json.dumps(report, default=str),
        ),
    )
    if user_id and iid and report["label"] == "THIRD_PARTY":
        execute("UPDATE instruments SET oem_status='third_party' WHERE id=?", (int(iid),))
    elif user_id and iid and report["label"] == "GENUINE":
        execute("UPDATE instruments SET oem_status='genuine' WHERE id=? AND oem_status='unknown'", (int(iid),))
    audit("PHOTO_SCAN", "scan", scan_id, {"label": report["label"], "serial": serial, "public": not bool(user_id)})
    report["photo_url"] = f"/uploads/{fname}"
    report["scan_id"] = scan_id
    return jsonify(report)


def register_routes(app: Flask) -> None:
    @app.route("/")
    def index():
        return send_from_directory(FRONTEND, "index.html")

    @app.route("/uploads/<path:name>")
    def uploaded(name):
        return send_from_directory(UPLOADS, name)

    @app.get("/api/health")
    def health():
        return {"ok": True, "service": "PRAMANA", "ps": "SIH26036"}

    @app.post("/api/login")
    def login():
        data = request.get_json(force=True, silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        role = (data.get("role") or "").strip().lower()
        user, err, status = authenticate(email, password, role or None)
        if err:
            return jsonify({"error": err}), status
        u = open_session(user)
        audit("LOGIN", "user", user["id"], {"role": user["role"]})
        return {"user": u}

    @app.post("/api/logout")
    def logout():
        audit("LOGOUT", "user", session.get("uid") or "")
        close_session()
        return {"ok": True}

    @app.get("/api/me")
    @login_required()
    def me():
        return {"user": g.user}

    @app.get("/api/instruments")
    @login_required()
    def list_instruments():
        if g.user["role"] == "officer":
            rows = query("SELECT * FROM instruments ORDER BY id")
        else:
            rows = query("SELECT * FROM instruments WHERE owner_id=? ORDER BY id", (g.user["id"],))
        return {"instruments": [enrich_instrument(row_to_dict(r)) for r in rows]}

    @app.get("/api/instruments/<int:iid>")
    @login_required()
    def get_instrument(iid):
        row = query("SELECT * FROM instruments WHERE id=?", (iid,), one=True)
        if not row:
            return jsonify({"error": "Not found"}), 404
        if g.user["role"] != "officer" and row["owner_id"] != g.user["id"]:
            return jsonify({"error": "Forbidden"}), 403
        d = enrich_instrument(row_to_dict(row))
        d["applications"] = rows_to_dicts(
            query("SELECT * FROM applications WHERE instrument_id=? ORDER BY id DESC", (iid,))
        )
        d["inspections"] = rows_to_dicts(
            query("SELECT * FROM inspections WHERE instrument_id=? ORDER BY id DESC", (iid,))
        )
        d["scans"] = rows_to_dicts(
            query("SELECT * FROM scans WHERE instrument_id=? ORDER BY id DESC LIMIT 10", (iid,))
        )
        return d

    @app.post("/api/instruments")
    @login_required("user")
    def create_instrument():
        data = request.get_json(force=True, silent=True) or {}
        serial = (data.get("serial") or "").strip().upper()
        if not serial:
            return jsonify({"error": "Serial number is required"}), 400
        if query("SELECT id FROM instruments WHERE serial=?", (serial,), one=True):
            return jsonify({"error": "Serial already registered"}), 409
        itype = data.get("type") or "electronic_weighing"
        iid = execute(
            """INSERT INTO instruments (
                owner_id,serial,name,type,category,manufacturer,model,model_approval,oiml_cert,
                accuracy_class,max_kg,e_value,d_value,year_of_make,premises,district,state,lat,lng,
                status,oem_status,last_verified,next_due,notes
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                g.user["id"], serial,
                data.get("name") or "New instrument",
                itype, data.get("category") or "NAWI",
                data.get("manufacturer") or "",
                data.get("model") or "",
                data.get("model_approval") or None,
                data.get("oiml_cert") or None,
                (data.get("accuracy_class") or "III").upper(),
                float(data.get("max_kg") or 30),
                float(data.get("e_value") or 0.005),
                float(data.get("d_value") or data.get("e_value") or 0.005),
                int(data.get("year_of_make") or datetime.utcnow().year),
                data.get("premises") or g.user.get("org"),
                data.get("district") or g.user.get("district"),
                data.get("state") or g.user.get("state"),
                data.get("lat"), data.get("lng"),
                "pending", "unknown", None, None,
                data.get("notes") or "Awaiting first verification.",
            ),
        )
        audit("REGISTER_INSTRUMENT", "instrument", iid, {"serial": serial})
        row = query("SELECT * FROM instruments WHERE id=?", (iid,), one=True)
        return {"instrument": enrich_instrument(row_to_dict(row))}, 201

    @app.get("/api/applications")
    @login_required()
    def list_apps():
        if g.user["role"] == "officer":
            rows = query(
                """SELECT a.*, i.serial, i.name AS instrument_name, i.type, i.premises, i.status AS inst_status,
                          u.name AS applicant_name, u.org
                   FROM applications a
                   JOIN instruments i ON i.id=a.instrument_id
                   JOIN users u ON u.id=a.applicant_id
                   ORDER BY a.id DESC"""
            )
        else:
            rows = query(
                """SELECT a.*, i.serial, i.name AS instrument_name, i.type, i.premises, i.status AS inst_status
                   FROM applications a
                   JOIN instruments i ON i.id=a.instrument_id
                   WHERE a.applicant_id=?
                   ORDER BY a.id DESC""",
                (g.user["id"],),
            )
        return {"applications": rows_to_dicts(rows)}

    @app.post("/api/applications")
    @login_required("user")
    def create_app():
        data = request.get_json(force=True, silent=True) or {}
        iid = int(data.get("instrument_id") or 0)
        inst = query("SELECT * FROM instruments WHERE id=? AND owner_id=?", (iid, g.user["id"]), one=True)
        if not inst:
            return jsonify({"error": "Instrument not found"}), 404
        public_id = f"APP-{datetime.utcnow().year}-{secrets.randbelow(90000)+10000}"
        kind = data.get("kind") or "reverification"
        aid = execute(
            """INSERT INTO applications (public_id,instrument_id,applicant_id,kind,status,created_at,remarks)
               VALUES (?,?,?,?,?,?,?)""",
            (public_id, iid, g.user["id"], kind, "submitted", now_iso(), data.get("remarks") or ""),
        )
        execute("UPDATE instruments SET status='pending' WHERE id=? AND status!='rejected'", (iid,))
        audit("SUBMIT_APPLICATION", "application", aid, {"public_id": public_id, "kind": kind})
        return {"id": aid, "public_id": public_id, "status": "submitted"}, 201

    @app.post("/api/applications/<int:aid>/assign")
    @login_required("officer")
    def assign_app(aid):
        execute(
            "UPDATE applications SET assigned_officer=?, status='inspection_scheduled' WHERE id=?",
            (g.user["id"], aid),
        )
        audit("ASSIGN", "application", aid, {"officer": g.user["lmo_code"]})
        return {"ok": True}

    @app.post("/api/inspect")
    @login_required("officer")
    def inspect():
        data = request.get_json(force=True, silent=True) or {}
        iid = int(data.get("instrument_id") or 0)
        inst = query("SELECT * FROM instruments WHERE id=?", (iid,), one=True)
        if not inst:
            return jsonify({"error": "Instrument not found"}), 404
        inst_d = row_to_dict(inst)
        tests = data.get("tests") or []
        parsed, all_pass = [], True
        e = float(inst_d.get("e_value") or 0.005)
        cls = inst_d.get("accuracy_class") or "III"
        for t in tests:
            load = float(t.get("load_kg") or 0)
            indicated = float(t.get("indicated") or 0)
            error_e = round((indicated - load) / e, 3) if e else 0
            mpe = mpe_for(cls, load / e if e else 0, in_service=False)
            ok = abs(error_e) <= mpe + 1e-9
            if not ok:
                all_pass = False
            parsed.append({"load_kg": load, "indicated": indicated, "error_e": error_e, "mpe_e": mpe, "pass": ok})

        seal_intact = 1 if data.get("seal_intact") else 0
        stamp_ok = 1 if data.get("stamp_ok") else 0
        if data.get("oem") == "third_party" or not seal_intact:
            all_pass = False

        verdict = "pass" if all_pass and data.get("verdict") != "fail" else "fail"
        if data.get("verdict") in {"pass", "fail"}:
            verdict = data["verdict"]

        insp_id = execute(
            """INSERT INTO inspections (application_id,instrument_id,officer_id,ts,lat,lng,seal_intact,stamp_ok,mpe_json,verdict,photos,notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                data.get("application_id"), iid, g.user["id"], now_iso(),
                data.get("lat"), data.get("lng"), seal_intact, stamp_ok,
                json.dumps(parsed), verdict, json.dumps(data.get("photos") or []), data.get("notes") or "",
            ),
        )

        if verdict == "pass":
            due = add_months(today(), REVERIFY_MONTHS.get(inst_d["type"], 12))
            q, year = current_quarter(), datetime.utcnow().year
            execute(
                """UPDATE instruments SET status='verified', oem_status=?, stamp_lmo=?, stamp_year=?, stamp_quarter=?,
                   last_verified=?, next_due=?, notes=? WHERE id=?""",
                (
                    data.get("oem") or inst_d.get("oem_status") or "genuine",
                    g.user.get("lmo_code"), year, q, today(), due,
                    data.get("notes") or inst_d.get("notes"), iid,
                ),
            )
            cert_no = f"{(inst_d.get('state') or 'IN')[:2].upper()}/{year}/{q}/{g.user.get('lmo_code','LMO').split('-')[-1]}/{iid:05d}"
            execute(
                """INSERT INTO certificates (cert_no,instrument_id,officer_id,issued_on,valid_until,qr_token,status)
                   VALUES (?,?,?,?,?,?,?)""",
                (cert_no, iid, g.user["id"], today(), due, secrets.token_hex(8), "valid"),
            )
            if data.get("application_id"):
                execute(
                    "UPDATE applications SET status='certificate_issued', assigned_officer=?, remarks=? WHERE id=?",
                    (g.user["id"], f"Certificate {cert_no} issued.", data.get("application_id")),
                )
            audit("INSPECT_PASS", "instrument", iid, {"cert": cert_no, "tests": parsed})
            return {"verdict": "pass", "cert_no": cert_no, "valid_until": due, "tests": parsed, "inspection_id": insp_id}

        oem = data.get("oem") or inst_d.get("oem_status")
        new_status = "rejected"
        if not seal_intact and oem != "third_party":
            new_status = "sealed_tampered"
        execute(
            "UPDATE instruments SET status=?, oem_status=?, notes=? WHERE id=?",
            (new_status, oem or "unknown", data.get("notes") or "Failed inspection.", iid),
        )
        if data.get("application_id"):
            execute(
                "UPDATE applications SET status='rejected', assigned_officer=?, remarks=? WHERE id=?",
                (g.user["id"], data.get("notes") or "Failed inspection.", data.get("application_id")),
            )
        audit("INSPECT_FAIL", "instrument", iid, {"tests": parsed, "oem": oem})
        return {"verdict": "fail", "tests": parsed, "inspection_id": insp_id, "status": new_status}

    @app.post("/api/analyze")
    @login_required()
    def analyze():
        return run_photo_check(g.user["id"])

    @app.post("/api/public/analyze")
    def public_analyze():
        return run_photo_check(None)

    @app.post("/api/compliance-check")
    @login_required()
    def compliance_check():
        data = request.get_json(force=True, silent=True) or {}
        payload = {
            "accuracy_class": data.get("accuracy_class") or "III",
            "max_kg": float(data.get("max_kg") or 0),
            "e_value": float(data.get("e_value") or 0.001),
            "type": data.get("type") or "electronic_weighing",
            "model_approval": data.get("model_approval"),
            "oem_status": data.get("oem_status") or "unknown",
            "status": data.get("status") or "pending",
            "stamp_lmo": data.get("stamp_lmo"),
            "stamp_year": data.get("stamp_year"),
            "stamp_quarter": data.get("stamp_quarter"),
            "next_due": data.get("next_due"),
        }
        load = float(data["load_kg"]) if data.get("load_kg") not in (None, "") else None
        err = float(data["error_e"]) if data.get("error_e") not in (None, "") else None
        return compliance_engine(payload, indicated_error_e=err, load_kg=load)

    @app.get("/api/public/verify")
    def public_verify():
        q = (request.args.get("q") or "").strip()
        if not q:
            return jsonify({"error": "Enter a certificate number, serial or QR token."}), 400
        cert = query("SELECT * FROM certificates WHERE cert_no=? OR qr_token=?", (q, q), one=True)
        inst = None
        if cert:
            inst = query("SELECT * FROM instruments WHERE id=?", (cert["instrument_id"],), one=True)
        else:
            inst = query("SELECT * FROM instruments WHERE serial=?", (q,), one=True)
            if inst:
                cert = query(
                    "SELECT * FROM certificates WHERE instrument_id=? ORDER BY id DESC LIMIT 1",
                    (inst["id"],), one=True,
                )
        if not inst:
            return {
                "found": False,
                "headline": "No record in PRAMĀṆA registry",
                "note": "This serial / certificate is not on the synthetic registry. Treat as unverified until a Legal Metrology Officer inspects it.",
            }
        d = enrich_instrument(row_to_dict(inst))
        return {
            "found": True,
            "serial": d["serial"], "name": d["name"], "type": d["type"],
            "manufacturer": d["manufacturer"], "model": d["model"],
            "model_approval": d["model_approval"], "accuracy_class": d["accuracy_class"],
            "premises": d["premises"], "district": d["district"], "state": d["state"],
            "status": d["status"], "oem_status": d["oem_status"],
            "stamp_lmo": d["stamp_lmo"], "stamp_year": d["stamp_year"], "stamp_quarter": d["stamp_quarter"],
            "last_verified": d["last_verified"], "next_due": d["next_due"],
            "photo": d["photo"], "compliance": d["compliance"], "certificate": d["certificate"],
        }

    @app.post("/api/complaints")
    def complaints():
        data = request.get_json(force=True, silent=True) or {}
        cid = execute(
            "INSERT INTO complaints (ts,name,phone,premises,serial,note,status) VALUES (?,?,?,?,?,?,?)",
            (now_iso(), data.get("name"), data.get("phone"), data.get("premises"),
             data.get("serial"), data.get("note"), "open"),
        )
        return {"id": cid, "status": "open"}

    @app.get("/api/guidelines")
    def guidelines():
        return {"guidelines": GUIDELINES, "reverify_months": REVERIFY_MONTHS, "mpe_bands": OIML_R76_MPE_BANDS}

    @app.get("/api/stats")
    @login_required("officer")
    def stats():
        inst = rows_to_dicts(query("SELECT status, oem_status, type FROM instruments"))
        apps = rows_to_dicts(query("SELECT status FROM applications"))
        by_status, by_oem, by_app = {}, {}, {}
        for i in inst:
            by_status[i["status"]] = by_status.get(i["status"], 0) + 1
            by_oem[i["oem_status"]] = by_oem.get(i["oem_status"], 0) + 1
        for a in apps:
            by_app[a["status"]] = by_app.get(a["status"], 0) + 1
        due_soon = query(
            "SELECT COUNT(*) c FROM instruments WHERE next_due IS NOT NULL AND next_due <= date('now','+30 day')",
            one=True,
        )["c"]
        return {
            "instruments": len(inst), "by_status": by_status, "by_oem": by_oem,
            "applications": by_app, "due_soon": due_soon,
            "audits": query("SELECT COUNT(*) c FROM audit_log", one=True)["c"],
        }

    @app.get("/api/audit")
    @login_required("officer")
    def audit_list():
        rows = query(
            """SELECT a.*, u.name AS actor_name, u.role AS actor_role
               FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id
               ORDER BY a.id DESC LIMIT 80"""
        )
        return {"events": rows_to_dicts(rows)}

    @app.get("/api/scans")
    @login_required()
    def list_scans():
        if g.user["role"] == "officer":
            rows = query("SELECT * FROM scans ORDER BY id DESC LIMIT 40")
        else:
            rows = query("SELECT * FROM scans WHERE user_id=? ORDER BY id DESC LIMIT 40", (g.user["id"],))
        return {"scans": rows_to_dicts(rows)}
