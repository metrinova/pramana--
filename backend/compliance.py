"""Legal Metrology (India) + OIML rule engine.

Edit this file to change tolerances, re-verification months, or guideline text.
The officer still makes the legal decision — this only scores a file.
"""
from __future__ import annotations

from backend.dates import today

REVERIFY_MONTHS = {
    "weight": 24,
    "capacity_measure": 24,
    "length_measure": 24,
    "tape": 24,
    "beam_scale": 24,
    "counter_machine": 24,
    "storage_tank": 60,
    "electronic_weighing": 12,
    "platform_scale": 12,
    "weighbridge": 12,
    "fuel_dispenser": 12,
    "flow_meter": 12,
    "taxi_meter": 12,
    "tank_lorry": 12,
    "load_cell": 12,
    "water_meter": 12,
    "clinical_thermometer": 12,
    "sphygmomanometer": 12,
}

OIML_R76_N_LIMITS = {
    "I": (50000, 1_000_000),
    "II": (100, 100000),
    "III": (100, 10000),
    "IIII": (100, 1000),
}

OIML_R76_MPE_BANDS = {
    "I": [(0, 50000, 0.5), (50000, 200000, 1.0), (200000, 10**12, 1.5)],
    "II": [(0, 5000, 0.5), (5000, 20000, 1.0), (20000, 10**12, 1.5)],
    "III": [(0, 500, 0.5), (500, 2000, 1.0), (2000, 10**12, 1.5)],
    "IIII": [(0, 50, 0.5), (50, 200, 1.0), (200, 10**12, 1.5)],
}

GUIDELINES = [
    {
        "id": "LM-2009",
        "jurisdiction": "India",
        "title": "The Legal Metrology Act, 2009",
        "body": "Primary Indian statute governing weights and measures used in trade. Section 24 makes verification and stamping of every weight or measure used for commercial transactions mandatory before first use and thereafter at prescribed intervals.",
        "refs": ["Section 24 — Verification and stamping", "Section 33 — Penalty for use of non-standard weight or measure"],
    },
    {
        "id": "LM-GR-2011",
        "jurisdiction": "India",
        "title": "Legal Metrology (General) Rules, 2011 — Rule 27",
        "body": "Re-verification: 24 months for weights, capacity measures, length measures, tapes, beam scales and counter machines; 60 months for storage tanks; 12 months for every other weight or measure including tank lorries, electronic weighing instruments, weighbridges and fuel dispensers.",
        "refs": ["Rule 27 — Periodical verification"],
    },
    {
        "id": "LM-MODEL-2011",
        "jurisdiction": "India",
        "title": "Legal Metrology (Approval of Models) Rules, 2011",
        "body": "Every new model intended for trade must obtain model approval before manufacture, import or sale. The approval number must appear on the nameplate.",
        "refs": ["Model approval number format IND/09/YYYY/NNN"],
    },
    {
        "id": "LM-STAMP",
        "jurisdiction": "India",
        "title": "Verification stamp and seal",
        "body": "Stamp shows officer identity, calendar year and quarter (A Jan–Mar, B Apr–Jun, C Jul–Sep, D Oct–Dec) plus a tamper-evident lead or wire seal. Broken seal is presumed tampering.",
        "refs": ["Stamp = LMO ID + Year + Quarter"],
    },
    {
        "id": "OIML-R76",
        "jurisdiction": "International",
        "title": "OIML R 76 — Non-automatic weighing instruments (NAWI)",
        "body": "Accuracy classes I, II, III and IIII. MPE on initial verification: ±0.5e, ±1.0e, ±1.5e in class-specific load bands. In-service MPE is twice the verification MPE.",
        "refs": ["Class III — commercial / industrial (n ≤ 10 000)"],
    },
    {
        "id": "OIML-R60",
        "jurisdiction": "International",
        "title": "OIML R 60 — Load cells",
        "body": "A C3 cell (nLC = 3 000) cannot legally support a Class III instrument claiming n = 6 000. Third-party substitution of a cheaper cell after model approval fails Indian stamping and OIML conformity.",
        "refs": ["nLC ≥ n of the complete instrument"],
    },
    {
        "id": "OIML-R117",
        "jurisdiction": "International",
        "title": "OIML R 117 — Dynamic measuring systems for liquids other than water",
        "body": "Fuel dispensers and flow meters. Class 0.5 is typical for petrol/diesel retail. Broken meter seals or aftermarket pulser boards are third-party non-compliant parts.",
        "refs": ["Class 0.3 / 0.5 / 1.0"],
    },
    {
        "id": "OIML-R111",
        "jurisdiction": "International",
        "title": "OIML R 111 — Weights",
        "body": "Maximum permissible errors for standard weights used to verify instruments. Working standards carried by an LMO are typically M1 or F2.",
        "refs": ["Working standard hierarchy"],
    },
    {
        "id": "GATC",
        "jurisdiction": "India",
        "title": "Government Approved Test Centres (GATC) Rules, 2013",
        "body": "Certain categories may be verified at GATCs in addition to departmental laboratories.",
        "refs": ["GATC certificate search"],
    },
]


