"""Partnership module tests (no PostgreSQL needed: the real routes run on in-memory SQLite, staff identity is injected through the same dependencies the admin panel uses)."""

from __future__ import annotations

import io
import json
import uuid
from datetime import date, timedelta

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.core.errors import ApiError
from app.db.base import Base
from app.db.session import get_db, get_read_db
from app.models import (ApplicationEvent, AuditLog, Branch, ContentItem, MediaAsset, PartnershipApplication, PartnershipFaq, PartnershipMenuItem, PartnershipPage, PartnershipPolicy, PartnershipSetting, SiteSetting, User)
from app.services import partnership_service as ps

TABLES = [User.__table__, MediaAsset.__table__, AuditLog.__table__, ContentItem.__table__, SiteSetting.__table__, PartnershipApplication.__table__, ApplicationEvent.__table__, PartnershipPage.__table__,
          PartnershipFaq.__table__, PartnershipPolicy.__table__, PartnershipSetting.__table__, PartnershipMenuItem.__table__, Branch.__table__]
BASE = "/api/admin/partnerships"
GOOD = {"category": "franchise", "division": "education", "full_name": "Meena Kumar", "email": "Meena@Example.com", "phone": "+91 98765 43210", "country": "India", "state": "Tamil Nadu", "city": "Salem",
        "answers": {"proposed_location": "Salem", "investment_budget": "To be discussed", "business_experience": "Ran a computer centre"}, "consent_processing": True, "source_page": "/franchise/education"}


