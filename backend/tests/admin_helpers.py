"""Shared helpers for the admin-panel tests."""

from fastapi.testclient import TestClient

from tests.conftest import PASSWORD, login, make_user

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def staff(app, db, *, role="admin", email=None, permissions=None, name=None):
    """Create a staff account and return (client, csrf_headers, user) with that client logged in."""
    email = email or f"{role}-{len(db.bind.url.render_as_string()) % 7}-{id(object())}@example.com"
    user = make_user(db, email=email, name=name or role.title(), role=role, permissions=permissions)
    client = TestClient(app, base_url="http://localhost", raise_server_exceptions=False)
    csrf = login(client, email)
    return client, csrf, user


def enquiry_payload(**over):
    base = {"name": "Grace Hopper", "email": "grace@example.com", "phone": "+919566679928", "company": "COBOL Co", "enquiry_type": "project",
            "message": "We need a CRM for our sales team, please contact us.", "consent": True, "source": "contact"}
    base.update(over)
    return base


def submit_enquiry(client, **over):
    r = client.post("/api/contact", json=enquiry_payload(**over))
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


__all__ = ["PASSWORD", "PNG", "enquiry_payload", "staff", "submit_enquiry"]