def mpe_for(cls: str, load_e: float, in_service: bool = False) -> float:
    cls = (cls or "III").upper().replace("CLASS ", "")
    bands = OIML_R76_MPE_BANDS.get(cls, OIML_R76_MPE_BANDS["III"])
    mpe = bands[-1][2]
    for lo, hi, val in bands:
        if lo <= load_e < hi:
            mpe = val
            break
    return mpe * (2 if in_service else 1)


def compliance_engine(inst: dict, indicated_error_e: float | None = None, load_kg: float | None = None) -> dict:
    issues, passed = [], []
    cls = (inst.get("accuracy_class") or "III").upper()
    max_kg = float(inst.get("max_kg") or 0)
    e = float(inst.get("e_value") or 0) or 0.001
    n = int(round(max_kg / e)) if e and max_kg else 0
    itype = inst.get("type") or "electronic_weighing"

    if inst.get("model_approval"):
        passed.append("Model approval number present (Legal Metrology Approval of Models Rules, 2011).")
    else:
        issues.append("No model approval number — instrument cannot be first-verified for trade use.")

    oem = (inst.get("oem_status") or "unknown").lower()
    if oem == "genuine":
        passed.append("Registry match: genuine OEM / approved model.")
    elif oem == "third_party":
        issues.append("Third-party or unbranded parts detected — not the approved model configuration.")

    if cls in OIML_R76_N_LIMITS and n:
        lo, hi = OIML_R76_N_LIMITS[cls]
        if lo <= n <= hi:
            passed.append(f"OIML R 76 class {cls} interval count n={n:,} is within [{lo:,} … {hi:,}].")
        else:
            issues.append(f"n={n:,} is outside OIML R 76 class {cls} limits [{lo:,} … {hi:,}].")

    due = inst.get("next_due")
    if due:
        if due < today():
            issues.append(f"Verification expired on {due} (Legal Metrology Act s.24 / Rule 27).")
        else:
            months = REVERIFY_MONTHS.get(itype, 12)
            passed.append(f"Verification current until {due} (re-verification cycle {months} months).")
    else:
        issues.append("No verification stamp / certificate on record.")

    if inst.get("stamp_lmo") and inst.get("stamp_quarter") and inst.get("stamp_year"):
        passed.append(
            f"Stamp pattern valid: {inst['stamp_lmo']} · {inst['stamp_year']}-{inst['stamp_quarter']} "
            "(LMO ID + year + quarter A/B/C/D)."
        )

    status = inst.get("status")
    if status == "rejected":
        issues.append("Previous inspection rejected this instrument.")
    if status == "sealed_tampered":
        issues.append("Seal recorded as broken — presumed tampering until re-verified.")

    mpe_note = None
    if load_kg is not None and indicated_error_e is not None and e:
        load_e = load_kg / e
        mpe = mpe_for(cls, load_e, in_service=False)
        mpe_note = {
            "load_kg": load_kg,
            "load_e": round(load_e, 2),
            "error_e": indicated_error_e,
            "mpe_e_verification": mpe,
            "mpe_e_inservice": mpe * 2,
            "pass_verification": abs(indicated_error_e) <= mpe + 1e-9,
        }
        if mpe_note["pass_verification"]:
            passed.append(f"Observed error {indicated_error_e}e is within verification MPE ±{mpe}e at {load_kg} kg.")
        else:
            issues.append(f"Observed error {indicated_error_e}e exceeds verification MPE ±{mpe}e at {load_kg} kg.")

    if issues:
        verdict = "NON_COMPLIANT"
    else:
        verdict = "COMPLIANT"

    if due and due < today() and oem != "third_party":
        verdict = "EXPIRED"
    if oem == "third_party":
        verdict = "NON_COMPLIANT"

    score = max(0, min(100, 92 - 18 * len(issues) + 2 * len(passed)))
    oiml = "OIML R 60 load cells" if itype == "load_cell" else "OIML R 117" if itype == "fuel_dispenser" else "OIML R 76"
    return {
        "verdict": verdict,
        "score": score,
        "n": n,
        "class": cls,
        "issues": issues,
        "passed": passed,
        "mpe": mpe_note,
        "rules_applied": [
            "Legal Metrology Act, 2009 s.24",
            "Legal Metrology (General) Rules, 2011 r.27",
            "Legal Metrology (Approval of Models) Rules, 2011",
            "OIML R 76 NAWI",
            oiml,
        ],
    }
