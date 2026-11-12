"""Customers vs administrators: the chatbot's 3-message guest allowance (enforced on the server), password reset, and the admin 'Registered users' module.
The separation of the two worlds is asserted from the customer's side: a signed-in customer reaches no admin API, whatever they send."""

import re

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import ChatSession, User
from tests.admin_helpers import staff, submit_enquiry
from tests.conftest import PASSWORD, login, make_user


def say(client, message="What does LAX360 do?", **extra):
    return client.post("/api/chat", json={"message": message, **extra})


def fresh(app):
    return TestClient(app, base_url="http://localhost", raise_server_exceptions=False)


# ---- the chatbot's guest allowance ---------------------------------------------------------------------------------------------------
def test_a_visitor_gets_three_messages_then_must_log_in_and_the_model_is_not_called_again(client, ai):
    for n in range(3):
        r = say(client, f"question {n}")
        assert r.status_code == 200 and r.json()["meta"]["guest_messages_left"] == 2 - n
    calls = len(ai.responses.calls)
    r = say(client, "a fourth question")
    assert r.status_code == 401 and r.json()["error"]["code"] == "login_required" and "free messages" in r.json()["error"]["message"]
    assert len(ai.responses.calls) == calls  # refused BEFORE the provider is called: no cost, nothing stored


def test_dropping_the_conversation_id_does_not_reset_the_allowance(client, ai):
    first = say(client).json()
    say(client, "two", session_id=first["session_id"], session_token=first["session_token"])
    say(client, "three")  # a brand-new conversation, same browser (same guest cookie)
    assert say(client, "four").status_code == 401  # the allowance belongs to the visitor, not to the conversation


def test_a_forgotten_cookie_cannot_continue_someone_elses_conversation_and_the_address_cap_holds(app, ai, env):
    env(CHAT_GUEST_IP_MESSAGE_LIMIT="5")
    a = fresh(app)
    first = say(a).json()
    b = fresh(app)  # a new guest cookie
    r = say(b, session_id=first["session_id"], session_token=first["session_token"])
    assert r.status_code == 404  # a session token alone does not move a conversation to a fresh allowance
    for _ in range(2):  # a: 1 used + b: 2 more = 3 from this address ... keep going with fresh cookies until the per-address cap (5) is reached
        assert say(fresh(app)).status_code == 200
    codes = [say(fresh(app)).status_code for _ in range(3)]
    assert 401 in codes  # clearing cookies buys only a little: the per-address cap ends it


def test_after_logging_in_the_same_conversation_continues_without_a_limit(client, ai, db):
    make_user(db, email="cust@example.com")
    first = say(client).json()
    sid, tok = first["session_id"], first["session_token"]
    say(client, "two", session_id=sid, session_token=tok)
    say(client, "three", session_id=sid, session_token=tok)
    assert say(client, "four", session_id=sid, session_token=tok).status_code == 401
    login(client, "cust@example.com")
    r = say(client, "four, now logged in", session_id=sid, session_token=tok)
    assert r.status_code == 200 and "guest_messages_left" not in r.json()["meta"]  # context kept: same session, no limit for a signed-in customer
    assert db.scalar(select(ChatSession.user_id).where(ChatSession.id == sid)) == db.scalar(select(User.id).where(User.email == "cust@example.com"))
    for n in range(5):
        assert say(client, f"more {n}", session_id=sid, session_token=tok).status_code == 200


# ---- customers can never reach the admin side ---------------------------------------------------------------------------------------
ADMIN_GETS = ["/api/admin/customers", "/api/admin/users", "/api/admin/content/kinds", "/api/admin/enquiries", "/api/admin/media", "/api/admin/audit", "/api/admin/settings"]


def test_a_signed_in_customer_reaches_no_admin_endpoint(client, db):
    make_user(db, email="cust@example.com")
    csrf = login(client, "cust@example.com")
    for path in ADMIN_GETS:
        assert client.get(path).status_code in (401, 403, 404), path
    assert client.post("/api/admin/content/hero", json={"title": "x", "data": {}}, headers=csrf).status_code in (401, 403)
    assert client.patch("/api/admin/customers/00000000-0000-0000-0000-000000000000", json={"is_active": False}, headers=csrf).status_code in (401, 403)
    assert client.post("/api/admin/auth/login", json={"email": "cust@example.com", "password": PASSWORD}).status_code in (401, 403)  # the admin door refuses a customer account
    me = client.get("/api/auth/me").json()["user"]
    assert me["role"] == "user"


def test_registration_always_creates_a_customer_and_cannot_be_asked_for_more(client, db):
    r = client.post("/api/auth/register", json={"full_name": "New Person", "email": "new@example.com", "password": "a-long-enough-password", "mobile": "9876543210", "category": "other", "purposes": ["ai"]})
    assert r.status_code == 201 and r.json()["user"]["role"] == "user"
    bad = client.post("/api/auth/register", json={"full_name": "Sneaky", "email": "sneaky@example.com", "password": "a-long-enough-password", "mobile": "9876543210", "category": "other", "purposes": ["ai"], "role": "super_admin", "permissions": ["content"]})
    assert bad.status_code == 422  # unknown fields are refused, not ignored
    assert db.scalar(select(User.role).where(User.email == "sneaky@example.com")) is None


