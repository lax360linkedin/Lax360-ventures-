import uuid

from sqlalchemy import select

from app.models import ContactEnquiry
from tests.conftest import branch_id


def payload(**over):
    base = {"name": "Grace Hopper", "email": "Grace@Example.COM", "phone": "+91 95666 79928", "company": "COBOL Co",
            "enquiry_type": "project", "message": "We need a CRM for our sales team, please contact us.",
            "consent": True, "extra": {"timeline": "1–3 months"}, "source": "contact"}
    base.update(over)
    return base


def test_valid_enquiry_is_stored(client, db):
    r = client.post("/api/contact", json=payload(branch_id=branch_id(client, "Mumbai")))
    assert r.status_code == 201 and r.json()["status"] == "received" and r.json()["duplicate"] is False
    row = db.scalar(select(ContactEnquiry))
    assert row.email == "grace@example.com" and row.phone == "+919566679928" and row.subject == "Software project"
    assert row.status == "new" and row.consented is True and row.extra == {"timeline": "1–3 months"}
    assert row.branch.city == "Mumbai"


def test_email_is_validated_and_normalised(client):
    r = client.post("/api/contact", json=payload(email="not-an-email"))
    assert r.status_code == 422 and "email" in r.json()["error"]["fields"]


def test_missing_required_fields(client):
    r = client.post("/api/contact", json={"name": "G"})
    assert r.status_code == 422
    assert {"name", "email", "message", "consent"} <= set(r.json()["error"]["fields"])


def test_consent_must_be_given_and_phone_must_look_like_a_phone(client):
    assert "consent" in client.post("/api/contact", json=payload(consent=False)).json()["error"]["fields"]
    assert "phone" in client.post("/api/contact", json=payload(phone="call me maybe")).json()["error"]["fields"]


def test_invalid_branch_is_rejected(client, db):
    r = client.post("/api/contact", json=payload(branch_id=str(uuid.uuid4())))
    assert r.status_code == 422 and "branch_id" in r.json()["error"]["fields"]
    assert db.scalar(select(ContactEnquiry)) is None


def test_unknown_enquiry_type_is_rejected(client):
    assert client.post("/api/contact", json=payload(enquiry_type="free-money")).status_code == 422


def test_duplicate_submission_is_not_stored_twice(client, db):
    first = client.post("/api/contact", json=payload())
    again = client.post("/api/contact", json=payload())
    assert first.status_code == 201 and again.status_code == 200 and again.json()["duplicate"] is True
    assert len(db.scalars(select(ContactEnquiry)).all()) == 1


def test_honeypot_submissions_are_silently_dropped(client, db):
    r = client.post("/api/contact", json=payload(website="http://spam.example"))
    assert r.status_code == 201
    assert db.scalar(select(ContactEnquiry)) is None


def test_rate_limit(client):
    codes = [client.post("/api/contact", json=payload(message=f"Enquiry number {i}, please get in touch with us.")).status_code for i in range(6)]
    assert codes[:5] == [201] * 5 and codes[5] == 429


def test_oversized_request_is_rejected_without_a_stack_trace(client):
    r = client.post("/api/contact", content=b'{"message": "' + b"x" * 70_000 + b'"}', headers={"Content-Type": "application/json"})
    assert r.status_code == 413 and r.json()["error"]["code"] == "payload_too_large"
    assert "Traceback" not in r.text


def test_no_internal_details_leak_on_database_failure(client, app, monkeypatch):
    from app.services import contact_service

    def boom(*a, **k):
        raise RuntimeError("password authentication failed for user lax360 at 10.0.0.5")

    monkeypatch.setattr(contact_service, "create_enquiry", boom)
    r = client.post("/api/contact", json=payload())
    assert r.status_code == 500
    assert "10.0.0.5" not in r.text and "password" not in r.text and r.json()["error"]["code"] == "internal_error"
