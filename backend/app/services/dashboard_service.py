"""Dashboard numbers, all computed from the database at request time (nothing hard-coded)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import cast, Date, func, select
from sqlalchemy.orm import Session

from app.core.permissions import has_permission
from app.models import AiUsage, AuditLog, ChatSession, ContactEnquiry, DemoRequest, User
from app.models.contact_enquiry import ENQUIRY_STATUSES
from app.models.demo_request import DEMO_STATUSES


def _bounds(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    return datetime.combine(date_from, time.min, timezone.utc), datetime.combine(date_to + timedelta(days=1), time.min, timezone.utc)


def _daily(db: Session, col, start: datetime, end: datetime, *extra) -> dict[date, int]:
    rows = db.execute(select(cast(col, Date), func.count()).where(col >= start, col < end, *extra).group_by(cast(col, Date))).all()
    return {d: n for d, n in rows}


def _by_status(db: Session, model, statuses, *where) -> dict[str, int]:
    found = dict(db.execute(select(model.status, func.count()).where(*where).group_by(model.status)).all())
    return {s: found.get(s, 0) for s in statuses}


def build(db: Session, user: User, date_from: date, date_to: date) -> dict:
    start, end = _bounds(date_from, date_to)
    days = [date_from + timedelta(days=i) for i in range((date_to - date_from).days + 1)]
    out: dict = {"range": {"from": date_from.isoformat(), "to": date_to.isoformat()}, "days": [d.isoformat() for d in days]}

    if has_permission(user, "enquiries"):
        active = ContactEnquiry.archived_at.is_(None)
        by_status = _by_status(db, ContactEnquiry, ENQUIRY_STATUSES, active)
        series = _daily(db, ContactEnquiry.created_at, start, end)
        recent = db.scalars(select(ContactEnquiry).where(active).order_by(ContactEnquiry.created_at.desc()).limit(6)).all()
        out["enquiries"] = {
            "total": db.scalar(select(func.count()).select_from(ContactEnquiry)) or 0,
            "archived": db.scalar(select(func.count()).select_from(ContactEnquiry).where(ContactEnquiry.archived_at.is_not(None))) or 0,
            "new": by_status["new"], "open": by_status["new"] + by_status["in_progress"],
            "in_range": sum(series.values()), "by_status": by_status, "series": [series.get(d, 0) for d in days],
            "recent": [{"id": str(r.id), "name": r.name, "subject": r.subject, "status": r.status, "created_at": r.created_at.isoformat()} for r in recent],
        }
    if has_permission(user, "demo_requests"):
        series = _daily(db, DemoRequest.created_at, start, end)
        out["demos"] = {
            "total": db.scalar(select(func.count()).select_from(DemoRequest)) or 0,
            "pending": db.scalar(select(func.count()).select_from(DemoRequest).where(DemoRequest.status == "pending")) or 0,
            "in_range": sum(series.values()), "by_status": _by_status(db, DemoRequest, DEMO_STATUSES), "series": [series.get(d, 0) for d in days],
        }
    out["customers"] = {"total": db.scalar(select(func.count()).select_from(User).where(User.role == "user")) or 0}
    if has_permission(user, "chatbot"):
        series = _daily(db, ChatSession.created_at, start, end)
        usage = db.execute(select(AiUsage.status, func.count()).where(AiUsage.created_at >= start, AiUsage.created_at < end).group_by(AiUsage.status)).all()
        total = sum(n for _, n in usage)
        ok = sum(n for s, n in usage if s == "ok")
        out["chatbot"] = {
            "conversations_total": db.scalar(select(func.count()).select_from(ChatSession)) or 0,
            "conversations_in_range": sum(series.values()), "series": [series.get(d, 0) for d in days],
            "ai_requests_in_range": total, "ai_errors_in_range": total - ok,
        }
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(8)
    if user.role != "super_admin":
        q = q.where(AuditLog.admin_id == user.id)  # admins only see their own activity
    out["recent_activity"] = [
        {"id": str(a.id), "admin": a.admin_email, "action": a.action, "resource": a.resource_type, "status": a.status, "created_at": a.created_at.isoformat()}
        for a in db.scalars(q)
    ]
    return out
