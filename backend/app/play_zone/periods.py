"""Leaderboard and challenge periods. ONE timezone policy for the whole Play Zone: `settings.app_timezone` (default Asia/Kolkata, the same zone the homepage video schedule uses).
  * a DAY runs from local midnight to the next local midnight;
  * a WEEK runs from Monday 00:00 local to the next Monday 00:00 local;
  * ALL-TIME has no bounds.
Bounds are returned as timezone-aware UTC datetimes (start inclusive, end exclusive), so the database compares plain instants and daylight-saving changes cannot shift a boundary."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

PERIODS = ("daily", "weekly", "all")


def zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def local_date(now: datetime, tz: ZoneInfo) -> date:
    return now.astimezone(tz).date()


def day_bounds(d: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    start = datetime.combine(d, time.min, tz)
    end = datetime.combine(d + timedelta(days=1), time.min, tz)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def week_start_date(d: date) -> date:
    return d - timedelta(days=d.weekday())  # Monday


def period_bounds(kind: str, now: datetime, tz: ZoneInfo) -> tuple[datetime | None, datetime | None]:
    if kind == "all":
        return None, None
    today = local_date(now, tz)
    if kind == "daily":
        return day_bounds(today, tz)
    if kind == "weekly":
        monday = week_start_date(today)
        start, _ = day_bounds(monday, tz)
        _, end = day_bounds(monday + timedelta(days=6), tz)
        return start, end
    raise ValueError(f"Unknown period {kind!r}")
