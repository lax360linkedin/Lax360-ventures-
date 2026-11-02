from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import clear_session_cookie, csrf_session, current_session, set_session_cookie
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models import AuthSession
from app.schemas.auth import LoginRequest, RegisterRequest, SessionOut
from app.schemas.user import UserOut
from app.core.permissions import is_staff
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _session_out(session: AuthSession) -> SessionOut:
    return SessionOut(user=UserOut.model_validate(session.user), csrf_token=session.csrf_token)


@router.post("/login", response_model=SessionOut, dependencies=[Depends(rate_limit("login", "login_rate_limit_max", "login_rate_limit_window_seconds"))])
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Public website login (customers). Company administrators sign in through /api/admin/auth/login instead."""
    user = auth_service.authenticate(db, body.email, body.password)
    if user is None:
        db.rollback()
        raise ApiError(401, "invalid_credentials", "Incorrect email or password.")
    if is_staff(user):  # correct password, but staff accounts never get a public-website session
        db.rollback()
        raise ApiError(403, "use_admin_login", "This is a company administrator account. Please sign in through the Company Admin login.")
    token, session = auth_service.create_session(db, user, settings)
    db.commit()
    set_session_cookie(response, token, settings)
    return _session_out(session)


@router.post("/register", response_model=SessionOut, status_code=201, dependencies=[Depends(rate_limit("register", "register_rate_limit_max", "register_rate_limit_window_seconds"))])
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Public sign-up: always creates a customer (role `user`) and signs them in to the public website. Never an administrator."""
    user = auth_service.register_public_user(db, settings, full_name=body.full_name, email=body.email, password=body.password)
    user.last_login_at = auth_service.utcnow()
    token, session = auth_service.create_session(db, user, settings)
    db.commit()
    set_session_cookie(response, token, settings)
    return _session_out(session)


@router.get("/me", response_model=SessionOut)
def me(session: AuthSession = Depends(current_session)):
    """Who am I? The frontend calls this on load; it also returns the CSRF token for later requests."""
    return _session_out(session)


@router.post("/logout", status_code=204)
def logout(response: Response, session: AuthSession = Depends(csrf_session), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    auth_service.revoke_session(db, session)
    db.commit()
    clear_session_cookie(response, settings)
    response.status_code = 204
    return response
