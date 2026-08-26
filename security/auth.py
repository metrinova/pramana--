"""Authentication and role-based access. Two desks: user vs officer."""
from __future__ import annotations

from functools import wraps

from flask import g, jsonify, session
from werkzeug.security import check_password_hash

from backend.db import query, row_to_dict


def login_required(role=None):
    def deco(fn):
        @wraps(fn)
        def wrap(*args, **kwargs):
            uid = session.get("uid")
            if not uid:
                return jsonify({"error": "Authentication required"}), 401
            user = query("SELECT * FROM users WHERE id=?", (uid,), one=True)
            if not user:
                session.clear()
                return jsonify({"error": "Session expired"}), 401
            if role and user["role"] != role and not (
                isinstance(role, (list, tuple)) and user["role"] in role
            ):
                return jsonify({"error": "Not authorised for this desk"}), 403
            g.user = row_to_dict(user)
            g.user.pop("password_hash", None)
            return fn(*args, **kwargs)

        return wrap

    return deco


def authenticate(email: str, password: str, desk: str | None):
    """Return (user_row, error, http_status). Desk must match role when set."""
    user = query("SELECT * FROM users WHERE email=?", (email,), one=True)
    if not user or not check_password_hash(user["password_hash"], password):
        return None, "Incorrect email or password", 401
    if desk and user["role"] != desk:
        return None, f"This desk is for {desk}s. Use the other login window.", 403
    return user, None, 200


def open_session(user) -> dict:
    session["uid"] = user["id"]
    session["role"] = user["role"]
    u = row_to_dict(user)
    u.pop("password_hash", None)
    return u


def close_session():
    session.clear()
