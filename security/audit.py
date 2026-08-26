"""Tamper-evident SHA-256 hash chain. Not a blockchain product claim."""
from __future__ import annotations

import hashlib
import json

from flask import session

from backend.dates import now_iso
from backend.db import execute, query


def audit(action: str, entity: str, entity_id: str = "", payload: dict | None = None):
    prev = query("SELECT chain_hash FROM audit_log ORDER BY id DESC LIMIT 1", one=True)
    prev_hash = prev["chain_hash"] if prev else "GENESIS"
    body = json.dumps(payload or {}, sort_keys=True, default=str)
    material = f"{prev_hash}|{now_iso()}|{action}|{entity}|{entity_id}|{body}|{session.get('uid', 0)}"
    chain = hashlib.sha256(material.encode()).hexdigest()
    execute(
        """INSERT INTO audit_log (ts, actor_id, action, entity, entity_id, payload, prev_hash, chain_hash)
           VALUES (?,?,?,?,?,?,?,?)""",
        (
            now_iso(),
            session.get("uid"),
            action,
            entity,
            str(entity_id),
            body,
            prev_hash,
            chain,
        ),
    )
    return chain
