from __future__ import annotations

import hashlib
import uuid
import hashlib as _hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app import contact_catalog
from app.core.config import Settings
from app.models import ContactEnquiry, MediaAsset
from app.services import hero_video_service, media_service
from app.schemas.contact import ENQUIRY_TYPES, ContactCreate
from app.services.branch_service import require_branch

DUPLICATE_WINDOW = timedelta(hours=1)


def _fingerprint(data: ContactCreate) -> str:
    text = "|".join([data.email.lower(), data.enquiry_type, " ".join(data.message.lower().split())])
    return hashlib.sha256(text.encode()).hexdigest()


ATTACHMENT_WINDOW = timedelta(hours=24)


async def store_attachment(request, settings: Settings, db: Session, filename: str) -> MediaAsset:
    """A project document uploaded by a visitor: PDF or image up to 5 MB, type checked from the bytes. Kept PRIVATE in the database (never served publicly);
    it only becomes part of an enquiry when the form is submitted, and only administrators with enquiry access can open it."""
    received = await hero_video_service.receive(request, settings, contact_catalog.MAX_FILE_BYTES)
    try:
        ctype, ext = media_service.sniff(received.head)
        if ctype not in contact_catalog.FILE_TYPES:
            raise ApiError(415, "unsupported_media", "Unsupported file type. Please attach a PDF or a PNG, JPEG or WebP image.")
        blob = received.tmp.read_bytes()
        asset = MediaAsset(filename=media_service.safe_filename(filename, ext), content_type=ctype, size_bytes=len(blob), is_public=False, uploaded_by=None, storage="db",
                           sha256=_hashlib.sha256(blob).hexdigest(), kind=media_service.kind_of(ctype), data=blob)
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset
    finally:
        received.tmp.unlink(missing_ok=True)


def _checked_attachments(db: Session, ids) -> list[str]:
    out = []
    for asset_id in ids:
        asset = db.get(MediaAsset, asset_id)
        fresh = asset is not None and asset.created_at > datetime.now(timezone.utc) - ATTACHMENT_WINDOW
        if asset is None or not fresh or asset.uploaded_by is not None or asset.is_public or asset.storage != "db" or asset.kind not in ("document", "image"):
            raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"attachments": "An attached file is no longer available. Please upload it again."})
        out.append(str(asset.id))
    return out


def create_enquiry(db: Session, data: ContactCreate) -> tuple[ContactEnquiry, bool]:
    """Store an enquiry. Returns (row, duplicate). A repeat of the same message within an hour is not stored twice."""
    require_branch(db, data.branch_id)
    errors = contact_catalog.validate_lead(data.extra)
    if errors:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields=errors)
    extra = dict(data.extra)
    if data.attachments:
        extra["attachments"] = ",".join(_checked_attachments(db, list(dict.fromkeys(data.attachments))))
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
        extra=extra or None,
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
