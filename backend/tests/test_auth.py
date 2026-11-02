from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from app.models import AuthSession, User
from tests.conftest import PASSWORD, login, make_user


def test_valid_login_sets_httponly_cookie_and_returns_profile(client, db):
    make_user(db)
    r = client.post("/api/auth/login", json={"email": "ADA@example.com", "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["email"] == "ada@example.com" and body["user"]["role"] == "user"
    assert "password" not in r.text and "hash" not in r.text and body["csrf_token"]
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie and "lax360_session=" in cookie


def test_password_is_stored_hashed_not_plain(db):
    user = make_user(db)
    assert user.password_hash.startswith("$argon2") and PASSWORD not in user.password_hash


def test_invalid_password_and_unknown_user_get_the_same_error(client, db):
    make_user(db)
    wrong = client.post("/api/auth/login", json={"email": "ada@example.com", "password": "nope-nope-nope"})
    unknown = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    assert wrong.json()["error"]["code"] == "invalid_credentials"
    assert "lax360_session" not in wrong.headers.get("set-cookie", "")


def test_disabled_account_cannot_log_in(client, db):
    make_user(db, active=False)
    r = client.post("/api/auth/login", json={"email": "ada@example.com", "password": PASSWORD})
    assert r.status_code == 401


def test_login_validation_errors(client):
    r = client.post("/api/auth/login", json={"email": "", "password": ""})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error" and {"email", "password"} <= set(r.json()["error"]["fields"])


def test_login_is_rate_limited(client, db):
    make_user(db)
    codes = [client.post("/api/auth/login", json={"email": "ada@example.com", "password": "bad-bad-bad-bad"}).status_code for _ in range(6)]
    assert codes[:5] == [401] * 5 and codes[5] == 429


def test_me_requires_authentication(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "not_authenticated"
    assert client.get("/api/users/me").status_code == 401


def test_me_returns_profile_when_logged_in(client, db):
    make_user(db)
    login(client)
    r = client.get("/api/users/me")
    assert r.status_code == 200 and r.json()["full_name"] == "Ada Lovelace"
    assert "password_hash" not in r.text


def test_logout_revokes_the_session(client, db):
    make_user(db)
    csrf = login(client)
    assert client.post("/api/auth/logout", headers=csrf).status_code == 204
    r = client.get("/api/auth/me")
    assert r.status_code == 401
    assert db.scalar(select(AuthSession.revoked_at)) is not None


def test_logout_requires_csrf_header(client, db):
    make_user(db)
    login(client)
    r = client.post("/api/auth/logout")
    assert r.status_code == 403 and r.json()["error"]["code"] == "csrf_failed"
    assert client.get("/api/auth/me").status_code == 200  # still logged in


def test_expired_session_is_rejected_with_a_clear_code(client, db):
    make_user(db)
    login(client)
    db.execute(update(AuthSession).values(expires_at=datetime.now(timezone.utc) - timedelta(minutes=1)))
    db.commit()
    r = client.get("/api/auth/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "session_expired"


def test_tampered_cookie_is_rejected(client, db):
    make_user(db)
    login(client)
    client.cookies.clear()
    client.cookies.set("lax360_session", "forged-token")
    assert client.get("/api/auth/me").status_code == 401


def test_profile_update_changes_only_the_name(client, db):
    make_user(db)
    csrf = login(client)
    r = client.patch("/api/users/me", json={"full_name": "  Ada   King  "}, headers=csrf)
    assert r.status_code == 200 and r.json()["full_name"] == "Ada King"


def test_profile_update_validation_and_forbidden_fields(client, db):
    make_user(db)
    csrf = login(client)
    assert client.patch("/api/users/me", json={"full_name": "A"}, headers=csrf).status_code == 422
    # role / email / id cannot be supplied by the client
    r = client.patch("/api/users/me", json={"full_name": "Ada King", "role": "admin"}, headers=csrf)
    assert r.status_code == 422
    assert db.scalar(select(User.role)) == "user"
    assert client.patch("/api/users/me", json={"full_name": "Ada King"}).status_code == 403  # no CSRF


def test_password_change_enforces_policy_and_signs_out_other_sessions(client, app, db):
    from fastapi.testclient import TestClient

    make_user(db)
    csrf = login(client)
    other = TestClient(app, base_url="http://localhost")
    login(other)
    bad = client.post("/api/users/me/password", json={"current_password": PASSWORD, "new_password": "short"}, headers=csrf)
    assert bad.status_code == 422 and "new_password" in bad.json()["error"]["fields"]
    wrong = client.post("/api/users/me/password", json={"current_password": "wrong-wrong-wrong", "new_password": "a-much-longer-password"}, headers=csrf)
    assert wrong.status_code == 422
    ok = client.post("/api/users/me/password", json={"current_password": PASSWORD, "new_password": "a-much-longer-password"}, headers=csrf)
    assert ok.status_code == 204
    assert client.get("/api/auth/me").status_code == 200
    assert other.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/logout", headers=csrf).status_code == 204
    assert client.post("/api/auth/login", json={"email": "ada@example.com", "password": "a-much-longer-password"}).status_code == 200


def test_there_is_no_way_to_register_an_administrator(client):
    for path in ("/api/auth/signup", "/api/users", "/api/admin/auth/register", "/api/admin/users/register"):
        assert client.post(path, json={"email": "x@example.com", "password": "whatever-123"}).status_code in (404, 405)


def test_admin_endpoints_reject_anonymous_and_regular_users(client, db):
    assert client.get("/api/admin/demo-requests").status_code == 401
    make_user(db)
    login(client)
    r = client.get("/api/admin/demo-requests")  # a customer session is not an admin session: the admin system does not even see it
    assert r.status_code == 401 and r.json()["error"]["code"] == "not_authenticated"
    assert client.get("/api/admin/enquiries").status_code == 401
    assert client.get("/api/admin/ai-usage").status_code == 401


def test_cli_creates_an_admin_without_a_default_password(db, monkeypatch, env):
    from app import cli

    monkeypatch.setenv("LAX360_NEW_PASSWORD", "operator-chosen-password")
    cli.main(["create-user", "--email", "Boss@Example.com", "--name", "Boss", "--role", "admin"])
    admin = db.scalar(select(User).where(User.email == "boss@example.com"))
    assert admin.role == "admin" and admin.password_hash.startswith("$argon2")
    assert db.scalar(select(User).where(User.role == "admin", User.email != "boss@example.com")) is None
