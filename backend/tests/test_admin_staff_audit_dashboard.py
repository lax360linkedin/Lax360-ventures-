from datetime import date, timedelta

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError

from app.models import AuditLog, User
from tests.admin_helpers import PASSWORD, staff, submit_enquiry
from tests.conftest import login

NEW_PW = "another-long-password-1"


def create_admin(boss, csrf, **over):
    body = {"email": "new.admin@example.com", "full_name": "New Admin", "password": PASSWORD, "role": "admin", "permissions": ["enquiries", "content"], **over}
    return boss.post("/api/admin/users", json=body, headers=csrf)


# ---- administrator management ----------------------------------------------------------------------
def test_super_admin_creates_an_admin_with_limited_modules(app, db):
    boss, csrf, _ = staff(app, db, role="super_admin")
    r = create_admin(boss, csrf, permissions=["enquiries", "content", "nonsense"])
    assert r.status_code == 201 and r.json()["permissions"] == ["enquiries", "content"] and r.json()["effective_permissions"] == ["enquiries", "content"]
    from fastapi.testclient import TestClient

    newbie = TestClient(app, base_url="http://localhost")
    login(newbie, "new.admin@example.com")
    assert newbie.get("/api/admin/enquiries").status_code == 200
    assert newbie.get("/api/admin/settings").status_code == 403 and newbie.get("/api/admin/users").status_code == 403
    assert "password" not in r.text and "hash" not in r.text


def test_new_admin_validation_and_duplicates(app, db):
    boss, csrf, _ = staff(app, db, role="super_admin")
    assert "password" in create_admin(boss, csrf, password="short").json()["error"]["fields"]
    assert create_admin(boss, csrf, email="not-an-email").status_code == 422
    assert create_admin(boss, csrf, role="user").status_code == 422
    assert create_admin(boss, csrf).status_code == 201
    assert create_admin(boss, csrf).status_code == 409


def test_an_admin_can_not_manage_administrators_or_elevate_themselves(app, db):
    admin, csrf, me = staff(app, db, permissions=["enquiries"], email="a@example.com")
    boss, _, _ = staff(app, db, role="super_admin", email="boss@example.com")
    assert admin.post("/api/admin/users", json={"email": "x@example.com", "full_name": "Evil Admin", "password": PASSWORD, "role": "super_admin"}, headers=csrf).status_code == 403
    assert admin.patch(f"/api/admin/users/{me.id}", json={"role": "super_admin"}, headers=csrf).status_code == 403
    assert admin.patch(f"/api/admin/users/{me.id}", json={"permissions": ["settings", "media"]}, headers=csrf).status_code == 403
    boss_id = db.scalar(select(User.id).where(User.email == "boss@example.com"))
    assert admin.patch(f"/api/admin/users/{boss_id}", json={"is_active": False}, headers=csrf).status_code == 403
    assert admin.post(f"/api/admin/users/{boss_id}/reset-password", json={"new_password": NEW_PW}, headers=csrf).status_code == 403
    assert db.scalar(select(User.role).where(User.id == me.id)) == "admin"


def test_changing_permissions_or_deactivating_signs_the_person_out_at_once(app, db):
    boss, csrf, _ = staff(app, db, role="super_admin")
    admin, _, target = staff(app, db, permissions=["enquiries"], email="t@example.com")
    assert admin.get("/api/admin/enquiries").status_code == 200
    assert boss.patch(f"/api/admin/users/{target.id}", json={"permissions": ["content"]}, headers=csrf).status_code == 200
    assert admin.get("/api/admin/enquiries").status_code == 401  # session revoked, must log in again
    again = login(admin, "t@example.com")
    assert admin.get("/api/admin/enquiries").status_code == 403 and admin.get("/api/admin/content/faq").status_code == 200
    r = boss.patch(f"/api/admin/users/{target.id}", json={"is_active": False}, headers=csrf)
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert admin.get("/api/admin/content/faq").status_code == 401
    assert admin.post("/api/admin/auth/login", json={"email": "t@example.com", "password": PASSWORD}).status_code == 401  # cannot log in while inactive
    assert boss.patch(f"/api/admin/users/{target.id}", json={"is_active": True}, headers=csrf).status_code == 200
    assert again and admin.post("/api/admin/auth/login", json={"email": "t@example.com", "password": PASSWORD}).status_code == 200


