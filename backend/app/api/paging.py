from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from fastapi import Query


def day_start(d: date | None) -> datetime | None:
    return datetime.combine(d, time.min, timezone.utc) if d else None


def day_after(d: date | None) -> datetime | None:
    """Exclusive upper bound so a `to` date includes that whole day."""
    return datetime.combine(d + timedelta(days=1), time.min, timezone.utc) if d else None


class Paging:
    def __init__(self, page: int = Query(1, ge=1, le=100000), page_size: int = Query(25, ge=1, le=100)) -> None:
        self.page = page
        self.page_size = page_size

    def envelope(self, items: list, total: int) -> dict:
        return {"items": items, "total": total, "page": self.page, "page_size": self.page_size, "pages": max(1, -(-total // self.page_size))}
