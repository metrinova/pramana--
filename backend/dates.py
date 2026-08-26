"""Date helpers used by verification cycles."""
from __future__ import annotations

from datetime import datetime


def now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def add_months(iso_date: str, months: int) -> str:
    dt = datetime.strptime(iso_date[:10], "%Y-%m-%d")
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(
        dt.day,
        [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1],
    )
    return datetime(year, month, day).strftime("%Y-%m-%d")


def current_quarter(dt: datetime | None = None) -> str:
    dt = dt or datetime.utcnow()
    return "ABCD"[(dt.month - 1) // 3]
