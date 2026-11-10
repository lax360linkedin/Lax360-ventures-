"""Customer enquiries: list/search/filter, detail, status workflow, assignment, notes, archive, delete, CSV export."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.api.paging import Paging, day_after, day_start
from app.core.permissions import has_permission
from app.db.session import get_db
from app.models import ContactEnquiry, User
from app.schemas.admin import EnquiryUpdate, FollowupCreate, FollowupUpdate, NoteCreate
from app.core.errors import ApiError
from app.services import audit_service, enquiry_admin_service as svc, media_service

router = APIRouter(prefix="/admin/enquiries", tags=["admin: enquiries"])
read, write = permission("enquiries"), permission("enquiries", write=True)


class Filters:
    def __init__(self, q: str | None = Query(None, max_length=100), status: str | None = Query(None, pattern="^(new|in_progress|contacted|qualified|proposal_sent|negotiation|converted|not_interested|closed)$"),
                 date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"),
                 archived: str = Query("no", pattern="^(no|only|all)$"), assigned_to: uuid.UUID | None = None,
                 type: str | None = Query(None, pattern="^[a-z-]{2,30}$"), service: str | None = Query(None, pattern="^[a-z0-9/-]{2,80}$"), industry: str | None = Query(None, max_length=60)) -> None:
        self.kw = dict(q=q, status=status, enquiry_type=type, service=service, industry=industry, date_from=day_start(date_from), date_to=day_after(date_to), archived=archived, assigned_to=assigned_to)


def _row(r: ContactEnquiry, names: dict) -> dict:
    return {
        "id": str(r.id), "type": r.enquiry_type, "name": r.name, "email": r.email, "phone": r.phone, "company": r.company, "subject": r.subject, "status": r.status,
        "branch": r.branch.city if r.branch else None, "assigned_to": str(r.assigned_to) if r.assigned_to else None,
        "assigned_name": names.get(r.assigned_to), "archived": r.archived_at is not None,
        "created_at": r.created_at.isoformat(), "updated_at": r.updated_at.isoformat(),
    }


@router.get("")
def list_enquiries(filters: Filters = Depends(), sort: str = Query("created_at", pattern="^(created_at|updated_at|name|status)$"),
                   order: str = Query("desc", pattern="^(asc|desc)$"), paging: Paging = Depends(), _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    rows, total = svc.search(db, sort=sort, order=order, page=paging.page, page_size=paging.page_size, **filters.kw)
    names = svc.assignee_names(db, {r.assigned_to for r in rows if r.assigned_to})
    return paging.envelope([_row(r, names) for r in rows], total)


@router.get("/assignees")
def assignees(_: User = Depends(read), db: Session = Depends(get_db)) -> list[dict]:
    """Active administrators who can take an enquiry."""
    return [{"id": str(u.id), "name": u.full_name} for u in db.scalars(select(User).where(User.role.in_(("admin", "super_admin")), User.is_active.is_(True)).order_by(User.full_name)) if has_permission(u, "enquiries")]


@router.get("/export.csv")
def export(filters: Filters = Depends(), sort: str = Query("created_at"), order: str = Query("desc", pattern="^(asc|desc)$"),
           user: User = Depends(read), db: Session = Depends(get_db)) -> Response:
    text, total = svc.export_csv(db, sort=sort, order=order, **filters.kw)
    audit_service.record_now(db, user, "enquiry.export", resource_type="enquiry", detail={"rows": min(total, svc.EXPORT_LIMIT)})
    return Response(text, media_type="text/csv; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="enquiries.csv"', "X-Total-Count": str(total)})


@router.get("/{enquiry_id}")
def detail(enquiry_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    r = svc.get(db, enquiry_id)
    names = svc.assignee_names(db, {r.assigned_to} if r.assigned_to else set())
    notes = svc.notes_for(db, r.id)
    attachments = svc.attachments_for(db, r)
    extra = {k: v for k, v in (r.extra or {}).items() if k != "attachments"}
    return {**_row(r, names), "message": r.message, "extra": extra, "consented": r.consented, "source": r.source,
            "notes": [{"id": str(n.id), "author": n.author_name, "body": n.body, "created_at": n.created_at.isoformat()} for n in notes],
            "followups": [_followup(f) for f in svc.followups_for(db, r.id)],
            "attachments": [{"id": str(a.id), "filename": a.filename, "type": a.content_type, "size": a.size_bytes} for a in attachments],
            "history": svc.history_for(db, r.id)}


def _followup(f) -> dict:
    return {"id": str(f.id), "kind": f.kind, "summary": f.summary, "due_on": f.due_on.isoformat() if f.due_on else None, "done": f.done, "author": f.author_name, "created_at": f.created_at.isoformat()}


@router.patch("/{enquiry_id}")
def update(enquiry_id: uuid.UUID, body: EnquiryUpdate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    r = svc.get(db, enquiry_id)
    changes = svc.update(db, r, status=body.status, assigned_to=body.assigned_to, assign_provided="assigned_to" in body.model_fields_set)
    if changes:
        audit_service.record(db, user, "enquiry.update", resource_type="enquiry", resource_id=r.id, detail=changes)
    db.commit()
    db.refresh(r)
    return _row(r, svc.assignee_names(db, {r.assigned_to} if r.assigned_to else set()))


@router.post("/{enquiry_id}/notes", status_code=201)
def add_note(enquiry_id: uuid.UUID, body: NoteCreate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    r = svc.get(db, enquiry_id)
    n = svc.add_note(db, r, user, body.body)
    r.updated_at = n.created_at if n.created_at else r.updated_at  # a note counts as activity
    audit_service.record(db, user, "enquiry.note", resource_type="enquiry", resource_id=r.id)  # the note text itself is not copied into the log
    db.commit()
    db.refresh(n)
    return {"id": str(n.id), "author": n.author_name, "body": n.body, "created_at": n.created_at.isoformat()}


@router.post("/{enquiry_id}/followups", status_code=201)
def add_followup(enquiry_id: uuid.UUID, body: FollowupCreate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    r = svc.get(db, enquiry_id)
    f = svc.add_followup(db, r, user, kind=body.kind, summary=body.summary, due_on=body.due_on, done=body.done)
    audit_service.record(db, user, "enquiry.followup", resource_type="enquiry", resource_id=r.id, detail={"kind": body.kind, "due_on": body.due_on.isoformat() if body.due_on else None})
    db.commit()
    db.refresh(f)
    return _followup(f)


@router.patch("/{enquiry_id}/followups/{followup_id}")
def update_followup(enquiry_id: uuid.UUID, followup_id: uuid.UUID, body: FollowupUpdate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    svc.get(db, enquiry_id)
    f = svc.get_followup(db, enquiry_id, followup_id)
    for field in body.model_fields_set:
        setattr(f, field, getattr(body, field))
    audit_service.record(db, user, "enquiry.followup_update", resource_type="enquiry", resource_id=enquiry_id, detail={"done": f.done})
    db.commit()
    db.refresh(f)
    return _followup(f)


@router.delete("/{enquiry_id}/followups/{followup_id}", status_code=204)
def delete_followup(enquiry_id: uuid.UUID, followup_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> Response:
    svc.get(db, enquiry_id)
    db.delete(svc.get_followup(db, enquiry_id, followup_id))
    audit_service.record(db, user, "enquiry.followup_delete", resource_type="enquiry", resource_id=enquiry_id)
    db.commit()
    return Response(status_code=204)


@router.get("/{enquiry_id}/attachments/{asset_id}")
def download_attachment(enquiry_id: uuid.UUID, asset_id: uuid.UUID, user: User = Depends(read), db: Session = Depends(get_db)) -> Response:
    """A document the customer attached. Only for administrators with enquiry access; every opening is recorded."""
    r = svc.get(db, enquiry_id)
    if asset_id not in svc.attachment_ids(r):
        raise ApiError(404, "not_found", "File not found.")
    asset = media_service.get(db, asset_id, with_data=True)
    if asset.data is None:
        raise ApiError(404, "not_found", "The file is no longer stored.")
    audit_service.record_now(db, user, "enquiry.attachment_view", resource_type="enquiry", resource_id=r.id, detail={"file": asset.filename})
    return Response(bytes(asset.data), media_type=asset.content_type, headers={"Content-Disposition": f'attachment; filename="{asset.filename}"', "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"})


@router.post("/{enquiry_id}/archive")
def archive(enquiry_id: uuid.UUID, archived: bool = Query(True), user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    r = svc.get(db, enquiry_id)
    svc.set_archived(r, archived)
    audit_service.record(db, user, "enquiry.archive" if archived else "enquiry.unarchive", resource_type="enquiry", resource_id=r.id)
    db.commit()
    return {"id": str(r.id), "archived": archived}


@router.delete("/{enquiry_id}", status_code=204)
def delete(enquiry_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> Response:
    r = svc.get(db, enquiry_id)
    audit_service.record(db, user, "enquiry.delete", resource_type="enquiry", resource_id=r.id)  # who deleted what (no personal data kept)
    svc.delete_attachments(db, r)
    db.delete(r)
    db.commit()
    return Response(status_code=204)
