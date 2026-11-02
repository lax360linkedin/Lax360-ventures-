"""Audit trail. Rows are append-only (enforced by a database trigger). Never put passwords, tokens, keys or customer
message bodies into `detail`: only short, non-sensitive facts such as which fields changed."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, User

_BLOCKED = ("password", "token", "secret", "api_key", "apikey", "private_key", "hash", "authorization", "cookie")


def _clean(detail: dict | None) -> dict | None:
    if not detail:
        return None
    out = {}
    for k, v in detail.items():
        if any(b in str(k).lower() for b in _BLOCKED):
            continue
        if isinstance(v, (list, tuple)):
            v = [str(x)[:60] for x in v][:20]
        elif isinstance(v, (str, int, float, bool)) or v is None:
            v = v[:200] if isinstance(v, str) else v
        else:
            v = str(v)[:200]
        out[str(k)[:40]] = v
    return out or None


def record(db: Session, user: User | None, action: str, *, resource_type: str | None = None, resource_id=None,
           status: str = "success", detail: dict | None = None, email: str | None = None) -> None:
    """Add an audit row to the caller's transaction (committed together with the action itself)."""
    db.add(AuditLog(
        admin_id=user.id if user else None, admin_email=(user.email if user else email) or "unknown",
        action=action[:60], resource_type=resource_type, resource_id=str(resource_id)[:64] if resource_id else None,
        status=status, detail=_clean(detail),
    ))


def record_now(db: Session, user: User | None, action: str, **kwargs) -> None:
    """Record and commit immediately (logins, failures: things that must be kept even if nothing else is saved)."""
    record(db, user, action, **kwargs)
    db.commit()


def list_logs(db: Session, *, admin_id: uuid.UUID | None, action: str | None, status: str | None, date_from: datetime | None,
              date_to: datetime | None, page: int, page_size: int) -> tuple[list[AuditLog], int]:
    q = select(AuditLog)
    if admin_id:
        q = q.where(AuditLog.admin_id == admin_id)
    if action:
        q = q.where(AuditLog.action == action)
    if status:
        q = q.where(AuditLog.status == status)
    if date_from:
        q = q.where(AuditLog.created_at >= date_from)
    if date_to:
        q = q.where(AuditLog.created_at < date_to)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.order_by(AuditLog.created_at.desc()).limit(page_size).offset((page - 1) * page_size)).all()
    return list(rows), total
