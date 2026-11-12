from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import clear_session_cookie, csrf_session, current_session, set_session_cookie
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from sqlalchemy import select

from app.models import AuthSession, User
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, SessionOut
from app.schemas.user import UserOut
from app.core.permissions import is_staff
from app.services import auth_service, email_service

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
    user = auth_service.register_public_user(db, settings, full_name=body.full_name, email=body.email, password=body.password,
                                             profile=body.model_dump(include=set(auth_service.PROFILE_KEYS)))
    user.last_login_at = auth_service.utcnow()
    token, session = auth_service.create_session(db, user, settings)
    db.commit()
    set_session_cookie(response, token, settings)
    return _session_out(session)


_RESET_LIMIT = Depends(rate_limit("reset", "reset_rate_limit_max", "reset_rate_limit_window_seconds"))
log = logging.getLogger("app.auth")


def _send_reset(settings: Settings, email: str, name: str, token: str) -> None:
    link = f"{settings.frontend_origin.rstrip('/')}/reset-password?token={token}"
    sent = email_service.send(settings, email, "Reset your LAX360 password",
                              f"Hello {name},\n\nSomeone asked to reset the password of your LAX360 Pvt Ltd account. To choose a new password, open this link (valid for {settings.password_reset_ttl_minutes} minutes, usable once):\n\n"
                              f"{link}\n\nIf you did not ask for this, ignore this message: your password has not changed.\n\nLAX360 Pvt Ltd")
    if not sent and not settings.is_production:
        log.info("Development: password reset link for %s: %s", email, link)  # never logged in production


@router.post("/forgot-password", status_code=202, dependencies=[_RESET_LIMIT])
def forgot_password(body: ForgotPasswordRequest, tasks: BackgroundTasks, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Ask for a password-reset e-mail. The answer is always the same, whether or not the address has an account (no account enumeration), and the e-mail is sent after the response."""
    user = db.scalar(select(User).where(User.email == auth_service.normalize_email(body.email)))
    if user is not None and user.is_active and not is_staff(user):
        tasks.add_task(_send_reset, settings, user.email, user.full_name, auth_service.make_reset_token(settings, user))
    return {"status": "ok", "message": "If an account exists for that address, we have sent a link to reset the password."}


@router.post("/reset-password", status_code=204, dependencies=[Depends(rate_limit("reset_use", "reset_rate_limit_max", "reset_rate_limit_window_seconds"))])
def reset_password(body: ResetPasswordRequest, response: Response, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Choose a new password with the link from the e-mail. Single use; every session of the account is signed out."""
    auth_service.reset_password_with_token(db, settings, body.token, body.new_password)
    db.commit()
    clear_session_cookie(response, settings)
    response.status_code = 204
    return response


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
