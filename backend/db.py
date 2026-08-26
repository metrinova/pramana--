"""SQLite access layer."""
from __future__ import annotations

import sqlite3

from flask import g

from backend.config import DB_PATH


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        con = sqlite3.connect(DB_PATH)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA foreign_keys = ON")
        g.db = con
    return g.db


def close_db(_exc=None):
    con = g.pop("db", None)
    if con is not None:
        con.close()


def query(sql: str, args=(), one=False):
    cur = get_db().execute(sql, args)
    rows = cur.fetchall()
    cur.close()
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql: str, args=()):
    cur = get_db().execute(sql, args)
    get_db().commit()
    return cur.lastrowid


def row_to_dict(row) -> dict:
    if row is None:
        return {}
    return {k: row[k] for k in row.keys()}


def rows_to_dicts(rows) -> list:
    return [row_to_dict(r) for r in rows]


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT, email TEXT UNIQUE, password_hash TEXT,
    role TEXT, org TEXT, phone TEXT, license_no TEXT,
    district TEXT, state TEXT, lmo_code TEXT, zone TEXT, title TEXT
);
CREATE TABLE IF NOT EXISTS instruments (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER,
    serial TEXT UNIQUE,
    name TEXT, type TEXT, category TEXT,
    manufacturer TEXT, model TEXT, model_approval TEXT, oiml_cert TEXT,
    accuracy_class TEXT, max_kg REAL, e_value REAL, d_value REAL,
    year_of_make INTEGER, premises TEXT, district TEXT, state TEXT,
    lat REAL, lng REAL, status TEXT, oem_status TEXT,
    stamp_lmo TEXT, stamp_year INTEGER, stamp_quarter TEXT,
    last_verified TEXT, next_due TEXT, photo TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY,
    public_id TEXT UNIQUE, instrument_id INTEGER, applicant_id INTEGER,
    kind TEXT, status TEXT, created_at TEXT, assigned_officer INTEGER, remarks TEXT
);
CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY,
    application_id INTEGER, instrument_id INTEGER, officer_id INTEGER,
    ts TEXT, lat REAL, lng REAL, seal_intact INTEGER, stamp_ok INTEGER,
    mpe_json TEXT, verdict TEXT, photos TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY,
    cert_no TEXT UNIQUE, instrument_id INTEGER, officer_id INTEGER,
    issued_on TEXT, valid_until TEXT, qr_token TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY,
    user_id INTEGER, instrument_id INTEGER, ts TEXT,
    photo TEXT, verdict TEXT, score REAL, report_json TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY,
    ts TEXT, actor_id INTEGER, action TEXT, entity TEXT, entity_id TEXT,
    payload TEXT, prev_hash TEXT, chain_hash TEXT
);
CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY,
    ts TEXT, name TEXT, phone TEXT, premises TEXT, serial TEXT, note TEXT, status TEXT
);
"""


def init_schema():
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)
    con.commit()
    con.close()