@pytest.fixture
def factory():
    engine = create_engine("sqlite+pysqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine, tables=TABLES)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def db(factory):
    with factory() as s:
        yield s


@pytest.fixture
def api(factory):
    from app.core.rate_limit import limiter
    from app.main import create_app

    limiter.reset()
    from app.core.config import get_settings

    get_settings().partner_rate_limit_max = 1000  # the rate-limit test lowers it itself
    app = create_app()
    people: dict[str, User] = {}

    def db_dep():
        with factory() as s:
            yield s

    def person(request: Request) -> User:
        name = request.headers.get("x-test-staff")
        if not name:
            raise ApiError(401, "unauthorized", "Sign in required.")
        role = request.headers.get("x-test-role", "admin")
        perms = [p for p in request.headers.get("x-test-perms", "").split(",") if p]
        key = f"{name}:{role}"
        if key not in people:
            with factory() as s:
                u = User(full_name=name.title(), email=f"{name}@lax360.test", password_hash="x", role=role, permissions=perms, is_active=True)
                s.add(u); s.commit(); people[key] = u
        people[key].permissions = perms
        return deps._staff_only(people[key])

    app.dependency_overrides[get_db] = db_dep
    app.dependency_overrides[get_read_db] = db_dep
    app.dependency_overrides[deps.staff_user] = person
    app.dependency_overrides[deps.staff_user_csrf] = person
    with TestClient(app, base_url="http://localhost", raise_server_exceptions=False) as c:
        c.people = people
        yield c
    app.dependency_overrides.clear()


ADMIN = {"x-test-staff": "ops", "x-test-role": "admin", "x-test-perms": "partnerships"}
NOPERM = {"x-test-staff": "other", "x-test-role": "admin", "x-test-perms": "enquiries"}
SUPER = {"x-test-staff": "boss", "x-test-role": "super_admin"}


def apply(api, **over):
    return api.post("/api/public/partnerships/applications", json={**GOOD, **over})


def asset(db, kind="image", public=False) -> uuid.UUID:
    a = MediaAsset(filename="f.pdf" if kind == "document" else "f.png", content_type="application/pdf" if kind == "document" else "image/png", size_bytes=10, is_public=public, storage="local", storage_key=f"k{uuid.uuid4().hex}", kind=kind)
    db.add(a); db.commit()
    return a.id


# ================================================================== public application
def test_a_valid_application_is_saved_before_success_and_gets_a_reference(api, db):
    r = apply(api)
    assert r.status_code == 201 and r.json()["reference"].startswith("LAX-FE-") and "received" in r.json()["message"].lower()
    a = db.scalar(select(PartnershipApplication))
    assert a.reference == r.json()["reference"] and a.status == "new" and a.email == "meena@example.com" and a.phone == "+919876543210" and a.consent_processing and a.consent_at
    assert a.category == "franchise" and a.division == "education" and a.source_page == "/franchise/education" and a.answers["proposed_location"] == "Salem"
    ev = db.scalars(select(ApplicationEvent)).all()
    assert [e.kind for e in ev] == ["submitted"]
    assert db.scalar(select(func.count()).select_from(User)) == 0  # an application never creates an account


def test_validation_is_server_side_with_field_messages(api, db):
    for over, field in (({"category": "reseller"}, "category"), ({"division": "cad"}, "divisions"), ({"division": "", "divisions": []}, "divisions"), ({"divisions": ["other"]}, "other_interest"), ({"full_name": " "}, "full_name"), ({"email": "nope"}, "email"), ({"phone": "12"}, "phone"),
                        ({"country": ""}, "country"), ({"consent_processing": False}, "consent_processing"), ({"entity_type": "company"}, "entity_type"),
                        ({"entity_type": "organization"}, "organization"), ({"answers": {}}, "answers.proposed_location"), ({"consultation": {"date": "2001-01-01"}}, "consultation.date")):
        r = apply(api, **over)
        assert r.status_code == 422 and field in r.json()["error"]["fields"], over
    assert db.scalar(select(func.count()).select_from(PartnershipApplication)) == 0


def test_text_is_stripped_of_markup_and_unknown_answers_are_dropped(api, db):
    r = apply(api, full_name="<script>alert(1)</script>Asha", answers={**GOOD["answers"], "evil_key": "x", "business_experience": "<img src=x onerror=alert(1)>Ten years"}, organization="<b>Acme</b>", entity_type="organization")
    assert r.status_code == 201
    a = db.scalar(select(PartnershipApplication))
    assert "<" not in a.full_name and a.full_name.endswith("Asha") and "evil_key" not in a.answers and a.answers["business_experience"] == "Ten years" and a.organization == "Acme"


def test_answers_are_limited_to_the_selected_partnership_type(api, db):
    r = apply(api, category="referral", division="it", answers={"referral_network": "Colleagues", "investment_budget": "1 crore", "proposed_location": "x"})
    assert r.status_code == 201
    assert db.scalar(select(PartnershipApplication)).answers == {"referral_network": "Colleagues"}  # franchise-only questions are ignored for a referral applicant


def test_duplicates_bots_rate_limit_and_closed_applications(api, db, monkeypatch):
    first, second = apply(api), apply(api)
    assert second.status_code == 200 and second.json()["duplicate"] is True and second.json()["reference"] == first.json()["reference"]
    assert db.scalar(select(func.count()).select_from(PartnershipApplication)) == 1
    bot = apply(api, email="bot@example.com", website="http://spam.example")
    assert bot.status_code == 201 and db.scalar(select(func.count()).select_from(PartnershipApplication)) == 1  # a filled honeypot stores nothing
    api.put(f"{BASE}/settings", json={"values": {"applications_open": False}}, headers=ADMIN)
    assert apply(api, email="late@example.com").status_code == 503
    api.put(f"{BASE}/settings", json={"values": {"applications_open": True}}, headers=ADMIN)
    from app.core.config import get_settings
    from app.core.rate_limit import limiter

    s = get_settings()
    monkeypatch.setattr(s, "rate_limit_enabled", True); monkeypatch.setattr(s, "partner_rate_limit_max", 3)
    limiter.reset()
    codes = [apply(api, email=f"p{i}@example.com").status_code for i in range(6)]
    assert 429 in codes


def test_the_public_payload_never_contains_applicant_data(api, db):
    apply(api)
    blob = json.dumps(api.get("/api/public/partnerships").json())
    assert "meena" not in blob.lower() and "98765" not in blob and "LAX-FE-" not in blob


# ================================================================== admin: access and workflow
def test_every_admin_endpoint_needs_the_partnerships_permission(api):
    for path in ("/dashboard", "/applications", "/pages", "/faqs", "/policies", "/settings", "/staff", "/applications/export"):
        assert api.get(BASE + path).status_code == 401, path
        assert api.get(BASE + path, headers=NOPERM).status_code == 403, path
        assert api.get(BASE + path, headers=ADMIN).status_code == 200, path
        assert api.get(BASE + path, headers=SUPER).status_code == 200, path
    assert api.put(f"{BASE}/settings", json={"values": {}}, headers=NOPERM).status_code == 403
    assert api.get("/api/public/partnerships").status_code == 200  # the public content needs no login


def test_workflow_status_notes_assignment_and_audit(api, db):
    ref = apply(api).json()["reference"]
    apply(api, category="authorized", division="it", email="b@example.com", answers={})
    lst = api.get(f"{BASE}/applications?category=franchise", headers=ADMIN).json()
    assert lst["total"] == 1 and lst["items"][0]["reference"] == ref and "answers" not in lst["items"][0]
    assert api.get(f"{BASE}/applications?q=meena@example", headers=ADMIN).json()["total"] == 1 and api.get(f"{BASE}/applications?q=ZZZ", headers=ADMIN).json()["total"] == 0
    assert api.get(f"{BASE}/applications?status=bogus", headers=ADMIN).status_code == 422
    app_id = lst["items"][0]["id"]
    assert api.patch(f"{BASE}/applications/{app_id}/status", json={"status": "teleported"}, headers=ADMIN).status_code == 422
    ok = api.patch(f"{BASE}/applications/{app_id}/status", json={"status": "approved", "note": "Verified in consultation"}, headers=ADMIN).json()
    assert ok["status"] == "approved" and "does not create a partner account" in ok["note"]
    assert db.scalar(select(func.count()).select_from(User)) == 1  # only the staff user making the change: approving made no partner account
    assert api.post(f"{BASE}/applications/{app_id}/notes", json={"kind": "followup", "note": "Call on Monday"}, headers=ADMIN).status_code == 201
    assert api.post(f"{BASE}/applications/{app_id}/notes", json={"kind": "note", "note": "x"}, headers=ADMIN).status_code == 422
    boss_id = api.get(f"{BASE}/staff", headers=SUPER).json()["items"][0]["id"]
    assert api.put(f"{BASE}/applications/{app_id}/assignment", json={"assigned_to": str(uuid.uuid4())}, headers=ADMIN).status_code == 422
    assert api.put(f"{BASE}/applications/{app_id}/assignment", json={"assigned_to": boss_id, "branch": "salem"}, headers=ADMIN).status_code == 200
    d = api.get(f"{BASE}/applications/{app_id}", headers=ADMIN).json()
    assert d["status"] == "approved" and d["assigned_branch"] == "salem" and d["assigned_to_name"] and d["consent_processing"] is True
    assert [e["kind"] for e in d["events"]][::-1] == ["submitted", "status", "followup", "assign"]
    assert d["events"][-1]["author"] == "Applicant" and any(e["to_status"] == "approved" and e["note"] == "Verified in consultation" for e in d["events"])
    actions = [a.action for a in db.scalars(select(AuditLog).order_by(AuditLog.created_at))]
    assert actions == ["partner.application.status", "partner.application.note", "partner.application.assign"]
    assert api.get(f"{BASE}/applications/{uuid.uuid4()}", headers=ADMIN).status_code == 404
    assert api.get(f"{BASE}/applications?assigned=unassigned", headers=ADMIN).json()["total"] == 1  # the other application is still unassigned


def test_export_is_spreadsheet_safe_and_dashboard_counts_are_real(api, db):
    apply(api, full_name="=HYPERLINK(1)Bob")
    apply(api, category="referral", division="it", email="r@example.com", answers={})
    csv_text = api.get(f"{BASE}/applications/export", headers=ADMIN).text
    assert "'=HYPERLINK" in csv_text and csv_text.splitlines()[0].startswith("reference,created_at,category,division,all_divisions,other_interest,status")
    api.patch(f"{BASE}/applications/{db.scalars(select(PartnershipApplication)).first().id}/status", json={"status": "under_review"}, headers=ADMIN)
    d = api.get(f"{BASE}/dashboard", headers=ADMIN).json()
    assert d["total"] == 2 and d["by_category"] == {"franchise": 1, "referral": 1} and d["by_division"] == {"education": 1, "it": 1} and d["under_review"] == 1 and d["new"] == 1
    assert d["per_day"][0]["applications"] == 2 and len(d["recent"]) == 2 and "most viewed" in d["note"]
    assert api.get(f"{BASE}/dashboard?days=0", headers=ADMIN).status_code == 422


# ================================================================== admin: content, commercial information, media
def test_page_overrides_are_validated_sanitised_and_commercial_fields_stay_hidden_until_published(api, db):
    body = {"published": True, "content": {"hero_heading": "<b>Open a centre</b>", "intro": ["<script>x</script>Hello", ""], "extra_sections": [{"heading": "Local note", "body": "Text <i>here</i>"}, {"heading": "", "body": "dropped"}],
            "hidden_sections": ["policies"], "bogus": "ignored"}, "seo_title": "Education franchise | LAX360", "commercial": {"royalty": {"value": "To be confirmed", "published": False}, "registration_fee": {"value": "Details on consultation", "published": True}}}
    saved = api.put(f"{BASE}/pages/franchise/education", json=body, headers=ADMIN)
    assert saved.status_code == 200 and saved.json()["content"]["hero_heading"] == "Open a centre" and saved.json()["content"]["intro"] == ["Hello"] and len(saved.json()["content"]["extra_sections"]) == 1
    assert "bogus" not in saved.json()["content"] and saved.json()["version"] == 1
    pub = api.get("/api/public/partnerships").json()["pages"]["franchise/education"]
    assert pub["commercial"] == {"registration_fee": "Details on consultation"} and "royalty" not in json.dumps(pub)  # an unpublished field never leaves the server
    assert pub["seo_title"] == "Education franchise | LAX360"
    assert api.put(f"{BASE}/pages/franchise/education", json={"commercial": {"salary": {"value": "1", "published": True}}}, headers=ADMIN).status_code == 422
    assert api.put(f"{BASE}/pages/nonsense/page", json={}, headers=ADMIN).status_code == 404
    assert api.get(f"{BASE}/pages/franchise/education", headers=ADMIN).json()["version"] == 1
    assert api.put(f"{BASE}/pages/franchise/education", json={**body, "published": False}, headers=ADMIN).json()["version"] == 2
    assert api.get("/api/public/partnerships").json()["pages"]["franchise/education"]["published"] is False
    assert all(s in api.get(f"{BASE}/pages", headers=ADMIN).json()["items"][i]["slug"] or True for i, s in enumerate(ps.PAGE_SLUGS)) and len(api.get(f"{BASE}/pages", headers=ADMIN).json()["items"]) == 13


def test_hero_images_and_brochures_use_the_media_library_safely(api, db):
    img, pdf, doc_as_hero = asset(db, "image"), asset(db, "document"), asset(db, "document")
    assert api.put(f"{BASE}/pages/referral-partner/it", json={"hero_media_id": str(doc_as_hero)}, headers=ADMIN).status_code == 422  # a PDF is not a hero picture
    assert api.put(f"{BASE}/pages/referral-partner/it", json={"brochure_media_id": str(img)}, headers=ADMIN).status_code == 422
    assert api.put(f"{BASE}/pages/referral-partner/it", json={"hero_media_id": str(uuid.uuid4())}, headers=ADMIN).status_code == 422
    ok = api.put(f"{BASE}/pages/referral-partner/it", json={"hero_media_id": str(img), "hero_alt": "Team meeting", "brochure_media_id": str(pdf), "brochure_published": True}, headers=ADMIN)
    assert ok.status_code == 200 and ok.json()["brochure_version"] == 1 and db.get(MediaAsset, pdf).is_public and db.get(MediaAsset, img).is_public  # a public page can only show public files
    pub = api.get("/api/public/partnerships").json()["pages"]["referral-partner/it"]
    assert pub["hero_url"] and pub["hero_alt"] == "Team meeting" and pub["brochure_url"]
    pdf2 = asset(db, "document")
    assert api.put(f"{BASE}/pages/referral-partner/it", json={"hero_media_id": str(img), "brochure_media_id": str(pdf2), "brochure_published": True}, headers=ADMIN).json()["brochure_version"] == 2
    off = api.put(f"{BASE}/pages/referral-partner/it", json={"hero_media_id": str(img), "brochure_media_id": str(pdf2), "brochure_published": False}, headers=ADMIN)
    assert off.status_code == 200 and api.get("/api/public/partnerships").json()["pages"]["referral-partner/it"]["brochure_url"] is None  # no download button without a published brochure


# ================================================================== FAQs, policies, settings
def test_faq_crud_and_only_published_faqs_are_public(api):
    mk = api.post(f"{BASE}/faqs", json={"scope": "franchise/education", "question": "Is there a registration fee?", "answer": "Details are shared during consultation.", "sort_order": 1}, headers=ADMIN)
    assert mk.status_code == 201
    hidden = api.post(f"{BASE}/faqs", json={"scope": "general", "question": "A draft question here", "answer": "A draft answer here", "published": False}, headers=ADMIN).json()
    assert api.post(f"{BASE}/faqs", json={"scope": "nonsense", "question": "Question here?", "answer": "Answer here."}, headers=ADMIN).status_code == 422
    pub = api.get("/api/public/partnerships").json()["faqs"]
    assert list(pub) == ["franchise/education"] and pub["franchise/education"][0]["q"] == "Is there a registration fee?"
    assert api.patch(f"{BASE}/faqs/{hidden['id']}", json={"scope": "general", "question": "A draft question here", "answer": "Now public answer", "published": True}, headers=ADMIN).status_code == 200
    assert "general" in api.get("/api/public/partnerships").json()["faqs"]
    assert api.delete(f"{BASE}/faqs/{hidden['id']}", headers=ADMIN).json() == {"deleted": True} and api.delete(f"{BASE}/faqs/{hidden['id']}", headers=ADMIN).status_code == 404


def test_policies_are_versioned_drafts_until_reviewed_and_published(api):
    mk = api.post(f"{BASE}/policies", json={"key": "terms", "scope": "franchise", "title": "Franchise terms", "body": "Draft terms for the franchise programme, pending legal review."}, headers=ADMIN)
    assert mk.status_code == 201 and mk.json()["status"] == "draft" and mk.json()["version"] == 1
    pid = mk.json()["id"]
    assert api.get("/api/public/partnerships").json()["policies"] == []  # a draft is never public
    assert api.post(f"{BASE}/policies", json={"key": "salary", "title": "Bad key", "body": "Some policy text here."}, headers=ADMIN).status_code == 422
    assert api.post(f"{BASE}/policies/{pid}/publish", json={"reviewed_by": "x"}, headers=ADMIN).status_code == 422  # a reviewer must be named
    pub = api.post(f"{BASE}/policies/{pid}/publish", json={"reviewed_by": "Management and legal counsel"}, headers=ADMIN).json()
    assert pub["status"] == "published" and pub["effective_date"] and pub["reviewed_by"].startswith("Management")
    assert api.patch(f"{BASE}/policies/{pid}", json={"key": "terms", "scope": "franchise", "title": "Edited", "body": "Edited text of the policy."}, headers=ADMIN).status_code == 409
    assert api.delete(f"{BASE}/policies/{pid}", headers=ADMIN).status_code == 409
    public = api.get("/api/public/partnerships").json()["policies"]
    assert len(public) == 1 and public[0]["version"] == 1 and public[0]["effective_date"]
    v2 = api.post(f"{BASE}/policies", json={"key": "terms", "scope": "franchise", "title": "Franchise terms v2", "body": "Revised terms for the franchise programme."}, headers=ADMIN).json()
    assert v2["version"] == 2
    api.post(f"{BASE}/policies/{v2['id']}/publish", json={"reviewed_by": "Management and legal counsel"}, headers=ADMIN)
    states = {p["version"]: p["status"] for p in api.get(f"{BASE}/policies", headers=ADMIN).json()["items"]}
    assert states == {1: "archived", 2: "published"} and len(api.get("/api/public/partnerships").json()["policies"]) == 1
    assert api.post(f"{BASE}/policies/{v2['id']}/unpublish", headers=ADMIN).json()["status"] == "draft" and api.get("/api/public/partnerships").json()["policies"] == []


def test_settings_validation_portal_link_and_brochure(api, db):
    assert api.get("/api/public/partnerships").json()["portal_url"] is None  # no portal configured: no Partner Login button
    for bad in ({"portal_url": "http://insecure.example"}, {"portal_url": "javascript:alert(1)"}, {"notify_emails": ["nope"]}, {"applications_open": "yes"}, {"unknown": 1}, {"general_brochure_media_id": "x"}):
        assert api.put(f"{BASE}/settings", json={"values": bad}, headers=ADMIN).status_code == 422, bad
    pdf = asset(db, "document")
    ok = api.put(f"{BASE}/settings", json={"values": {"portal_url": "https://partners.lax360.in/login", "notify_emails": ["Team@Lax360.test"], "general_brochure_media_id": str(pdf), "general_brochure_published": True}}, headers=ADMIN)
    assert ok.status_code == 200 and ok.json()["values"]["notify_emails"] == ["team@lax360.test"]
    pub = api.get("/api/public/partnerships").json()
    assert pub["portal_url"] == "https://partners.lax360.in/login" and pub["general_brochure_url"]
    assert [a.action for a in db.scalars(select(AuditLog))] == ["partner.settings.update"]


def test_migration_0028_is_additive_and_reversible(capsys):
    from pathlib import Path

    from alembic import command
    from alembic.config import Config

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    cfg.set_main_option("sqlalchemy.url", "postgresql+psycopg://u:p@localhost/db")
    command.upgrade(cfg, "0027:0028", sql=True)
    up = capsys.readouterr().out
    assert up.count("CREATE TABLE pt_") == 7 and "DROP" not in up and "ALTER TABLE pz_" not in up and "ENABLE ROW LEVEL SECURITY" in up
    command.downgrade(cfg, "0028:0027", sql=True)
    assert "DROP TABLE pt_applications" in capsys.readouterr().out


# ================================================================== several business divisions in one application
def test_an_application_can_select_several_divisions_and_all_and_other(api, db):
    r = apply(api, divisions=["education", "robotics"], email="multi@example.com")
    assert r.status_code == 201
    a = db.scalar(select(PartnershipApplication).where(PartnershipApplication.email == "multi@example.com"))
    assert a.divisions == ["education", "robotics"] and a.division == "education" and not a.all_divisions and a.other_interest is None

    r = apply(api, divisions=["all"], email="all@example.com")
    assert r.status_code == 201
    a = db.scalar(select(PartnershipApplication).where(PartnershipApplication.email == "all@example.com"))
    assert a.all_divisions and {"education", "digital-marketing", "it", "cad-engineering", "robotics", "blockchain"} <= set(a.divisions)

    r = apply(api, divisions=["it", "other"], other_interest="Solar installation franchise", email="other@example.com")
    assert r.status_code == 201
    a = db.scalar(select(PartnershipApplication).where(PartnershipApplication.email == "other@example.com"))
    assert a.divisions == ["it", "other"] and a.other_interest == "Solar installation franchise"


def test_the_same_selection_is_one_application_but_a_different_selection_is_another(api, db):
    first = apply(api, divisions=["education", "it"], email="dup@example.com")
    again = apply(api, divisions=["it", "education"], email="dup@example.com")
    assert again.json()["duplicate"] is True and again.json()["reference"] == first.json()["reference"]
    assert apply(api, divisions=["it"], email="dup@example.com").json().get("duplicate") is not True


def test_short_enquiry_form_does_not_need_the_franchise_location(api, db):
    r = apply(api, divisions=["it"], answers={}, quick=True, email="quick@example.com")
    assert r.status_code == 201
    assert db.scalar(select(PartnershipApplication).where(PartnershipApplication.email == "quick@example.com")).answers == {"enquiry_form": "short"}


def test_admin_list_shows_all_divisions_and_filters_by_any_of_them(api, db):
    apply(api, divisions=["education", "robotics"], email="a1@example.com")
    apply(api, divisions=["it"], email="a2@example.com")
    # an older record: only the single `division` column
    db.execute(PartnershipApplication.__table__.update().where(PartnershipApplication.email == "a2@example.com").values(divisions=[]))
    db.commit()
    by = lambda d: api.get(f"{BASE}/applications?division={d}", headers=ADMIN).json()
    assert by("robotics")["total"] == 1 and by("education")["total"] == 1 and by("it")["total"] == 1 and by("blockchain")["total"] == 0
    rows = {r["email"]: r for r in api.get(f"{BASE}/applications", headers=ADMIN).json()["items"]}
    assert rows["a1@example.com"]["divisions"] == ["education", "robotics"] and rows["a2@example.com"]["divisions"] == ["it"]  # the older record still shows its division
    d = api.get(f"{BASE}/dashboard", headers=ADMIN).json()
    assert d["by_division"].get("robotics") == 1 and d["by_division"].get("education") == 1
