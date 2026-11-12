from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_read_db
from app.schemas.branch import BranchOut
from app.services.branch_service import list_branches

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("", response_model=list[BranchOut])
def get_branches(response: Response, db: Session = Depends(get_read_db)):
    """Public: branch names and the contact details that actually exist (address/phone are null when unknown)."""
    response.headers["Cache-Control"] = "public, max-age=30"
    return list_branches(db)
