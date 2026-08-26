"""HTTP security headers. Do not set X-Frame-Options DENY — the SIH live preview is iframed."""
from __future__ import annotations

from flask import Flask


def apply_security_headers(app: Flask) -> None:
    @app.after_request
    def _headers(resp):
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resp.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=(self)"
        resp.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        # Preview hosts need framing; avoid DENY / CSP frame-ancestors 'none'
        return resp
