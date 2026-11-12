from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiError
from app.core.permissions import is_staff
from app.core.security import hash_password, needs_rehash, new_token, token_digest, verify_password
from app.models import AuthSession, User, UserProfile


_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_username(username: str) -> str:
    return " ".join(username.split()).lower()[:60]


def find_by_identifier(db: Session, identifier: str) -> User | None:
    """Look a person up by email, or else by username (both case-insensitive)."""
    user = db.scalar(select(User).where(User.email == normalize_email(identifier)))
    if user is None:
        user = db.scalar(select(User).where(User.username == normalize_username(identifier)))
    return user


def authenticate(db: Session, identifier: str, password: str) -> User | None:
    """Return the user for valid credentials. Unknown account, wrong password and disabled accounts all look identical."""
    user = find_by_identifier(db, identifier)
    ok = verify_password(password, user.password_hash if user else None)
    if not (user and ok and user.is_active):
        return None
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    user.last_login_at = utcnow()
    return user


def create_session(db: Session, user: User, settings: Settings, realm: str = "public") -> tuple[str, AuthSession]:
    token = new_token()
    minutes = settings.admin_session_ttl_minutes if realm == "admin" else settings.session_ttl_minutes
    row = AuthSession(
        user_id=user.id,
        token_hash=token_digest(token, settings),
        csrf_token=new_token(),
        realm=realm,
        expires_at=utcnow() + timedelta(minutes=minutes),
    )
    db.add(row)
    db.flush()
    return token, row


@dataclass
class Resolved:
    session: AuthSession | None
    reason: str | None = None  # "expired" when a token was presented but is no longer valid


def resolve_session(db: Session, token: str | None, settings: Settings, realm: str = "public") -> Resolved:
    """A session only works in the realm it was created for, and the account must belong there: the public website never sees
    staff accounts, and the admin system never accepts a customer account (whatever the cookie says)."""
    if not token:
        return Resolved(None)
    row = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_digest(token, settings)))
    if row is None:
        return Resolved(None, "expired")
    if row.realm != realm or is_staff(row.user) != (realm == "admin"):
        return Resolved(None)
    if row.revoked_at is not None or row.expires_at <= utcnow() or not row.user.is_active:
        return Resolved(None, "expired")
    return Resolved(row)


# ---- password reset: a signed, expiring, SINGLE-USE token (nothing is stored) -----------------------------------------------------------------
# token = <user id>.<expiry>.<signature>; the signature covers the user's CURRENT password hash, so the moment the password changes (by this reset or any other way) the token stops working.
def _reset_signature(settings: Settings, user: User, user_id: str, expires: int) -> str:
    import hashlib
    import hmac

    key = settings.require_auth_secret().encode()
    return hmac.new(key, f"pwreset|{user_id}|{expires}|{user.password_hash}".encode(), hashlib.sha256).hexdigest()


def make_reset_token(settings: Settings, user: User) -> str:
    expires = int((utcnow() + timedelta(minutes=settings.password_reset_ttl_minutes)).timestamp())
    return f"{user.id}.{expires}.{_reset_signature(settings, user, str(user.id), expires)}"


def user_for_reset_token(db: Session, settings: Settings, token: str) -> User | None:
    """The account a valid, unexpired, unused reset token belongs to; None for anything else (the reason is never revealed)."""
    from app.core.security import safe_equal

    try:
        user_id, expires, signature = token.split(".")
        user = db.get(User, uuid.UUID(user_id))
        if user is None or int(expires) < int(utcnow().timestamp()):
            return None
    except (ValueError, AttributeError):
        return None
    if not user.is_active or is_staff(user) or not safe_equal(signature, _reset_signature(settings, user, user_id, int(expires))):
        return None  # staff accounts are never reset from the public website
    return user


