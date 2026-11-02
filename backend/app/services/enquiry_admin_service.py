"""Admin side of customer enquiries: search, filter, status workflow, assignment, internal notes, archive, delete, CSV export."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.core.permissions import has_permission
from app.models import ContactEnquiry, EnquiryNote, User
from app.models.contact_enquiry import ENQUIRY_STATUSES
from app.utils_validation import LIKE_ESCAPE, like_pattern

SORTS = {"created_at": ContactEnquiry.created_at, "updated_at": ContactEnquiry.updated_at, "name": ContactEnquiry.name, "status": ContactEnquiry.status}
EXPORT_LIMIT = 5000


def _filtered(*, q, status, date_from, date_to, archived, assigned_to):
    stmt = select(ContactEnquiry)
    if q:
        p = like_pattern(q.strip())
        stmt = stmt.where(or_(*(col.ilike(p, escape=LIKE_ESCAPE) for col in (ContactEnquiry.name, ContactEnquiry.email, ContactEnquiry.phone, ContactEnquiry.subject, ContactEnquiry.company))))
    if status:
        stmt = stmt.where(ContactEnquiry.status == status)
    if date_from:
        stmt = stmt.where(ContactEnquiry.created_at >= date_from)
    if date_to:
        stmt = stmt.where(ContactEnquiry.created_at < date_to)
    if assigned_to:
        stmt = stmt.where(ContactEnquiry.assigned_to == assigned_to)
    if archived == "only":
        stmt = stmt.where(ContactEnquiry.archived_at.is_not(None))
    elif archived != "all":
        stmt = stmt.where(ContactEnquiry.archived_at.is_(None))
    return stmt


def search(db: Session, *, sort="created_at", order="desc", page=1, page_size=25, **filters) -> tuple[list[ContactEnquiry], int]:
    stmt = _filtered(**filters)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    col = SORTS.get(sort, ContactEnquiry.created_at)
    stmt = stmt.order_by(col.asc() if order == "asc" else col.desc(), ContactEnquiry.id)
    return list(db.scalars(stmt.limit(page_size).offset((page - 1) * page_size))), total


def get(db: Session, enquiry_id: uuid.UUID) -> ContactEnquiry:
    row = db.get(ContactEnquiry, enquiry_id)
    if row is None:
        raise ApiError(404, "not_found", "Enquiry not found.")
    return row


def notes_for(db: Session, enquiry_id: uuid.UUID) -> list[EnquiryNote]:
    return list(db.scalars(select(EnquiryNote).where(EnquiryNote.enquiry_id == enquiry_id).order_by(EnquiryNote.created_at)))


def assignee_names(db: Session, ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not ids:
        return {}
    return {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(ids)))}


def update(db: Session, row: ContactEnquiry, *, status: str | None, assigned_to: uuid.UUID | None, assign_provided: bool) -> dict:
    changes: dict = {}
    if status is not None and status != row.status:
        if status not in ENQUIRY_STATUSES:
            raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"status": "Choose a valid status."})
        changes["status"] = f"{row.status} -> {status}"
        row.status = status
    if assign_provided and assigned_to != row.assigned_to:
        if assigned_to is not None:
            target = db.get(User, assigned_to)
            if target is None or not target.is_active or not has_permission(target, "enquiries"):
                raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"assigned_to": "Choose an active administrator who can manage enquiries."})
        changes["assigned_to"] = str(assigned_to) if assigned_to else "unassigned"
        row.assigned_to = assigned_to
    return changes


def add_note(db: Session, row: ContactEnquiry, author: User, body: str) -> EnquiryNote:
    note = EnquiryNote(enquiry_id=row.id, author_id=author.id, author_name=author.full_name, body=body)
    db.add(note)
    db.flush()
    return note


def set_archived(row: ContactEnquiry, archived: bool) -> None:
    row.archived_at = datetime.now(timezone.utc) if archived else None


def _csv_safe(value) -> str:
    """Neutralise spreadsheet formula injection: cells starting with = + - @ are prefixed with an apostrophe."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


def export_csv(db: Session, *, sort="created_at", order="desc", **filters) -> tuple[str, int]:
    rows, total = search(db, sort=sort, order=order, page=1, page_size=EXPORT_LIMIT, **filters)
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Created", "Updated", "Status", "Name", "Email", "Phone", "Company", "Type", "Branch", "Message", "Archived", "Assigned to (id)"])
    for r in rows:
        w.writerow([_csv_safe(v) for v in (
            r.created_at.isoformat(), r.updated_at.isoformat(), r.status, r.name, r.email, r.phone, r.company, r.subject,
            r.branch.city if r.branch else "", " ".join((r.message or "").split()), "yes" if r.archived_at else "", r.assigned_to or "")])
    return out.getvalue(), total
