"""Initial super admin from ADMIN_EMAIL / ADMIN_USERNAME / ADMIN_PASSWORD, and sign-in by email or username."""

import logging

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import get_settings
from app.models import User
from app.services import auth_service
from tests.conftest import PASSWORD, login, make_user

SECRET = "initial-admin-pass-123"


def configure(env, password=SECRET, email="admin@lax360.com", username="super admin"):
    env(ADMIN_EMAIL=email, ADMIN_USERNAME=username, ADMIN_PASSWORD=password)
    return get_settings()


def test_empty_password_creates_nothing_and_says_why(env, db):
    settings = configure(env, password="")
    result = auth_service.provision_initial_admin(db, settings)
    assert result.action == "password_missing" and not result.ok and "ADMIN_PASSWORD" in result.message
    assert db.scalar(select(func.count()).select_from(User)) == 0


def test_missing_email_is_a_no_op(env, db):
    env(ADMIN_EMAIL=None, ADMIN_USERNAME=None, ADMIN_PASSWORD=SECRET)
    assert auth_service.provision_initial_admin(db, get_settings()).action == "not_configured"
    assert db.scalar(select(func.count()).select_from(User)) == 0


def test_short_password_is_refused(env, db):
    result = auth_service.provision_initial_admin(db, configure(env, password="short"))
    assert result.action == "password_too_short" and db.scalar(select(func.count()).select_from(User)) == 0


def test_creates_hashed_super_admin_who_signs_in_by_email_or_username(env, db, client):
    result = auth_service.provision_initial_admin(db, configure(env))
    assert result.action == "created" and SECRET not in result.message
    user = db.scalar(select(User).where(User.email == "admin@lax360.com"))
    assert user.role == "super_admin" and user.username == "super admin" and user.is_active
    assert user.password_hash != SECRET and user.password_hash.startswith("$argon2")
    for identifier in ("admin@lax360.com", "ADMIN@lax360.com", "super admin", "  Super   Admin "):
        r = client.post("/api/admin/auth/login", json={"email": identifier, "password": SECRET})
        assert r.status_code == 200, identifier
        assert r.json()["user"]["role"] == "super_admin" and SECRET not in r.text
        assert client.get("/api/admin/me").status_code == 200
        client.post("/api/admin/auth/logout", headers={"X-CSRF-Token": r.json()["csrf_token"]})
    assert client.post("/api/admin/auth/login", json={"email": "super admin", "password": "wrong-password-1"}).status_code == 401


def test_existing_admin_password_is_never_reset_implicitly(env, db):
    auth_service.provision_initial_admin(db, configure(env))
    result = auth_service.provision_initial_admin(db, configure(env, password="a-completely-different-1"))
    assert result.action == "exists"
    db.expire_all()
    user = db.scalar(select(User).where(User.email == "admin@lax360.com"))
    assert auth_service.authenticate(db, "admin@lax360.com", SECRET) is not None
    assert auth_service.authenticate(db, "admin@lax360.com", "a-completely-different-1") is None
    assert user.role == "super_admin"


def test_explicit_reset_changes_password_and_signs_sessions_out(env, db, client):
    auth_service.provision_initial_admin(db, configure(env))
    r = client.post("/api/admin/auth/login", json={"email": "admin@lax360.com", "password": SECRET})
    assert r.status_code == 200
    result = auth_service.provision_initial_admin(db, configure(env, password="a-completely-different-1"), reset_password=True)
    assert result.action == "updated"
    assert client.get("/api/admin/me").status_code == 401
    db.expire_all()
    assert auth_service.authenticate(db, "super admin", "a-completely-different-1") is not None


def test_existing_normal_user_is_not_promoted_automatically(env, db):
    make_user(db, email="admin@lax360.com", name="Someone", role="user")
    settings = configure(env)
    result = auth_service.provision_initial_admin(db, settings)
    assert result.action == "exists_not_super" and not result.ok
    assert db.scalar(select(User.role).where(User.email == "admin@lax360.com")) == "user"
    promoted = auth_service.provision_initial_admin(db, settings, promote=True)
    assert promoted.ok and db.scalar(select(User.role).where(User.email == "admin@lax360.com")) == "super_admin"
    # promotion alone does not touch the password
    assert auth_service.authenticate(db, "admin@lax360.com", PASSWORD) is not None


def test_username_cannot_be_taken_from_another_account(env, db):
    make_user(db, email="other@example.com", name="Other")
    other = db.scalar(select(User).where(User.email == "other@example.com"))
    other.username = "super admin"
    db.commit()
    result = auth_service.provision_initial_admin(db, configure(env))
    assert result.action == "username_taken" and db.scalar(select(User.id).where(User.email == "admin@lax360.com")) is None


def test_server_start_creates_the_admin_and_empty_password_does_not(env, app, db, caplog):
    configure(env, password="")
    with caplog.at_level(logging.INFO), TestClient(app, base_url="http://localhost", raise_server_exceptions=False) as c:
        assert db.scalar(select(func.count()).select_from(User)) == 0
        # clear configuration error instead of a generic failure, with no passwordless way in
        r = c.post("/api/admin/auth/login", json={"email": "super admin", "password": "anything-at-all-1"})
        assert r.status_code == 503 and r.json()["error"]["code"] == "admin_not_configured" and "ADMIN_PASSWORD" in r.json()["error"]["message"]
        assert c.post("/api/admin/auth/login", json={"email": "admin@lax360.com", "password": ""}).status_code == 422
        assert c.post("/api/admin/auth/login", json={"email": "someone-else", "password": "anything-at-all-1"}).status_code == 401
    from app.main import create_app

    configure(env)  # settings are read when the app is created, so build a new one, as a restart would
    with TestClient(create_app(), base_url="http://localhost", raise_server_exceptions=False) as c:
        assert db.scalar(select(func.count()).select_from(User)) == 1
        assert c.post("/api/admin/auth/login", json={"email": "super admin", "password": SECRET}).status_code == 200
    assert SECRET not in caplog.text


def test_normal_users_never_get_admin_access_and_login_still_works_by_email(client, db):
    make_user(db, email="ada@example.com")
    csrf = login(client)
    assert csrf and client.get("/api/admin/me").status_code == 401


def test_login_on_an_unmigrated_database_is_a_clear_503_not_a_500(env, app, engine):
    from sqlalchemy import text

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users RENAME COLUMN username TO username_old"))
    try:
        with TestClient(app, base_url="http://localhost", raise_server_exceptions=False) as c:
            r = c.post("/api/admin/auth/login", json={"email": "someone", "password": "whatever-123"})
        assert r.status_code == 503 and r.json()["error"]["code"] == "database_not_ready" and "alembic upgrade head" in r.json()["error"]["message"]
    finally:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users RENAME COLUMN username_old TO username"))
