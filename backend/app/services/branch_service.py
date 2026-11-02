from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import Branch


def list_branches(db: Session) -> list[Branch]:
    return list(db.scalars(select(Branch).where(Branch.is_active.is_(True)).order_by(Branch.sort_order, Branch.city)))


def require_branch(db: Session, branch_id: uuid.UUID | None) -> Branch | None:
    """Verify a submitted branch id against the database (never trust the client)."""
    if branch_id is None:
        return None
    branch = db.get(Branch, branch_id)
    if branch is None or not branch.is_active:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"branch_id": "Choose a valid branch."})
    return branch
