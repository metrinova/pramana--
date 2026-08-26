"""Tiny in-memory limiter for public photo-check. Replace with Redis in production."""
from __future__ import annotations

import time
from collections import defaultdict

from flask import jsonify, request

_hits: dict[str, list[float]] = defaultdict(list)
WINDOW = 60
MAX_HITS = 30


def public_limit():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "local").split(",")[0].strip()
    now = time.time()
    bucket = [t for t in _hits[ip] if now - t < WINDOW]
    if len(bucket) >= MAX_HITS:
        return jsonify({"error": "Too many photo checks from this address. Wait a minute."}), 429
    bucket.append(now)
    _hits[ip] = bucket
    return None
