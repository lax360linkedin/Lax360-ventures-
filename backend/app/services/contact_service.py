from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import ContactEnquiry
from app.schemas.contact import ENQUIRY_TYPES, ContactCreate
from app.services.branch_service import require_branch

DUPLICATE_WINDOW = timedelta(hours=1)


def _fingerprint(data: ContactCreate) -> str:
    text = "|".join([data.email.lower(), data.enquiry_type, " ".join(data.message.lower().split())])
    return hashlib.sha256(text.encode()).hexdigest()


def create_enquiry(db: Session, data: ContactCreate) -> tuple[ContactEnquiry, bool]:
    """Store an enquiry. Returns (row, duplicate). A repeat of the same message within an hour is not stored twice."""
    require_branch(db, data.branch_id)
    fingerprint = _fingerprint(data)
    existing = db.scalar(
        select(ContactEnquiry).where(ContactEnquiry.fingerprint == fingerprint, ContactEnquiry.created_at > datetime.now(timezone.utc) - DUPLICATE_WINDOW)
    )
    if existing:
        return existing, True
    row = ContactEnquiry(
        name=data.name,
        email=data.email.lower(),
        phone=data.phone,
        company=data.company,
        enquiry_type=data.enquiry_type,
        subject=ENQUIRY_TYPES[data.enquiry_type],
        message=data.message,
        extra=data.extra or None,
        branch_id=data.branch_id,
        consented=data.consent,
        source=data.source,
        fingerprint=fingerprint,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, False


def list_all(db: Session, *, status: str | None, limit: int, offset: int) -> list[ContactEnquiry]:
    q = select(ContactEnquiry).order_by(ContactEnquiry.created_at.desc()).limit(limit).offset(offset)
    if status:
        q = q.where(ContactEnquiry.status == status)
    return list(db.scalars(q))


def update_status(db: Session, enquiry_id: uuid.UUID, status: str) -> ContactEnquiry:
    row = db.get(ContactEnquiry, enquiry_id)
    if row is None:
        raise ApiError(404, "not_found", "Enquiry not found.")
    row.status = status
    db.commit()
    db.refresh(row)
    return row
