"""Synthetic Legal Metrology registry. Safe to wipe backend/data/pramana.db and re-seed."""
from __future__ import annotations

import hashlib
import json
import secrets
import sqlite3

from werkzeug.security import generate_password_hash

from backend.config import DB_PATH
from backend.dates import now_iso


def seed():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    if con.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]:
        con.close()
        return
    pw_user = generate_password_hash("trader123")
    pw_off = generate_password_hash("officer123")
    users = [
        (1, "Priya Shah", "trader@pramana.in", pw_user, "user",
         "Shah Kirana & General Stores", "98200 11420", "MH-DLR-8821",
         "Mumbai Suburban", "Maharashtra", None, None, "Registered user / trader"),
        (2, "R. Kulkarni", "weigh@pramana.in", pw_user, "user",
         "Kulkarni Freight Weighbridge", "98765 33021", "MH-USR-4410",
         "Pune", "Maharashtra", None, None, "Weighbridge operator"),
        (3, "Inspector K. Venkatesh", "officer@pramana.in", pw_off, "officer",
         "Legal Metrology, Mumbai Zone-II", "022-2262 1400", None,
         "Mumbai Suburban", "Maharashtra", "LMO-MH-4412", "Mumbai Zone-II",
         "Legal Metrology Officer"),
        (4, "Inspector A. Banerjee", "lmo.kol@pramana.in", pw_off, "officer",
         "Legal Metrology, Kolkata Central", "033-2248 9000", None,
         "Kolkata", "West Bengal", "LMO-WB-2201", "Kolkata Central",
         "Legal Metrology Officer"),
    ]
    con.executemany(
        """INSERT INTO users (id,name,email,password_hash,role,org,phone,license_no,district,state,lmo_code,zone,title)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        users,
    )
    instruments = [
        (1, 1, "ESS-30K-88291", "Counter scale — billing", "electronic_weighing", "NAWI",
         "Essae Digitronics", "DS-852 30 kg", "IND/09/2019/214", "R76/2019-IN-4412",
         "III", 30, 0.005, 0.005, 2022,
         "Shop 14, SV Road, Andheri West", "Mumbai Suburban", "Maharashtra",
         19.1197, 72.8464, "verified", "genuine",
         "LMO-MH-4412", 2026, "B", "2026-04-18", "2027-04-18",
         "img/scale-genuine.jpg", "Lead seal intact. Model approval matches nameplate."),
        (2, 1, "UNK-PL-77310", "Platform scale — back room", "platform_scale", "NAWI",
         "Unknown / unbranded", "PX-150 clone", None, None,
         "III", 150, 0.02, 0.02, 2024,
         "Shop 14, SV Road, Andheri West", "Mumbai Suburban", "Maharashtra",
         19.1197, 72.8464, "rejected", "third_party",
         None, None, None, None, None,
         "img/scale-fake.jpg", "No model approval. Aftermarket indicator. Seal missing."),
        (3, 2, "AWTX-50T-1902", "50 t road weighbridge", "weighbridge", "NAWI",
         "Avery Weigh-Tronix", "BridgeMont 50t", "IND/09/2017/088", "R76/2017-IN-088",
         "III", 50000, 10, 10, 2018,
         "NH-48, Talegaon yard", "Pune", "Maharashtra",
         18.7350, 73.6752, "pending", "genuine",
         "LMO-MH-4412", 2025, "C", "2025-08-12", "2026-08-12",
         "img/weighbridge.jpg", "Re-verification due. One load cell flagged for drift."),
        (4, 2, "FLW-DSP-5521", "Petrol dispenser bay 2", "fuel_dispenser", "DMS",
         "Gilbarco-compatible OEM", "TQM-4P", "IND/09/2020/301", "R117/2020-IN-301",
         "0.5", 0, 0.01, 0.01, 2021,
         "Highway filling station, Hinjewadi", "Pune", "Maharashtra",
         18.5912, 73.7389, "verified", "genuine",
         "LMO-MH-3301", 2026, "A", "2026-02-02", "2027-02-02",
         "img/petrol-dispenser.jpg", "Meter and pulser seals intact."),
        (5, 1, "LC-C3-99102", "Spare shear-beam load cell", "load_cell", "R60",
         "Flintec", "SB14 C3 500 kg", "IND/09/2021/512", "R60/2021-IN-512",
         "C3", 500, 0, 0, 2023,
         "Shah Kirana stores — spare", "Mumbai Suburban", "Maharashtra",
         19.1197, 72.8464, "verified", "genuine",
         "LMO-MH-4412", 2025, "D", "2025-11-20", "2026-11-20",
         "img/loadcell.jpg", "nLC = 3000. Compatible with Class III n≤3000 instruments."),
        (6, 1, "CNT-BM-1102", "Cast iron beam scale 10 kg", "beam_scale", "NAWI",
         "Krishna Enterprises", "BS-10", "IND/09/2015/044", None,
         "IIII", 10, 0.005, 0.005, 2016,
         "Shah Kirana & General Stores", "Mumbai Suburban", "Maharashtra",
         19.1197, 72.8464, "expired", "genuine",
         "LMO-MH-4412", 2024, "A", "2024-03-11", "2026-03-11",
         "img/stamp-seal.png", "Re-verification window lapsed (24-month rule for beam scales)."),
    ]
    con.executemany(
        """INSERT INTO instruments (
            id,owner_id,serial,name,type,category,manufacturer,model,model_approval,oiml_cert,
            accuracy_class,max_kg,e_value,d_value,year_of_make,premises,district,state,lat,lng,
            status,oem_status,stamp_lmo,stamp_year,stamp_quarter,last_verified,next_due,photo,notes
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        instruments,
    )
    apps = [
        ("APP-2026-01402", 3, 2, "reverification", "inspection_scheduled", "2026-08-14T09:10:00Z", 3,
         "Assigned to LMO-MH-4412. Field visit 26 Aug 2026."),
        ("APP-2026-01488", 2, 1, "first_verification", "rejected", "2026-07-02T11:40:00Z", 3,
         "Rejected: no model approval, third-party indicator, seal absent."),
        ("APP-2026-01510", 1, 1, "reverification", "certificate_issued", "2026-04-10T08:00:00Z", 3,
         "Passed MPE at 0, 500e, 2000e and Max."),
        ("APP-2026-01590", 6, 1, "reverification", "submitted", "2026-08-20T16:22:00Z", None,
         "Trader applied after noticing expiry on public QR."),
    ]
    for i, a in enumerate(apps, start=1):
        con.execute(
            """INSERT INTO applications (id,public_id,instrument_id,applicant_id,kind,status,created_at,assigned_officer,remarks)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (i, *a),
        )
    for row in [
        ("MH/2026/B/4412/08821", 1, 3, "2026-04-18", "2027-04-18", "valid"),
        ("MH/2026/A/3301/05521", 4, 3, "2026-02-02", "2027-02-02", "valid"),
        ("MH/2025/C/4412/01902", 3, 3, "2025-08-12", "2026-08-12", "due"),
        ("MH/2024/A/4412/01102", 6, 3, "2024-03-11", "2026-03-11", "expired"),
    ]:
        con.execute(
            """INSERT INTO certificates (cert_no,instrument_id,officer_id,issued_on,valid_until,qr_token,status)
               VALUES (?,?,?,?,?,?,?)""",
            (*row[:5], secrets.token_hex(8), row[5]),
        )
    con.execute(
        """INSERT INTO inspections (application_id,instrument_id,officer_id,ts,lat,lng,seal_intact,stamp_ok,mpe_json,verdict,photos,notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (3, 1, 3, "2026-04-18T10:15:00Z", 19.1197, 72.8464, 1, 1,
         json.dumps([
             {"load_kg": 0, "indicated": 0.000, "error_e": 0.0, "mpe_e": 0.5, "pass": True},
             {"load_kg": 2.5, "indicated": 2.500, "error_e": 0.0, "mpe_e": 0.5, "pass": True},
             {"load_kg": 10.0, "indicated": 10.005, "error_e": 1.0, "mpe_e": 1.0, "pass": True},
             {"load_kg": 30.0, "indicated": 30.005, "error_e": 1.0, "mpe_e": 1.5, "pass": True},
         ]),
         "pass", "img/scale-genuine.jpg", "Within OIML R 76 Class III verification MPE."),
    )
    genesis = "GENESIS"
    chain = hashlib.sha256(f"{genesis}|seed|SYSTEM".encode()).hexdigest()
    con.execute(
        """INSERT INTO audit_log (ts,actor_id,action,entity,entity_id,payload,prev_hash,chain_hash)
           VALUES (?,?,?,?,?,?,?,?)""",
        (now_iso(), None, "SEED", "system", "0",
         json.dumps({"note": "Synthetic Legal Metrology dataset initialised"}), genesis, chain),
    )
    con.commit()
    con.close()
