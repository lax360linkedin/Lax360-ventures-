import uuid
from datetime import date, timedelta

from sqlalchemy import select

from app.models import DemoRequest
from tests.conftest import branch_id, login, make_user


def payload(**over):
    base = {"name": "Ada Lovelace", "email": "Ada@Example.com", "company": "Analytical Engines Ltd",
            "preferred_date": (date.today() + timedelta(days=7)).isoformat(), "message": "Looking for a CRM walkthrough."}
    base.update(over)
    return base


def test_valid_submission_is_persisted_as_pending_not_confirmed(client, db):
    make_user(db)
    csrf = login(client)
    r = client.post("/api/demo-requests", json=payload(branch_id=branch_id(client, "Salem")), headers=csrf)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "pending" and body["branch_city"] == "Salem" and body["email"] == "ada@example.com"
    row = db.scalar(select(DemoRequest))
    assert row.status == "pending" and row.user_id is not None and row.company == "Analytical Engines Ltd"


def test_login_is_required(client):
    assert client.post("/api/demo-requests", json=payload()).status_code == 401
    assert client.get("/api/demo-requests/me").status_code == 401


def test_csrf_is_required_for_submission(client, db):
    make_user(db)
    login(client)
    assert client.post("/api/demo-requests", json=payload()).status_code == 403


def test_missing_required_fields(client, db):
    make_user(db)
    csrf = login(client)
    r = client.post("/api/demo-requests", json={"message": "hi"}, headers=csrf)
    assert r.status_code == 422
    assert {"name", "email"} <= set(r.json()["error"]["fields"])


def test_invalid_email_and_overlong_message(client, db):
    make_user(db)
    csrf = login(client)
    r = client.post("/api/demo-requests", json=payload(email="nope", message="x" * 1001), headers=csrf)
    assert r.status_code == 422 and {"email", "message"} <= set(r.json()["error"]["fields"])


def test_invalid_branch_is_rejected(client, db):
    make_user(db)
    csrf = login(client)
    r = client.post("/api/demo-requests", json=payload(branch_id=str(uuid.uuid4())), headers=csrf)
    assert r.status_code == 422 and "branch_id" in r.json()["error"]["fields"]
    assert client.post("/api/demo-requests", json=payload(branch_id="not-a-uuid"), headers=csrf).status_code == 422
    assert db.scalar(select(DemoRequest)) is None


def test_invalid_preferred_dates(client, db):
    make_user(db)
    csrf = login(client)
    past = client.post("/api/demo-requests", json=payload(preferred_date=(date.today() - timedelta(days=30)).isoformat()), headers=csrf)
    far = client.post("/api/demo-requests", json=payload(preferred_date=(date.today() + timedelta(days=900)).isoformat()), headers=csrf)
    junk = client.post("/api/demo-requests", json=payload(preferred_date="32/13/2026"), headers=csrf)
    assert past.status_code == far.status_code == junk.status_code == 422
    assert "preferred_date" in past.json()["error"]["fields"]


def test_client_cannot_set_status_user_or_role(client, db):
    make_user(db)
    csrf = login(client)
    for extra in ({"status": "confirmed"}, {"user_id": str(uuid.uuid4())}, {"role": "admin"}):
        assert client.post("/api/demo-requests", json=payload(**extra), headers=csrf).status_code == 422


def test_duplicate_submission_is_rejected(client, db):
    make_user(db)
    csrf = login(client)
    assert client.post("/api/demo-requests", json=payload(), headers=csrf).status_code == 201
    dup = client.post("/api/demo-requests", json=payload(), headers=csrf)
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "duplicate_request"
    assert len(db.scalars(select(DemoRequest)).all()) == 1


def test_users_only_see_their_own_requests(client, app, db):
    from fastapi.testclient import TestClient

    make_user(db)
    make_user(db, email="grace@example.com", name="Grace Hopper")
    ada = login(client)
    client.post("/api/demo-requests", json=payload(), headers=ada)
    grace_client = TestClient(app, base_url="http://localhost")
    grace = login(grace_client, "grace@example.com")
    grace_client.post("/api/demo-requests", json=payload(name="Grace Hopper", email="grace@example.com", message="Different"), headers=grace)
    mine = client.get("/api/demo-requests/me").json()
    theirs = grace_client.get("/api/demo-requests/me").json()
    assert [r["email"] for r in mine] == ["ada@example.com"] and [r["email"] for r in theirs] == ["grace@example.com"]


def test_admin_can_list_and_update_status(client, app, db):
    from fastapi.testclient import TestClient

    make_user(db)
    make_user(db, email="boss@example.com", name="Boss", role="admin")
    user_csrf = login(client)
    created = client.post("/api/demo-requests", json=payload(), headers=user_csrf).json()

    admin_client = TestClient(app, base_url="http://localhost")
    admin_csrf = login(admin_client, "boss@example.com")
    listing = admin_client.get("/api/admin/demo-requests?status=pending")
    assert listing.status_code == 200 and [r["id"] for r in listing.json()] == [created["id"]]

    url = f"/api/admin/demo-requests/{created['id']}"
    assert admin_client.patch(url, json={"status": "contacted"}).status_code == 403  # CSRF required
    ok = admin_client.patch(url, json={"status": "contacted"}, headers=admin_csrf)
    assert ok.status_code == 200 and ok.json()["status"] == "contacted"
    assert admin_client.patch(url, json={"status": "bogus"}, headers=admin_csrf).status_code == 422
    assert admin_client.patch(f"/api/admin/demo-requests/{uuid.uuid4()}", json={"status": "confirmed"}, headers=admin_csrf).status_code == 404
    # a normal user cannot touch the admin route even for their own request
    assert client.patch(url, json={"status": "confirmed"}, headers=user_csrf).status_code == 401
    assert db.scalar(select(DemoRequest.status)) == "contacted"
