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
from app.schemas.admin import EnquiryUpdate, NoteCreate
from app.services import audit_service, enquiry_admin_service as svc

router = APIRouter(prefix="/admin/enquiries", tags=["admin: enquiries"])
read, write = permission("enquiries"), permission("enquiries", write=True)


class Filters:
    def __init__(self, q: str | None = Query(None, max_length=100), status: str | None = Query(None, pattern="^(new|in_progress|contacted|converted|closed)$"),
                 date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"),
                 archived: str = Query("no", pattern="^(no|only|all)$"), assigned_to: uuid.UUID | None = None,
                 type: str | None = Query(None, pattern="^[a-z-]{2,30}$")) -> None:
        self.kw = dict(q=q, status=status, enquiry_type=type, date_from=day_start(date_from), date_to=day_after(date_to), archived=archived, assigned_to=assigned_to)


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
    return {**_row(r, names), "message": r.message, "extra": r.extra or {}, "consented": r.consented, "source": r.source,
            "notes": [{"id": str(n.id), "author": n.author_name, "body": n.body, "created_at": n.created_at.isoformat()} for n in notes]}


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
    db.delete(r)
    db.commit()
    return Response(status_code=204)