def test_the_last_active_super_admin_can_never_be_removed(app, db):
    boss, csrf, me = staff(app, db, role="super_admin", email="only@example.com")
    for body in ({"role": "admin"}, {"is_active": False}):
        r = boss.patch(f"/api/admin/users/{me.id}", json=body, headers=csrf)
        assert r.status_code == 409 and r.json()["error"]["code"] == "last_super_admin"
    assert db.scalar(select(User.role).where(User.id == me.id)) == "super_admin"
    second = create_admin(boss, csrf, email="second@example.com", role="super_admin").json()
    assert boss.patch(f"/api/admin/users/{me.id}", json={"role": "admin"}, headers=csrf).status_code == 200  # fine now: another one remains
    from fastapi.testclient import TestClient

    other = TestClient(app, base_url="http://localhost")
    csrf2 = login(other, "second@example.com")
    r = other.patch(f"/api/admin/users/{second['id']}", json={"is_active": False}, headers=csrf2)  # now `second` is the last
    assert r.status_code == 409
    fails = db.scalars(select(AuditLog).where(AuditLog.action == "admin.update", AuditLog.status == "failure")).all()
    assert len(fails) >= 2  # blocked attempts are recorded


def test_password_reset_by_super_admin_revokes_sessions(app, db):
    boss, csrf, _ = staff(app, db, role="super_admin")
    admin, _, target = staff(app, db, permissions=["enquiries"], email="r@example.com")
    assert boss.post(f"/api/admin/users/{target.id}/reset-password", json={"new_password": "short"}, headers=csrf).status_code == 422
    assert boss.post(f"/api/admin/users/{target.id}/reset-password", json={"new_password": NEW_PW}, headers=csrf).status_code == 204
    assert admin.get("/api/admin/enquiries").status_code == 401
    assert admin.post("/api/admin/auth/login", json={"email": "r@example.com", "password": PASSWORD}).status_code == 401
    assert admin.post("/api/admin/auth/login", json={"email": "r@example.com", "password": NEW_PW}).status_code == 200
    assert boss.get("/api/admin/users").status_code == 200 and len(boss.get("/api/admin/users").json()) == 2


def test_customers_do_not_appear_in_the_administrator_list(app, db, client):
    boss, csrf, _ = staff(app, db, role="super_admin")
    staff(app, db, role="user", email="customer@example.com")
    emails = [u["email"] for u in boss.get("/api/admin/users").json()]
    assert "customer@example.com" not in emails and len(emails) == 1


# ---- audit log ---------------------------------------------------------------------------------------
def test_login_logout_and_admin_changes_are_recorded(app, db):
    from fastapi.testclient import TestClient

    boss, csrf, me = staff(app, db, role="super_admin", email="boss@example.com")
    create_admin(boss, csrf)
    attempts = TestClient(app, base_url="http://localhost")
    assert attempts.post("/api/admin/auth/login", json={"email": "boss@example.com", "password": "wrong-wrong-wrong"}).status_code == 401
    assert attempts.post("/api/admin/auth/login", json={"email": "ghost@example.com", "password": "wrong-wrong-wrong"}).status_code == 401
    boss.post("/api/admin/auth/logout", headers=csrf)
    pairs = [(a.action, a.status) for a in db.scalars(select(AuditLog).order_by(AuditLog.created_at))]
    assert ("auth.login", "success") in pairs and ("admin.create", "success") in pairs and ("auth.login", "failure") in pairs and ("auth.logout", "success") in pairs
    assert not any("ghost@example.com" in (a.admin_email or "") for a in db.scalars(select(AuditLog)))  # unknown emails are not stored


def test_audit_log_is_append_only_even_for_direct_database_access(app, db):
    staff(app, db, role="super_admin")
    row = db.scalar(select(AuditLog))
    assert row is not None
    for sql in ("update audit_logs set action = 'tampered'", "delete from audit_logs", "update audit_logs set status = 'failure'"):
        with pytest.raises(DBAPIError):
            db.execute(text(sql))
        db.rollback()
    assert db.scalar(select(AuditLog.action)) == row.action


def test_audit_log_records_survive_deleting_the_user_but_lose_the_link(app, db):
    boss, csrf, _ = staff(app, db, role="super_admin", email="boss@example.com")
    _, _, gone = staff(app, db, permissions=["enquiries"], email="gone@example.com")
    assert db.scalar(select(AuditLog.id).where(AuditLog.admin_id == gone.id)) is not None  # the login
    db.execute(text("delete from users where email = 'gone@example.com'"))
    db.commit()
    kept = db.scalar(select(AuditLog).where(AuditLog.admin_email == "gone@example.com"))
    assert kept is not None and kept.admin_id is None  # record kept; only the foreign key was cleared


