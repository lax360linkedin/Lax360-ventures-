from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import csrf_session, current_user
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import AuthSession, User
from app.schemas.auth import ProfileFields
from app.schemas.user import PasswordChange, ProfileOut, ProfileUpdate, UserOut
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


@router.get("/me/profile", response_model=ProfileOut)
def get_my_profile(user: User = Depends(current_user)):
    """The signed-in customer's own registration details (empty for accounts created before registration collected them). Nobody else's are ever returned here."""
    return user.profile or ProfileOut()


@router.put("/me/profile", response_model=ProfileOut)
def save_my_profile(body: ProfileFields, session: AuthSession = Depends(csrf_session), db: Session = Depends(get_db)):
    """Complete or change the registration details (the same rules as at sign-up)."""
    profile = auth_service.apply_profile(db, session.user, body.model_dump())
    db.commit()
    db.refresh(profile)
    return profile
