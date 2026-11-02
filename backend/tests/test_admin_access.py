"""Authentication and authorization for every admin module: nothing is reachable without the right role AND permission."""

import pytest

from tests.admin_helpers import PASSWORD, staff
from tests.conftest import login, make_user

READ_ENDPOINTS = [
    ("/api/admin/me", None), ("/api/admin/dashboard", None), ("/api/admin/enquiries", "enquiries"), ("/api/admin/enquiries/assignees", "enquiries"),
    ("/api/admin/enquiries/export.csv", "enquiries"), ("/api/admin/demo-requests", "demo_requests"), ("/api/admin/content/kinds", "content"),
    ("/api/admin/content/faq", "content"), ("/api/admin/settings", "settings"), ("/api/admin/chatbot/settings", "chatbot"),
    ("/api/admin/chatbot/conversations", "chatbot"), ("/api/admin/chatbot/usage", "chatbot"), ("/api/admin/ai-usage", "chatbot"),
    ("/api/admin/media", "media"), ("/api/admin/users", "super"), ("/api/admin/audit-logs", "super"), ("/api/admin/system", "super"),
]


@pytest.mark.parametrize(("path", "module"), READ_ENDPOINTS)
def test_anonymous_visitors_get_401_everywhere(client, path, module):
    r = client.get(path)
    assert r.status_code == 401 and r.json()["error"]["code"] == "not_authenticated"


@pytest.mark.parametrize(("path", "module"), READ_ENDPOINTS)
def test_website_customers_cannot_reach_any_admin_api(client, db, path, module):
    make_user(db)  # role "user"
    login(client)  # a signed-in CUSTOMER: the admin system does not recognise a public-website session at all
    r = client.get(path)
    assert r.status_code == 401 and r.json()["error"]["code"] == "not_authenticated"


@pytest.mark.parametrize(("path", "module"), [e for e in READ_ENDPOINTS if e[1]])
def test_an_admin_without_the_module_is_forbidden_and_with_it_allowed(app, db, path, module):
    nothing, _, _ = staff(app, db, permissions=[], email="none@example.com")
    assert nothing.get(path).status_code == (403 if module != "x" else 200)
    if module == "super":
        return
    holder, _, _ = staff(app, db, permissions=[module], email="holder@example.com")
    assert holder.get(path).status_code == 200


@pytest.mark.parametrize("path", ["/api/admin/users", "/api/admin/audit-logs", "/api/admin/system"])
def test_super_only_areas_reject_even_a_fully_permitted_admin(app, db, path):
    admin, _, _ = staff(app, db, permissions=["enquiries", "demo_requests", "content", "chatbot", "media", "settings"])
    assert admin.get(path).status_code == 403
    boss, _, _ = staff(app, db, role="super_admin", email="boss@example.com")
    assert boss.get(path).status_code == 200


def test_admin_me_reports_exactly_the_effective_permissions(app, db):
    admin, _, _ = staff(app, db, permissions=["content", "bogus-module"])
    body = admin.get("/api/admin/me").json()
    assert body["user"]["role"] == "admin" and body["permissions"] == ["content"]
    boss, _, _ = staff(app, db, role="super_admin", email="boss@example.com")
    assert {"enquiries", "users", "audit", "system"} <= set(boss.get("/api/admin/me").json()["permissions"])


def test_every_state_changing_admin_call_requires_the_csrf_header(app, db):
    boss, csrf, _ = staff(app, db, role="super_admin")
    calls = [
        ("PUT", "/api/admin/settings", {"values": {"tagline": "X"}}), ("POST", "/api/admin/content/faq", {"title": "Q?", "data": {"group": "home", "answer": "A"}}),
        ("PUT", "/api/admin/chatbot/settings", {"values": {"chatbot_enabled": False}}), ("POST", "/api/admin/users", {"email": "n@example.com", "full_name": "New Admin", "password": PASSWORD}),
        ("POST", "/api/admin/system/test-ai", None),
    ]
    for method, path, body in calls:
        r = boss.request(method, path, json=body)
        assert r.status_code == 403 and r.json()["error"]["code"] == "csrf_failed", path
    assert boss.put("/api/admin/settings", json={"values": {"tagline": "X"}}, headers=csrf).status_code == 200


def test_a_deactivated_admin_loses_access_immediately(app, db):
    from sqlalchemy import update

    from app.models import User

    admin, _, user = staff(app, db, permissions=["enquiries"])
    assert admin.get("/api/admin/enquiries").status_code == 200
    db.execute(update(User).where(User.id == user.id).values(is_active=False))
    db.commit()
    assert admin.get("/api/admin/enquiries").status_code == 401


def test_a_customer_account_cannot_be_promoted_by_the_client(app, db):
    customer, csrf, _ = staff(app, db, role="user", email="cust@example.com")
    r = customer.patch("/api/users/me", json={"full_name": "Cust Omer", "role": "super_admin", "permissions": ["enquiries"]}, headers=csrf)
    assert r.status_code == 422  # unknown fields rejected
    assert customer.get("/api/admin/enquiries").status_code == 401