def reset_password_with_token(db: Session, settings: Settings, token: str, new_password: str) -> User:
    check_password_policy(new_password, settings)
    user = user_for_reset_token(db, settings, token)
    if user is None:
        raise ApiError(400, "invalid_reset_link", "This reset link is invalid or has expired. Please request a new one.")
    user.password_hash = hash_password(new_password)
    db.execute(update(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None)).values(revoked_at=utcnow()))  # sign out everywhere
    return user


def revoke_session(db: Session, session: AuthSession) -> None:
    session.revoked_at = utcnow()


def revoke_other_sessions(db: Session, user_id: uuid.UUID, keep: uuid.UUID) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.id != keep, AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


def check_password_policy(password: str, settings: Settings, field: str = "new_password") -> None:
    if len(password) < settings.min_password_length:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={field: f"Use at least {settings.min_password_length} characters."})


def change_password(db: Session, user: User, current: str, new: str, settings: Settings) -> None:
    if not verify_password(current, user.password_hash):
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"current_password": "That password is not correct."})
    check_password_policy(new, settings)
    user.password_hash = hash_password(new)


def create_user(db: Session, *, email: str, full_name: str, password: str, role: str, settings: Settings) -> User:
    """Used by the CLI only; there is no public registration endpoint."""
    if db.scalar(select(User).where(User.email == normalize_email(email))):
        raise ValueError("A user with that email already exists.")
    if len(password) < settings.min_password_length:
        raise ValueError(f"Password must be at least {settings.min_password_length} characters.")
    user = User(email=normalize_email(email), full_name=full_name.strip(), password_hash=hash_password(password), role=role)
    db.add(user)
    db.flush()
    return user


def reserved_identity(settings: Settings, email: str) -> bool:
    """Emails nobody may self-register: the configured initial administrator."""
    return bool(settings.admin_email) and normalize_email(email) == normalize_email(settings.admin_email)


PROFILE_KEYS = ('mobile', 'category', 'institution', 'course', 'department', 'study_year', 'company', 'job_role', 'industry', 'experience_years', 'other_details', 'purposes', 'purpose_note')


def apply_profile(db: Session, user: User, details: dict) -> UserProfile:
    """Create or replace the customer's registration details (only the known keys are ever copied: nothing from a request can reach another column)."""
    profile = user.profile or db.get(UserProfile, user.id)
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
    for key in PROFILE_KEYS:
        setattr(profile, key, details.get(key) if key != "purposes" else list(details.get("purposes") or []))
    return profile


def register_public_user(db: Session, settings: Settings, *, full_name: str, email: str, password: str, profile: dict | None = None) -> User:
    """Self-service sign-up. The role is ALWAYS `user` (a website customer): nothing in the request can choose it."""
    check_password_policy(password, settings, field="password")
    clean = normalize_email(email)
    if reserved_identity(settings, clean) or db.scalar(select(User.id).where(User.email == clean)):
        raise ApiError(409, "email_taken", "Please check the highlighted fields.", fields={"email": "An account with this email already exists. Try logging in instead."})
    user = User(email=clean, full_name=full_name.strip(), password_hash=hash_password(password), role="user", permissions=[])
    db.add(user)
    db.flush()
    if profile is not None:
        apply_profile(db, user, profile)
    return user


def purge_sessions(db: Session) -> int:
    """Delete login sessions that expired or were revoked more than a day ago (they can no longer be used anyway)."""
    cutoff = utcnow() - timedelta(days=1)
    result = db.execute(delete(AuthSession).where((AuthSession.expires_at <= cutoff) | (AuthSession.revoked_at <= cutoff)))
    db.commit()
    return result.rowcount or 0


# ---- initial Super Admin ---------------------------------------------------------------------------
@dataclass
class Provision:
    action: str
    message: str
    ok: bool = True


