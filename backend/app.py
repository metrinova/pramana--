"""Flask application factory."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from flask import Flask

from backend.authenticity import load_ref_hashes
from backend.config import Config, FRONTEND
from backend.db import close_db, init_schema
from backend.routes import register_routes
from backend.seed import seed
from security.headers import apply_security_headers


def create_app() -> Flask:
    app = Flask(
        __name__,
        static_folder=str(FRONTEND),
        static_url_path="/static",
    )
    app.config.from_object(Config)
    init_schema()
    seed()
    load_ref_hashes()
    app.teardown_appcontext(close_db)
    register_routes(app)
    apply_security_headers(app)
    return app


app = create_app()
