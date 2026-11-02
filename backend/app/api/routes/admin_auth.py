"""Company-admin authentication. A separate door from the public website login: its own endpoints, its own cookie (sent only to
/api/admin/*), its own session realm, and only staff accounts (admin / super admin) can get in. Public sign-up can never reach this."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import admin_csrf_session, admin_session, clear_session_cookie, set_session_cookie
from app.api.routes.admin import identity
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.permissions import is_staff
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models import AuthSession
from app.schemas.auth import LoginRequest
from app.services import audit_service, auth_service

router = APIRouter(prefix="/admin/auth", tags=["admin: authentication"])


def _out(session: AuthSession) -> dict:
    return {**identity(session.user), "csrf_token": session.csrf_token}


@router.post("/login", dependencies=[Depends(rate_limit("admin_login", "login_rate_limit_max", "login_rate_limit_window_seconds"))])
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    user = auth_service.authenticate(db, body.email, body.password)
    if user is None or not is_staff(user):
        db.rollback()
        if user is None:
            if not settings.is_production and auth_service.admin_setup_pending(db, settings, body.email):
                # Developer-facing: tells the owner exactly what to do. In production the answer stays the generic 401 below.
                raise ApiError(503, "admin_not_configured", "The administrator account has not been created yet: ADMIN_PASSWORD is empty or shorter than the minimum "
                               f"({settings.min_password_length} characters). Set a password in backend/.env and restart the server, then sign in.")
            known = auth_service.find_by_identifier(db, body.email)
            if known is not None and is_staff(known):  # only attempts against real admin accounts are logged
                audit_service.record_now(db, known, "auth.login", resource_type="session", status="failure")
        # A customer with a correct password gets exactly the same answer as a wrong password: the admin door does not confirm accounts.
        raise ApiError(401, "invalid_credentials", "Incorrect email/username or password.")
    token, session = auth_service.create_session(db, user, settings, realm="admin")
    audit_service.record(db, user, "auth.login", resource_type="session")
    db.commit()
    set_session_cookie(response, token, settings, realm="admin")
    return _out(session)


@router.get("/session")
def current(session: AuthSession = Depends(admin_session)) -> dict:
    """Who is signed in to the admin system (used when the admin app loads). Includes the CSRF token for later changes."""
    return _out(session)


@router.post("/logout", status_code=204)
def logout(response: Response, session: AuthSession = Depends(admin_csrf_session), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    auth_service.revoke_session(db, session)
    audit_service.record(db, session.user, "auth.logout", resource_type="session")
    db.commit()
    clear_session_cookie(response, settings, realm="admin")
    response.status_code = 204
    return response