# ---- the admin 'Registered users' module ---------------------------------------------------------------------------------------------
def test_the_module_needs_its_own_permission_and_only_lists_customers(app, db):
    make_user(db, email="cust@example.com", name="Cora Customer")
    boss, bcsrf, _ = staff(app, db, role="super_admin", email="boss@example.com")
    nobody, _, _ = staff(app, db, role="admin", email="limited@example.com", permissions=["content"])
    allowed, acsrf, _ = staff(app, db, role="admin", email="support@example.com", permissions=["customers"])
    assert nobody.get("/api/admin/customers").status_code == 403
    listing = allowed.get("/api/admin/customers").json()
    assert [u["email"] for u in listing["items"]] == ["cust@example.com"]  # administrators never appear here
    assert listing["summary"] == {"total": 1, "active": 1}
    assert allowed.get("/api/admin/customers?q=cora").json()["total"] == 1 and allowed.get("/api/admin/customers?q=zzz").json()["total"] == 0
    assert allowed.get("/api/admin/customers?status=inactive").json()["total"] == 0
    admin_id = db.scalar(select(User.id).where(User.email == "limited@example.com"))
    assert allowed.get(f"/api/admin/customers/{admin_id}").status_code == 404  # an administrator is not a customer record
    # the role and password powers are the super admin's alone
    cid = listing["items"][0]["id"]
    assert allowed.post(f"/api/admin/customers/{cid}/make-admin", json={"permissions": ["content"]}, headers=acsrf).status_code == 403
    assert allowed.post(f"/api/admin/customers/{cid}/reset-password", json={"new_password": "another-long-password"}, headers=acsrf).status_code == 403
    ok = boss.post(f"/api/admin/customers/{cid}/make-admin", json={"permissions": ["content", "not-a-module"]}, headers=bcsrf)
    assert ok.status_code == 200 and ok.json()["role"] == "admin" and ok.json()["permissions"] == ["content"]
    assert allowed.get("/api/admin/customers").json()["total"] == 0  # now an administrator: managed under Administrators, not here


def test_deactivating_a_customer_signs_them_out_at_once_and_blocks_login(app, db):
    make_user(db, email="cust@example.com")
    c = fresh(app)
    login(c, "cust@example.com")
    assert c.get("/api/auth/me").status_code == 200
    admin, csrf, _ = staff(app, db, role="admin", email="support@example.com", permissions=["customers"])
    cid = admin.get("/api/admin/customers").json()["items"][0]["id"]
    assert admin.patch(f"/api/admin/customers/{cid}", json={"is_active": False}, headers=csrf).status_code == 200
    assert c.get("/api/auth/me").status_code == 401
    assert fresh(app).post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD}).status_code == 401
    assert admin.patch(f"/api/admin/customers/{cid}", json={"is_active": True}, headers=csrf).status_code == 200
    assert fresh(app).post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD}).status_code == 200


def test_customer_history_lists_their_own_enquiries_and_demo_requests_only(app, db):
    make_user(db, email="cust@example.com")
    c = fresh(app)
    csrf = login(c, "cust@example.com")
    submit_enquiry(c, message="A signed-in customer's enquiry about a CRM project.")
    submit_enquiry(fresh(app), email="cust@example.com", message="A visitor using the same e-mail address but not signed in: not theirs.")
    from tests.conftest import branch_id
    from tests.test_demo_requests import payload

    assert c.post("/api/demo-requests", json=payload(branch_id=branch_id(c, "Salem")), headers=csrf).status_code == 201
    mine = c.get("/api/contact/mine").json()
    assert len(mine) == 1 and "signed-in customer" in mine[0]["message"]  # matched by account, never by e-mail address
    admin, _, _ = staff(app, db, role="admin", email="support@example.com", permissions=["customers"])
    row = admin.get("/api/admin/customers").json()["items"][0]
    assert row["enquiries"] == 1 and row["demo_requests"] == 1
    detail = admin.get(f"/api/admin/customers/{row['id']}").json()
    assert len(detail["enquiry_history"]) == 1 and len(detail["demo_history"]) == 1


# ---- password reset ------------------------------------------------------------------------------------------------------------------
def capture_mail(monkeypatch):
    sent = []
    monkeypatch.setattr("app.services.email_service.send", lambda settings, to, subject, body: sent.append((to, subject, body)) or True)
    return sent


def test_password_reset_is_neutral_single_use_and_signs_everything_out(client, app, db, monkeypatch):
    sent = capture_mail(monkeypatch)
    make_user(db, email="cust@example.com")
    c = fresh(app)
    login(c, "cust@example.com")
    unknown = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    known = client.post("/api/auth/forgot-password", json={"email": "cust@example.com"})
    assert unknown.status_code == known.status_code == 202 and unknown.json() == known.json()  # an address cannot be probed for an account
    assert [m[0] for m in sent] == ["cust@example.com"]
    token = re.search(r"token=([\w.\-]+)", sent[0][2]).group(1)
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "short"}).status_code == 422
    assert client.post("/api/auth/reset-password", json={"token": token + "x", "new_password": "a-brand-new-password"}).status_code == 400  # tampered
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "a-brand-new-password"}).status_code == 204
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "yet-another-password"}).status_code == 400  # single use
    assert c.get("/api/auth/me").status_code == 401  # the old session is gone
    assert fresh(app).post("/api/auth/login", json={"email": "cust@example.com", "password": PASSWORD}).status_code == 401
    assert fresh(app).post("/api/auth/login", json={"email": "cust@example.com", "password": "a-brand-new-password"}).status_code == 200


def test_expired_reset_links_and_staff_accounts_are_refused(client, db, monkeypatch, env):
    sent = capture_mail(monkeypatch)
    make_user(db, email="staff@example.com", role="admin")
    client.post("/api/auth/forgot-password", json={"email": "staff@example.com"})
    assert sent == []  # staff never get a public reset e-mail: an administrator's password is set by a super admin
    env(PASSWORD_RESET_TTL_MINUTES="-1")
    make_user(db, email="cust@example.com")
    client.post("/api/auth/forgot-password", json={"email": "cust@example.com"})
    token = re.search(r"token=([\w.\-]+)", sent[0][2]).group(1)
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "a-brand-new-password"}).status_code == 400