def admin_setup_pending(db: Session, settings: Settings, identifier: str) -> bool:
    """True when `identifier` names the configured initial admin but that account does not exist yet (ADMIN_PASSWORD empty or too short):
    used only to give the person logging in a clear configuration message (never in production)."""
    if not settings.admin_email:
        return False
    wanted = {normalize_email(settings.admin_email)}
    names = {normalize_username(settings.admin_username)} if settings.admin_username else set()
    if normalize_email(identifier) not in wanted and normalize_username(identifier) not in names:
        return False
    return db.scalar(select(User.id).where(User.email == normalize_email(settings.admin_email))) is None


def provision_initial_admin(db: Session, settings: Settings, *, reset_password: bool = False, promote: bool = False) -> Provision:
    """Create the initial Super Admin from ADMIN_EMAIL / ADMIN_USERNAME / ADMIN_PASSWORD, safely.

    - No ADMIN_EMAIL: nothing to do. Empty ADMIN_PASSWORD: NO account is created (no passwordless login, ever).
    - The password is hashed (argon2id) before it is stored; it is never logged or returned.
    - An existing account is never changed implicitly: its password stays as it is unless `reset_password` is requested
      explicitly, and an existing non-super-admin is only promoted when `promote` is requested explicitly.
    """
    if not settings.admin_email:
        return Provision("not_configured", "ADMIN_EMAIL is not set, so no initial super admin is configured.")
    email = normalize_email(settings.admin_email)
    if not _EMAIL.match(email):
        return Provision("invalid_email", "ADMIN_EMAIL is not a valid email address.", ok=False)
    username = normalize_username(settings.admin_username) if settings.admin_username else None
    if username is not None and len(username) < 3:
        return Provision("invalid_username", "ADMIN_USERNAME must be at least 3 characters.", ok=False)
    password = settings.admin_password.get_secret_value() if settings.admin_password else ""

    def check_password() -> Provision | None:
        if not password:
            return Provision("password_missing", "ADMIN_PASSWORD is empty. Set it in backend/.env (at least "
                             f"{settings.min_password_length} characters), then restart the server or run `python -m app.cli provision-admin`. No account was created.", ok=False)
        if len(password) < settings.min_password_length:
            return Provision("password_too_short", f"ADMIN_PASSWORD must be at least {settings.min_password_length} characters. No account was created or changed.", ok=False)
        return None

    def username_free(owner: uuid.UUID | None) -> bool:
        if username is None:
            return True
        other = db.scalar(select(User.id).where(User.username == username))
        return other is None or other == owner

    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        problem = check_password()
        if problem:
            return problem
        if not username_free(None):
            return Provision("username_taken", "ADMIN_USERNAME is already used by another account.", ok=False)
        name = " ".join(w.capitalize() for w in username.split()) if username else "Super Admin"
        user = User(email=email, username=username, full_name=name[:120] if len(name) >= 2 else "Super Admin",
                    password_hash=hash_password(password), role="super_admin", permissions=[])
        db.add(user)
        db.commit()
        return Provision("created", f"Created the initial super admin ({email}).")

    messages: list[str] = []
    if user.role != "super_admin":
        if not promote:
            return Provision("exists_not_super", f"An account with the configured ADMIN_EMAIL already exists but is not a super admin. It was NOT promoted automatically: "
                             "run `python -m app.cli provision-admin --promote` if you really want that.", ok=False)
        user.role, user.permissions = "super_admin", []
        messages.append("promoted to super admin")
    if reset_password:
        problem = check_password()
        if problem:
            db.rollback()
            return problem
        user.password_hash = hash_password(password)
        revoke = update(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None)).values(revoked_at=utcnow())
        db.execute(revoke)
        messages.append("password reset (existing sessions signed out)")
    if username and user.username is None and username_free(user.id):
        user.username = username
        messages.append("username set")
    if not messages:
        return Provision("exists", f"The super admin ({email}) already exists; nothing was changed (its password is untouched).")
    db.commit()
    return Provision("updated", f"Super admin ({email}): " + ", ".join(messages) + ".")
