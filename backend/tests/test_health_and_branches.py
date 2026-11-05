from sqlalchemy import select

from app.models import Branch


def test_liveness_does_not_need_the_database(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_readiness_checks_database_and_reports_flags_only(client):
    r = client.get("/api/health/ready")
    body = r.json()
    assert r.status_code == 200 and body["database"] == "ok"
    assert body["ai_provider"] == "gemini" and body["ai_configured"] is False  # no key in the test environment
    assert "sk-" not in r.text and "AUTH_SECRET" not in r.text


def test_readiness_is_503_when_database_is_not_configured(monkeypatch):
    from fastapi.testclient import TestClient

    from app.core.config import get_settings
    from app.db.session import reset_engine
    from app.main import create_app

    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    reset_engine()
    r = TestClient(create_app(), raise_server_exceptions=False).get("/api/health/ready")
    assert r.status_code == 503 and r.json()["database"] == "not_configured"
    get_settings.cache_clear()


def test_branches_are_the_three_cities_with_their_official_details(client):
    data = client.get("/api/branches").json()
    assert [b["city"] for b in data] == ["Salem", "Bangalore", "Mumbai"]
    by_city = {b["city"]: b for b in data}
    assert by_city["Salem"]["address_lines"] == ["1st Floor, 16, CPS Tower", "Advaitha Ashram Road, Fairlands", "Salem, Tamil Nadu – 636004"] and by_city["Salem"]["phone"] == "+91 95666 79928"
    assert by_city["Bangalore"]["address_lines"][-1] == "Bengaluru, Karnataka – 560034" and by_city["Bangalore"]["phone"] == "+91 95666 79928"
    assert by_city["Mumbai"]["address_lines"][0] == "Level 4, Dynasty Business Park" and by_city["Mumbai"]["address_lines"][-1] == "Andheri East, Mumbai, Maharashtra – 400059" and by_city["Mumbai"]["phone"] == "+91 95666 05272"


def test_branch_seed_is_in_the_migrated_database(db):
    assert {b.slug for b in db.scalars(select(Branch))} == {"salem", "bangalore", "mumbai"}