def test_audit_log_listing_filters_and_is_super_only(app, db):
    boss, csrf, _ = staff(app, db, role="super_admin", email="boss@example.com")
    create_admin(boss, csrf)
    data = boss.get("/api/admin/audit-logs").json()
    assert data["total"] >= 2 and "admin.create" in data["actions"]
    assert {i["action"] for i in boss.get("/api/admin/audit-logs?action=admin.create").json()["items"]} == {"admin.create"}
    assert boss.get("/api/admin/audit-logs?status=failure").json()["total"] == 0
    assert boss.get(f"/api/admin/audit-logs?from={date.today().isoformat()}&to={date.today().isoformat()}").json()["total"] == data["total"]
    assert boss.get(f"/api/admin/audit-logs?to={(date.today() - timedelta(days=1)).isoformat()}").json()["total"] == 0
    assert boss.get("/api/admin/audit-logs?page_size=1").json()["pages"] == data["total"]
    dump = str(data)
    assert "argon2" not in dump and PASSWORD not in dump
    other, _, _ = staff(app, db, permissions=["enquiries", "content", "settings", "chatbot", "media", "demo_requests"], email="o@example.com")
    assert other.get("/api/admin/audit-logs").status_code == 403


def test_audit_details_never_keep_secrets():
    from app.services.audit_service import _clean

    cleaned = _clean({"password": "x", "api_key": "y", "new_token": "z", "Authorization": "Bearer q", "title": "ok", "fields": ["a", "b"], "n": 3, "blob": {"k": "v"}})
    assert set(cleaned) == {"title", "fields", "n", "blob"}


# ---- dashboard ---------------------------------------------------------------------------------------
def test_dashboard_numbers_come_from_the_database(app, db, client):
    ids = [submit_enquiry(client, email=f"p{i}@example.com", message=f"Enquiry number {i}, please get in touch with us soon.") for i in range(3)]
    admin, csrf, _ = staff(app, db, permissions=["enquiries", "demo_requests", "chatbot"])
    admin.patch(f"/api/admin/enquiries/{ids[0]}", json={"status": "in_progress"}, headers=csrf)
    admin.patch(f"/api/admin/enquiries/{ids[1]}", json={"status": "converted"}, headers=csrf)
    d = admin.get("/api/admin/dashboard").json()
    e = d["enquiries"]
    assert e["total"] == 3 and e["new"] == 1 and e["open"] == 2 and e["in_range"] == 3
    assert e["by_status"] == {"new": 1, "in_progress": 1, "contacted": 0, "converted": 1, "closed": 0}
    assert len(d["days"]) == 30 and len(e["series"]) == 30 and e["series"][-1] == 3 and len(e["recent"]) == 3
    assert d["demos"]["total"] == 0 and d["chatbot"]["conversations_total"] == 0 and "customers" in d
    admin.post(f"/api/admin/enquiries/{ids[2]}/archive", headers=csrf)
    assert admin.get("/api/admin/dashboard").json()["enquiries"]["by_status"]["new"] == 0  # counts update when records change
    assert admin.get("/api/admin/dashboard").json()["enquiries"]["archived"] == 1
    assert [a["action"] for a in d["recent_activity"]] and all(a["admin"] for a in d["recent_activity"])


def test_dashboard_hides_modules_the_admin_cannot_use_and_filters_by_date(app, db, client):
    submit_enquiry(client)
    narrow, _, _ = staff(app, db, permissions=["content"], email="n@example.com")
    d = narrow.get("/api/admin/dashboard").json()
    assert "enquiries" not in d and "demos" not in d and "chatbot" not in d and "customers" in d
    boss, _, _ = staff(app, db, role="super_admin", email="boss@example.com")
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    past = boss.get(f"/api/admin/dashboard?from={yesterday}&to={yesterday}").json()
    assert past["days"] == [yesterday] and past["enquiries"]["in_range"] == 0 and past["enquiries"]["total"] == 1
    assert len(boss.get("/api/admin/dashboard?from=2020-01-01&to=2026-01-01").json()["days"]) == 30  # absurd ranges fall back safely
    assert boss.get("/api/admin/dashboard?from=not-a-date").status_code == 422
