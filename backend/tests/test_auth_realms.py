"""Two separate doors: the public website login (customers) and the company-admin login (staff). Different endpoints, different
cookies, different session realms; nothing a browser holds for one works for the other."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.config import get_settings
from app.models import AuthSession, User
from tests.conftest import PASSWORD, make_user

PUBLIC, ADMIN = "lax360_session", "lax360_admin_session"
SIGNUP = {"full_name": "Grace Hopper", "email": "grace@example.com", "password": "a-long-enough-password"}


def new_client(app):
    return TestClient(app, base_url="http://localhost", raise_server_exceptions=False)


# ---- public registration and login ------------------------------------------------------------------
def test_a_visitor_can_register_and_is_signed_in_as_a_customer(client, db):
    r = client.post("/api/auth/register", json=SIGNUP)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user"]["role"] == "user" and body["user"]["email"] == "grace@example.com" and body["csrf_token"]
    assert "password" not in r.text and "hash" not in r.text
    row = db.scalar(select(User).where(User.email == "grace@example.com"))
    assert row.role == "user" and row.permissions == [] and row.password_hash.startswith("$argon2") and row.is_active
    assert client.get("/api/auth/me").json()["user"]["role"] == "user"
    assert "httponly" in r.headers["set-cookie"].lower() and f"{PUBLIC}=" in r.headers["set-cookie"]
    # logging out and in again works, and the customer reaches their own account data
    csrf = {"X-CSRF-Token": body["csrf_token"]}
    assert client.post("/api/auth/logout", headers=csrf).status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    again = client.post("/api/auth/login", json={"email": "GRACE@example.com", "password": SIGNUP["password"]})
    assert again.status_code == 200 and client.get("/api/users/me").json()["email"] == "grace@example.com"


@pytest.mark.parametrize("extra", [{"role": "super_admin"}, {"role": "admin"}, {"permissions": ["users"]}, {"is_active": True}, {"username": "super admin"}])
def test_registration_cannot_choose_a_role_or_privileges(client, db, extra):
    r = client.post("/api/auth/register", json={**SIGNUP, **extra})
    assert r.status_code == 422 and db.scalar(select(User.id).where(User.email == SIGNUP["email"])) is None


def test_registration_validates_and_never_overwrites_an_existing_account(client, db, env):
    assert client.post("/api/auth/register", json={**SIGNUP, "password": "short"}).status_code == 422
    assert client.post("/api/auth/register", json={**SIGNUP, "email": "not-an-email"}).status_code == 422
    assert client.post("/api/auth/register", json={**SIGNUP, "full_name": "x"}).status_code == 422
    make_user(db, email="taken@example.com", name="Original", role="admin")
    r = client.post("/api/auth/register", json={**SIGNUP, "email": "TAKEN@example.com", "password": "another-long-password"})
    assert r.status_code == 409 and "email" in r.json()["error"]["fields"]
    db.expire_all()
    original = db.scalar(select(User).where(User.email == "taken@example.com"))
    assert original.role == "admin" and original.full_name == "Original"  # untouched: no role change, no password change


def test_nobody_can_register_the_configured_administrator_email(env, app, db):
    env(ADMIN_EMAIL="admin@lax360.com", ADMIN_USERNAME="super admin", ADMIN_PASSWORD="")
    from app.main import create_app

    with TestClient(create_app(), base_url="http://localhost", raise_server_exceptions=False) as c:
        r = c.post("/api/auth/register", json={**SIGNUP, "email": "Admin@LAX360.com"})
        assert r.status_code == 409
    assert db.scalar(select(User.id).where(User.email == "admin@lax360.com")) is None


def test_registration_is_rate_limited(env, app):
    env(REGISTER_RATE_LIMIT_MAX="2")
    from app.main import create_app

    with TestClient(create_app(), base_url="http://localhost", raise_server_exceptions=False) as c:
        codes = [c.post("/api/auth/register", json={**SIGNUP, "email": f"u{i}@example.com"}).status_code for i in range(3)]
    assert codes == [201, 201, 429]


# ---- the admin door is closed to customers ------------------------------------------------------------
def test_a_customer_cannot_use_the_admin_login_or_any_admin_api(client, db):
    make_user(db, email="cust@example.com")
    wrong = client.post("/api/admin/auth/login", json={"email": "cust@example.com", "password": "wrong-wrong-wrong"})
    right = client.post("/api/admin/auth/login", json={"email": "cust@example.com", "password": PASSWORD})
    assert wrong.status_code == right.status_code == 401 and wrong.json() == right.json()  # never confirms the account exists
    assert ADMIN not in client.cookies.keys() and client.get("/api/admin/auth/session").status_code == 401
    client.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})
    for path in ("/api/admin/me", "/api/admin/dashboard", "/api/admin/hero-videos", "/api/admin/users", "/api/admin/settings", "/api/admin/auth/session"):
        assert client.get(path).status_code == 401, path
    csrf = {"X-CSRF-Token": client.get("/api/auth/me").json()["csrf_token"]}
    assert client.post("/api/admin/hero-videos?filename=x.mp4", content=b"x", headers=csrf).status_code == 401
    assert client.put("/api/admin/hero-videos/schedule", json={"slot_days": 1}, headers=csrf).status_code == 401
    assert client.post("/api/admin/users", json={"email": "e@example.com", "full_name": "Evil", "password": PASSWORD, "role": "super_admin"}, headers=csrf).status_code == 401


def test_staff_credentials_do_not_open_a_public_website_session(client, db):
    make_user(db, email="boss@example.com", role="super_admin")
    r = client.post("/api/auth/login", json={"email": "boss@example.com", "password": PASSWORD})
    assert r.status_code == 403 and r.json()["error"]["code"] == "use_admin_login" and PUBLIC not in client.cookies.keys()
    assert client.post("/api/auth/login", json={"email": "boss@example.com", "password": "wrong-wrong-wrong"}).status_code == 401  # no hint without the password


# ---- the admin door works for staff -------------------------------------------------------------------
def test_an_administrator_signs_in_through_the_admin_door_only(app, db):
    make_user(db, email="boss@example.com", name="Boss", role="super_admin")
    c = new_client(app)
    r = c.post("/api/admin/auth/login", json={"email": "BOSS@example.com", "password": PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "super_admin" and "users" in body["permissions"] and body["csrf_token"]
    set_cookie = r.headers["set-cookie"].lower()
    assert f"{ADMIN}=" in set_cookie and "httponly" in set_cookie and "path=/api/admin" in set_cookie and PUBLIC not in set_cookie
    assert c.get("/api/admin/dashboard").status_code == 200 and c.get("/api/admin/auth/session").json()["user"]["email"] == "boss@example.com"
    assert c.get("/api/auth/me").status_code == 401 and c.get("/api/users/me").status_code == 401  # the public site does not see the admin
    settings = get_settings()
    row = db.scalar(select(AuthSession).where(AuthSession.realm == "admin"))
    assert row is not None and (row.expires_at - row.created_at).total_seconds() / 60 == pytest.approx(settings.admin_session_ttl_minutes, abs=1)


def test_admin_login_by_username_and_admin_permissions_are_enforced(app, db):
    user = make_user(db, email="staff@example.com", role="admin", permissions=["enquiries"])
    user.username = "staffer"
    db.commit()
    c = new_client(app)
    assert c.post("/api/admin/auth/login", json={"email": "Staffer", "password": PASSWORD}).status_code == 200
    assert c.get("/api/admin/enquiries").status_code == 200
    assert c.get("/api/admin/hero-videos").status_code == 403  # signed in, but this admin was not given the module
    assert c.get("/api/admin/users").status_code == 403


# ---- logout, expiry and isolation ---------------------------------------------------------------------
def test_admin_logout_invalidates_the_session_for_good(app, db):
    make_user(db, email="boss@example.com", role="super_admin")
    c = new_client(app)
    r = c.post("/api/admin/auth/login", json={"email": "boss@example.com", "password": PASSWORD})
    token = c.cookies.get(ADMIN, path="/api/admin")
    csrf = {"X-CSRF-Token": r.json()["csrf_token"]}
    assert c.post("/api/admin/auth/logout", headers=csrf).status_code == 204
    assert c.get("/api/admin/dashboard").status_code == 401
    replay = new_client(app)  # an attacker replaying the stolen cookie after logout
    replay.cookies.set(ADMIN, token, domain="localhost", path="/api/admin")
    assert replay.get("/api/admin/dashboard").status_code == 401
    assert db.scalar(select(AuthSession.revoked_at).where(AuthSession.realm == "admin")) is not None
    actions = [a for (a,) in db.execute(text("select action from audit_logs order by created_at")).all()]
    assert "auth.login" in actions and "auth.logout" in actions


def test_an_expired_admin_session_is_refused(app, db):
    make_user(db, email="boss@example.com", role="super_admin")
    c = new_client(app)
    c.post("/api/admin/auth/login", json={"email": "boss@example.com", "password": PASSWORD})
    db.execute(text("update auth_sessions set expires_at = now() - interval '1 minute'"))
    db.commit()
    r = c.get("/api/admin/dashboard")
    assert r.status_code == 401 and r.json()["error"]["code"] == "session_expired"


def test_public_and_admin_sessions_never_mix(app, db):
    make_user(db, email="cust@example.com")
    make_user(db, email="boss@example.com", role="super_admin")
    browser = new_client(app)  # one browser holding both kinds of session
    customer = browser.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD}).json()
    boss = browser.post("/api/admin/auth/login", json={"email": "boss@example.com", "password": PASSWORD}).json()
    assert browser.get("/api/auth/me").json()["user"]["email"] == "cust@example.com"
    assert browser.get("/api/admin/auth/session").json()["user"]["email"] == "boss@example.com"
    assert browser.post("/api/auth/logout", headers={"X-CSRF-Token": customer["csrf_token"]}).status_code == 204  # public logout...
    assert browser.get("/api/auth/me").status_code == 401
    assert browser.get("/api/admin/dashboard").status_code == 200  # ...does not touch the admin session, and never exposes it publicly
    assert browser.get("/api/users/me").status_code == 401
    assert browser.post("/api/auth/logout", headers={"X-CSRF-Token": boss["csrf_token"]}).status_code == 401  # admin CSRF token is useless on the public side
    # swapping the cookies between the two systems does not work either way
    admin_token = browser.cookies.get(ADMIN, path="/api/admin")
    swapped = new_client(app)
    swapped.cookies.set(PUBLIC, admin_token, domain="localhost", path="/")
    assert swapped.get("/api/auth/me").status_code == 401
    cust_token = new_client(app)
    cust_token.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})
    stolen = new_client(app)
    stolen.cookies.set(ADMIN, cust_token.cookies.get(PUBLIC), domain="localhost", path="/api/admin")
    assert stolen.get("/api/admin/me").status_code == 401
    assert browser.post("/api/admin/auth/logout", headers={"X-CSRF-Token": boss["csrf_token"]}).status_code == 204  # and admin logout leaves customers alone
    db.expire_all()
    realms = {(s.realm, s.revoked_at is not None) for s in db.scalars(select(AuthSession))}
    assert ("public", True) in realms and ("admin", True) in realms


def test_client_side_role_claims_cannot_bypass_the_server(client, db):
    make_user(db, email="cust@example.com")
    client.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})
    forged = {"X-Role": "super_admin", "X-User-Role": "company_admin", "Authorization": "Bearer role=super_admin", "X-Permissions": "users,audit,system"}
    client.cookies.set("role", "super_admin", domain="localhost", path="/")
    client.cookies.set("is_admin", "true", domain="localhost", path="/api/admin")
    for path in ("/api/admin/me", "/api/admin/dashboard", "/api/admin/users", "/api/admin/hero-videos"):
        assert client.get(path, headers=forged).status_code == 401
    assert client.get("/api/users/me").json()["role"] == "user"
    csrf = {"X-CSRF-Token": client.get("/api/auth/me").json()["csrf_token"]}
    assert client.patch("/api/users/me", json={"full_name": "Cust Omer", "role": "super_admin"}, headers=csrf).status_code == 422


def test_promoting_or_demoting_an_account_cannot_carry_a_session_across(app, db):
    user = make_user(db, email="cust@example.com")
    c = new_client(app)
    c.post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD})
    assert c.get("/api/auth/me").status_code == 200
    user.role = "admin"  # even if a role changed without revoking sessions, the old public session must stop working
    db.commit()
    assert c.get("/api/auth/me").status_code == 401 and c.get("/api/admin/me").status_code == 401


# ---- migration safety ---------------------------------------------------------------------------------
def test_the_realm_migration_keeps_existing_admins_and_their_passwords(engine, database_url):
    from alembic import command
    from alembic.config import Config

    from tests.conftest import BACKEND

    url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    from app.core.security import hash_password

    pw_hash = hash_password(PASSWORD)
    command.downgrade(cfg, "0005")
    try:
        with engine.begin() as conn:
            uid = conn.execute(text("insert into users (id, full_name, email, password_hash, role, permissions, is_active) values (gen_random_uuid(), 'Old Boss', 'old.boss@example.com', :h, 'super_admin', '[]', true) returning id"), {"h": pw_hash}).scalar()
            conn.execute(text("insert into auth_sessions (id, user_id, token_hash, csrf_token, expires_at) values (gen_random_uuid(), :u, repeat('a',64), 'c', now() + interval '1 day')"), {"u": uid})
    finally:
        command.upgrade(cfg, "head")
    with engine.begin() as conn:
        row = conn.execute(text("select role, password_hash, is_active from users where email='old.boss@example.com'")).one()
        assert row.role == "super_admin" and row.password_hash == pw_hash and row.is_active  # account and credentials intact
        assert conn.execute(text("select realm from auth_sessions")).scalar() == "public"  # old sessions land in the public realm (and staff cannot use those)
        assert conn.execute(text("select count(*) from users")).scalar() == 1
