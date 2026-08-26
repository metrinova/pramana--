"""Paths and runtime config. DevOps can override with environment variables."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
BACKEND = ROOT / "backend"
DATA_DIR = BACKEND / "data"
UPLOADS = BACKEND / "uploads"
IMG = FRONTEND / "img"
DB_PATH = Path(os.environ.get("PRAMANA_DB", DATA_DIR / "pramana.db"))

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS.mkdir(parents=True, exist_ok=True)


class Config:
    SECRET_KEY = os.environ.get("PRAMANA_SECRET", "pramana-sih26036-demo-key")
    MAX_CONTENT_LENGTH = 12 * 1024 * 1024
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("PRAMANA_SECURE_COOKIE", "0") == "1"
    JSON_SORT_KEYS = False
