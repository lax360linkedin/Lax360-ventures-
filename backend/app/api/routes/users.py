from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import csrf_session, current_user
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import AuthSession, User
from app.schemas.user import PasswordChange, ProfileUpdate, UserOut
from app.services import auth_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: ProfileUpdate, session: AuthSession = Depends(csrf_session), db: Session = Depends(get_db)):
    session.user.full_name = body.full_name
    db.commit()
    db.refresh(session.user)
    return session.user


@router.post("/me/password", status_code=204)
def change_password(body: PasswordChange, session: AuthSession = Depends(csrf_session), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Change password; every other session of this user is signed out."""
    auth_service.change_password(db, session.user, body.current_password, body.new_password, settings)
    auth_service.revoke_other_sessions(db, session.user.id, session.id)
    db.commit()
