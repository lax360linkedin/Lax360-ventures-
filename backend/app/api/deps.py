from __future__ import annotations

from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.permissions import has_permission, is_staff
from app.core.security import safe_equal
from app.db.session import get_db
from app.models import AuthSession, User
from app.services import auth_service
from app.services.ai_service import AIService, build_ai_service

CSRF_HEADER = "x-csrf-token"


def get_ai_service(settings: Settings = Depends(get_settings)) -> AIService:
    return build_ai_service(settings)


def _cookie(settings: Settings, realm: str) -> tuple[str, str, int]:
    """(cookie name, path, lifetime). The admin cookie is only ever sent to /api/admin/*, so a public-site request never carries it."""
    if realm == "admin":
        return settings.admin_session_cookie_name, "/api/admin", settings.admin_session_ttl_minutes * 60
    return settings.session_cookie_name, "/", settings.session_ttl_minutes * 60


def set_session_cookie(response: Response, token: str, settings: Settings, realm: str = "public") -> None:
    name, path, max_age = _cookie(settings, realm)
    response.set_cookie(name, token, max_age=max_age, httponly=True, secure=settings.cookie_secure_on, samesite=settings.cookie_samesite,
                        domain=settings.cookie_domain, path=path)


def clear_session_cookie(response: Response, settings: Settings, realm: str = "public") -> None:
    name, path, _ = _cookie(settings, realm)
    response.delete_cookie(name, path=path, domain=settings.cookie_domain, secure=settings.cookie_secure_on, httponly=True, samesite=settings.cookie_samesite)


def _token_for(request: Request, settings: Settings, realm: str) -> str | None:
    """The session token of this realm. Company-admin endpoints also accept it as `Authorization: Bearer <token>`, for browsers that refuse to keep
    the cross-site session cookie. It is the same opaque, server-side, revocable, expiring session token (not a signed JWT), and it only ever
    works in the admin realm: the public website ignores the header, and a customer's token is refused by the admin system."""
    if realm == "admin":
        scheme, _, value = request.headers.get("authorization", "").partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            return value.strip()
    return request.cookies.get(_cookie(settings, realm)[0])


def _session_for(request: Request, db: Session, settings: Settings, realm: str) -> auth_service.Resolved:
    return auth_service.resolve_session(db, _token_for(request, settings, realm), settings, realm)


def _require(resolved: auth_service.Resolved) -> AuthSession:
    if resolved.session is None:
        if resolved.reason == "expired":
            raise ApiError(401, "session_expired", "Your session has expired. Please log in again.")
        raise ApiError(401, "not_authenticated", "Please log in to continue.")
    return resolved.session


def _check_csrf(request: Request, session: AuthSession) -> AuthSession:
    header = request.headers.get(CSRF_HEADER, "")
    if not header or not safe_equal(header, session.csrf_token):
        raise ApiError(403, "csrf_failed", "Security check failed. Please refresh the page and try again.")
    return session


# ---- public website realm (customers) -----------------------------------------------------------
def optional_session(request: Request, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> AuthSession | None:
    return _session_for(request, db, settings, "public").session


def current_session(request: Request, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> AuthSession:
    return _require(_session_for(request, db, settings, "public"))


def current_user(session: AuthSession = Depends(current_session)) -> User:
    return session.user


def optional_user(session: AuthSession | None = Depends(optional_session)) -> User | None:
    return session.user if session else None


def csrf_session(request: Request, session: AuthSession = Depends(current_session)) -> AuthSession:
    """Authenticated + CSRF-checked: for every state-changing request made with the session cookie."""
    return _check_csrf(request, session)


def csrf_user(session: AuthSession = Depends(csrf_session)) -> User:
    return session.user


# ---- company-admin realm (staff only; a different cookie, a different session table realm) --------
def admin_session(request: Request, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> AuthSession:
    return _require(_session_for(request, db, settings, "admin"))


def admin_csrf_session(request: Request, session: AuthSession = Depends(admin_session)) -> AuthSession:
    return _check_csrf(request, session)


def _staff_only(user: User) -> User:
    if not is_staff(user):
        raise ApiError(403, "forbidden", "You do not have access to this resource.")
    return user


def staff_user(session: AuthSession = Depends(admin_session)) -> User:
    """Any signed-in admin or super admin (reads). Only an admin-realm session counts."""
    return _staff_only(session.user)


def staff_user_csrf(session: AuthSession = Depends(admin_csrf_session)) -> User:
    """Any admin or super admin, with the CSRF check (changes)."""
    return _staff_only(session.user)


def permission(module: str, *, write: bool = False):
    """Dependency factory: the caller must be staff AND hold `module` (super admins hold every module). Checked on the server for
    every request; `write=True` adds the CSRF check for state-changing calls."""

    def dependency(user: User = Depends(staff_user_csrf if write else staff_user)) -> User:
        if not has_permission(user, module):
            raise ApiError(403, "forbidden", "You do not have permission for this action.")
        return user

    return dependency


def super_admin(*, write: bool = False):
    def dependency(user: User = Depends(staff_user_csrf if write else staff_user)) -> User:
        if user.role != "super_admin":
            raise ApiError(403, "forbidden", "Only a super admin can do this.")
        return user

    return dependency
