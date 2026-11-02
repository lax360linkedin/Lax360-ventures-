from __future__ import annotations

import hashlib
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import DemoRequest, User
from app.schemas.demo_request import DemoRequestCreate
from app.services.branch_service import require_branch
from app.utils_validation import LIKE_ESCAPE, like_pattern

DUPLICATE_WINDOW = timedelta(hours=24)
MAX_DAYS_AHEAD = 365


def _fingerprint(user: User, data: DemoRequestCreate) -> str:
    parts = [str(user.id), data.email.lower(), str(data.preferred_date or ""), str(data.branch_id or ""), (data.interest or "").lower(), (data.message or "").lower()]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


def _validate_date(d: date | None) -> None:
    if d is None:
        return
    # One day of slack so a visitor ahead of the server's UTC date is not rejected for choosing "today".
    today = datetime.now(timezone.utc).date()
    if d < today - timedelta(days=1):
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"preferred_date": "Choose today or a future date."})
    if d > today + timedelta(days=MAX_DAYS_AHEAD):
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"preferred_date": "Choose a date within the next year."})


def create_request(db: Session, user: User, data: DemoRequestCreate) -> DemoRequest:
    _validate_date(data.preferred_date)
    require_branch(db, data.branch_id)
    fingerprint = _fingerprint(user, data)
    recent = db.scalar(
        select(DemoRequest.id).where(
            DemoRequest.fingerprint == fingerprint,
            DemoRequest.created_at > datetime.now(timezone.utc) - DUPLICATE_WINDOW,
            DemoRequest.status == "pending",
        )
    )
    if recent:
        raise ApiError(409, "duplicate_request", "You already sent this demo request. The team will be in touch.")
    row = DemoRequest(
        user_id=user.id,
        name=data.name,
        email=data.email.lower(),
        company=data.company,
        preferred_date=data.preferred_date,
        interest=data.interest,
        branch_id=data.branch_id,
        message=data.message,
        status="pending",  # never "confirmed" on submission
        fingerprint=fingerprint,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_for_user(db: Session, user: User) -> list[DemoRequest]:
    return list(db.scalars(select(DemoRequest).where(DemoRequest.user_id == user.id).order_by(DemoRequest.created_at.desc()).limit(100)))


def list_all(db: Session, *, status: str | None, limit: int, offset: int) -> list[DemoRequest]:
    q = select(DemoRequest).order_by(DemoRequest.created_at.desc()).limit(limit).offset(offset)
    if status:
        q = q.where(DemoRequest.status == status)
    return list(db.scalars(q))


def update_status(db: Session, request_id: uuid.UUID, status: str) -> DemoRequest:
    row = db.get(DemoRequest, request_id)
    if row is None:
        raise ApiError(404, "not_found", "Demo request not found.")
    row.status = status
    db.commit()
    db.refresh(row)
    return row


def search(db: Session, *, status: str | None, q: str | None, limit: int, offset: int) -> tuple[list[DemoRequest], int]:
    stmt = select(DemoRequest)
    if status:
        stmt = stmt.where(DemoRequest.status == status)
    if q:
        p = like_pattern(q.strip())
        stmt = stmt.where(or_(DemoRequest.name.ilike(p, escape=LIKE_ESCAPE), DemoRequest.email.ilike(p, escape=LIKE_ESCAPE), DemoRequest.company.ilike(p, escape=LIKE_ESCAPE)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    return list(db.scalars(stmt.order_by(DemoRequest.created_at.desc()).limit(limit).offset(offset))), total


def get_one(db: Session, request_id: uuid.UUID) -> DemoRequest:
    row = db.get(DemoRequest, request_id)
    if row is None:
        raise ApiError(404, "not_found", "Demo request not found.")
    return row
