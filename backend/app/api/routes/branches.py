from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.branch import BranchOut
from app.services.branch_service import list_branches

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("", response_model=list[BranchOut])
def get_branches(db: Session = Depends(get_db)):
    """Public: branch names and the contact details that actually exist (address/phone are null when unknown)."""
    return list_branches(db)
