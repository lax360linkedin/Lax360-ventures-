from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps import csrf_user, current_user
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models import DemoRequest, User
from app.schemas.demo_request import DemoRequestCreate, DemoRequestOut
from app.services import demo_service, sheets_service, notify_service

router = APIRouter(prefix="/demo-requests", tags=["demo requests"])


def to_out(row: DemoRequest) -> dict:
    return {**{c: getattr(row, c) for c in ("id", "name", "email", "company", "preferred_date", "interest", "branch_id", "message", "status", "created_at")},
            "branch_city": row.branch.city if row.branch else None}


@router.post("", response_model=DemoRequestOut, status_code=201,
             dependencies=[Depends(rate_limit("demo", "demo_rate_limit_max", "demo_rate_limit_window_seconds"))])
def create_demo_request(body: DemoRequestCreate, tasks: BackgroundTasks, user: User = Depends(csrf_user), db: Session = Depends(get_db)):
    """Login required (as in the website). The request is stored as `pending`; it is not a confirmed booking."""
    row = demo_service.create_request(db, user, body)
    tasks.add_task(notify_service.notify_demo, row.id)  # an e-mail to the team when ENQUIRY_NOTIFY_EMAIL and SMTP are configured
    tasks.add_task(sheets_service.sync_demo, row.id)  # a copy goes to the Google Spreadsheet after the response
    tasks.add_task(sheets_service.retry_recent)
    return to_out(row)


@router.get("/me", response_model=list[DemoRequestOut])
def my_demo_requests(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Only the signed-in user's own requests."""
    return [to_out(r) for r in demo_service.list_for_user(db, user)]
