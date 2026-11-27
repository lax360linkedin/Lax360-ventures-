"""Google Sheets worksheets per enquiry category: routing, headers, multi-division values, the copy log, retries and the admin-managed worksheet names.
Runs on in-memory SQLite with a fake Google server (no network, no credentials)."""

import json
import re
import uuid
from datetime import date

import httpx
import pytest
from pydantic import SecretStr
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.base import Base
from app.enquiry_categories import DEFAULT_TABS, KEYS, contact_category
from app.models import ContactEnquiry, DemoRequest, EnquiryFollowup, PartnershipApplication, SheetSync
from app.services import partnership_service as ps
from app.services import sheets_service as ss
from tests.test_partnerships import TABLES

SHEET = "sheet-routing-id"


class FakeGoogle:
    def __init__(self, tabs=None):
        self.tabs = {k: [list(r) for r in v] for k, v in (tabs or {}).items()}
        self.fail_append = False

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path.removeprefix(f"/v4/spreadsheets/{SHEET}")
        tab = lambda p: re.search(r"/values/'((?:[^']|'')+)'!", p).group(1).replace("''", "'")  # noqa: E731
        if request.method == "GET" and path == "":
            return httpx.Response(200, json={"sheets": [{"properties": {"title": t}} for t in self.tabs]})
        if request.method == "POST" and path == ":batchUpdate":
            for r in json.loads(request.content)["requests"]:
                self.tabs.setdefault(r["addSheet"]["properties"]["title"], [])
            return httpx.Response(200, json={})
        if request.method == "GET" and "!A1:" in path:
            rows = self.tabs.get(tab(path), [])
            return httpx.Response(200, json={"values": rows[:1]} if rows else {})
        if request.method == "GET" and path.endswith("!A:A"):
            return httpx.Response(200, json={"values": [[r[0]] for r in self.tabs.get(tab(path), []) if r]})
        if request.method == "PUT" and "!A1" in path:
            body = json.loads(request.content)["values"]
            self.tabs[tab(path)] = [body[0]] + self.tabs.get(tab(path), [])[1:]
            return httpx.Response(200, json={})
        if request.method == "POST" and path.endswith(":append"):
            if self.fail_append:
                return httpx.Response(503, json={"error": {"message": "backend error"}})
            self.tabs.setdefault(tab(path), []).append(json.loads(request.content)["values"][0])
            return httpx.Response(200, json={})
        return httpx.Response(404, json={"error": {"message": "not found"}})


@pytest.fixture
def env(monkeypatch):
    engine = create_engine("sqlite+pysqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine, tables=[*TABLES, ContactEnquiry.__table__, DemoRequest.__table__, SheetSync.__table__, EnquiryFollowup.__table__])
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    fake = FakeGoogle()
    settings = get_settings()
    monkeypatch.setattr(settings, "google_sheets_spreadsheet_id", SHEET)
    monkeypatch.setattr(settings, "google_service_account_json", SecretStr('{"type": "service_account"}'))
    monkeypatch.setattr(ss, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    monkeypatch.setattr(ss, "_access_token", lambda s: "test-token")
    monkeypatch.setattr(ss, "_factory", lambda: factory)
    ss._ensured.clear()
    with factory() as db:
        yield fake, db, factory
    engine.dispose()


def enquiry(db, **kw):
    e = ContactEnquiry(name="Grace Hopper", email="grace@example.com", phone="+919566679928", company="COBOL Co", enquiry_type="project", subject="Software project", message="Please call me about a project.",
                       extra={}, consented=True, source="contact", status="new", fingerprint=uuid.uuid4().hex)
    for k, v in kw.items():
        setattr(e, k, v)
    db.add(e); db.commit()
    return e


def application(db, **kw):
    a = PartnershipApplication(reference=f"LAX-{uuid.uuid4().hex[:8]}", category="referral", division="education", divisions=["education"], full_name="Meena Kumar", email="m@example.com", phone="+919876543210",
                               country="India", city="Salem", state="Tamil Nadu", answers={}, consultation={}, consent_processing=True, fingerprint=uuid.uuid4().hex, status="new")
    for k, v in kw.items():
        setattr(a, k, v)
    db.add(a); db.commit()
    return a


def test_there_is_a_worksheet_with_its_own_headers_for_every_category():
    assert set(DEFAULT_TABS) == set(KEYS) and len(KEYS) == 13 and len(set(DEFAULT_TABS.values())) == 13
    assert ss.headers_of("course")[:6] == ["Enquiry ID", "Submission Date", "Submission Time", "Full Name", "Email Address", "Mobile Number"]
    assert "Selected Business Divisions" in ss.headers_of("franchise") and "Investment Budget" in ss.headers_of("franchise") and "Investment Budget" not in ss.headers_of("referral")
    assert "Selected Course" in ss.headers_of("course") and "Selected Course" not in ss.headers_of("franchise")
    assert "Consultation Date" in ss.headers_of("consultation") and "Other Business Interests" in ss.headers_of("upcoming")


def test_contact_enquiries_are_routed_by_type_and_the_intro_card_by_its_source():
    assert contact_category("project", "contact") == "it_software" and contact_category("marketing", None) == "digital_marketing" and contact_category("course", "contact") == "course"
    assert contact_category("workshop", None) == "education" and contact_category("career", None) == "other" and contact_category("career", None, "I want an internship") == "internship" and contact_category("upcoming-interest", None) == "upcoming"
    assert contact_category("partner-franchise", None) == "franchise" and contact_category("partner-authorised", None) == "authorized" and contact_category("general", "welcome-card") == "intro"
    assert contact_category("something-new", None) == "other"


def test_each_enquiry_lands_in_its_own_worksheet_with_the_right_columns(env):
    fake, db, _ = env
    e = enquiry(db, enquiry_type="course", subject="Course enquiry", extra={"course": "Python", "mode": "Online", "status": "Student"})
    ss.sync_record("enquiry", e.id)
    tab = DEFAULT_TABS["course"]
    head, row = fake.tabs[tab][0], fake.tabs[tab][1]
    cell = lambda name: row[head.index(name)]  # noqa: E731
    assert cell("Enquiry ID") == str(e.id) and cell("Full Name") == "Grace Hopper" and cell("Selected Course") == "Python" and cell("Organization Name") == "COBOL Co"
    assert "mode: Online" in cell("Additional Details") and cell("Source Page") == "contact" and cell("Enquiry Status") == "new" and re.match(r"\d{4}-\d\d-\d\d$", cell("Submission Date"))
    intro = enquiry(db, enquiry_type="general", subject="Something else", source="welcome-card", email="i@example.com")
    ss.sync_record("enquiry", intro.id)
    assert len(fake.tabs[DEFAULT_TABS["intro"]]) == 2 and len(fake.tabs[tab]) == 2  # the intro card has its own worksheet; the course worksheet is unchanged
    assert db.scalar(select(ContactEnquiry.sheets_synced_at).where(ContactEnquiry.id == e.id)) is not None


def test_a_multi_division_application_is_recorded_accurately_and_copied_to_upcoming_and_consultation(env):
    fake, db, _ = env
    a = application(db, category="franchise", divisions=["education", "robotics", "other"], other_interest="Solar franchise", answers={"proposed_location": "Madurai", "investment_budget": "To be discussed"},
                    consultation={"date": date.today().isoformat(), "time": "11:00 AM", "method": "phone", "mode": "online", "message": "Call me please"})
    ss.sync_record("application", a.id)
    f = fake.tabs[DEFAULT_TABS["franchise"]]
    cell = lambda name: f[1][f[0].index(name)]  # noqa: E731
    assert cell("Partnership Type") == "Franchise Opportunities" and cell("Selected Business Divisions") == "Education; Robotics" and cell("Other Business Interests") == "Solar franchise"
    assert cell("Preferred Location") == "Madurai" and cell("Investment Budget") == "To be discussed" and cell("City") == "Salem" and cell("Message") == "Call me please"
    up = fake.tabs[DEFAULT_TABS["upcoming"]]
    assert up[1][up[0].index("Products or Services")] == "Robotics"  # only the upcoming service, in the Upcoming Services worksheet
    cons = fake.tabs[DEFAULT_TABS["consultation"]]
    assert cons[1][cons[0].index("Consultation Time")] == "11:00 AM" and cons[1][cons[0].index("Meeting Mode")] == "online"
    assert db.scalar(select(PartnershipApplication.sheets_synced_at)) is not None and {s.category for s in db.scalars(select(SheetSync))} == {"franchise", "upcoming", "consultation"}


def test_all_business_divisions_is_recorded_as_such(env):
    fake, db, _ = env
    a = application(db, category="authorized", all_divisions=True, divisions=["education", "digital-marketing", "it", "cad-engineering", "robotics", "blockchain"])
    ss.sync_record("application", a.id)
    tab = fake.tabs[DEFAULT_TABS["authorized"]]
    value = tab[1][tab[0].index("Selected Business Divisions")]
    assert value.startswith("All Business Divisions: ") and "IT & Software" in value and "Blockchain" in value


def test_a_failed_copy_is_logged_without_breaking_anything_and_retried_without_duplicates(env):
    fake, db, factory = env
    e = enquiry(db)
    fake.fail_append = True
    ss.sync_record("enquiry", e.id)  # never raises
    log = db.scalar(select(SheetSync))
    db.refresh(log)
    assert log.status == "failed" and log.attempts == 1 and "503" in (log.last_error or "") and "token" not in (log.last_error or "").lower()
    assert db.scalar(select(ContactEnquiry.sheets_synced_at)) is None
    fake.fail_append = False
    assert ss.sync_pending() == {"configured": True, "synced": 1, "failed": 0}
    rows = fake.tabs[DEFAULT_TABS["it_software"]]
    assert len(rows) == 2  # header + the one row
    db.expire_all()
    assert db.scalar(select(SheetSync)).status == "synced" and ss.sync_pending()["synced"] == 0
    # the "synced" marks are lost: the id is found in the worksheet, so it is not appended again
    db.execute(SheetSync.__table__.update().values(status="failed"))
    db.execute(ContactEnquiry.__table__.update().values(sheets_synced_at=None))
    db.commit()
    assert ss.sync_pending()["synced"] == 1 and len(fake.tabs[DEFAULT_TABS["it_software"]]) == 2


def test_existing_worksheets_and_headers_are_kept(env):
    fake, db, _ = env
    fake.tabs[DEFAULT_TABS["it_software"]] = [["My own header"], ["old row"]]
    fake.tabs["Notes"] = [["keep me"]]
    e = enquiry(db)
    ss.sync_record("enquiry", e.id)
    assert fake.tabs[DEFAULT_TABS["it_software"]][:2] == [["My own header"], ["old row"]] and len(fake.tabs[DEFAULT_TABS["it_software"]]) == 3 and fake.tabs["Notes"] == [["keep me"]]


def test_worksheet_names_and_switches_are_managed_in_the_admin_and_validated(env):
    fake, db, _ = env
    ss.save_tab_config(db, {"it_software": {"name": "Software Leads", "enabled": True}, "general": {"name": "General", "enabled": False}}, None)
    db.commit()
    cfg = ss.tab_config(db)
    assert cfg["it_software"]["name"] == "Software Leads" and cfg["general"]["enabled"] is False and cfg["course"]["name"] == DEFAULT_TABS["course"]
    e = enquiry(db)
    ss.sync_record("enquiry", e.id)
    assert "Software Leads" in fake.tabs and DEFAULT_TABS["it_software"] not in fake.tabs and DEFAULT_TABS["general"] not in fake.tabs  # renamed worksheet used; a disabled one is not even created
    g = enquiry(db, enquiry_type="general", email="g@example.com")
    ss.sync_record("enquiry", g.id)
    assert DEFAULT_TABS["general"] not in fake.tabs and db.scalar(select(ContactEnquiry.sheets_synced_at).where(ContactEnquiry.id == g.id)) is not None  # nothing to copy counts as done
    with pytest.raises(ValueError):
        ss.save_tab_config(db, {"course": {"name": "Same", "enabled": True}, "education": {"name": "same", "enabled": True}}, None)
    with pytest.raises(ValueError):
        ss.save_tab_config(db, {"course": {"name": "Bad/Name", "enabled": True}}, None)
    status = ss.admin_status(db, get_settings())
    assert status["configured"] and len(status["tabs"]) == 13 and "…" in status["spreadsheet"] and "service_account" in status and all("private_key" not in json.dumps(t) for t in status["tabs"])


def test_a_demo_request_goes_to_consultation_requests(env):
    fake, db, _ = env
    d = DemoRequest(name="Ada Lovelace", email="ada@example.com", company="Acme", interest="CRM", preferred_date=date.today(), message="Demo please", status="pending", fingerprint=uuid.uuid4().hex)
    db.add(d); db.commit()
    ss.sync_record("demo", d.id)
    tab = fake.tabs[DEFAULT_TABS["consultation"]]
    assert tab[1][tab[0].index("Full Name")] == "Ada Lovelace" and tab[1][tab[0].index("Consultation Date")] == date.today().isoformat()


def test_enquiry_center_counts_every_form_by_category_and_the_admin_list_filters_by_category(env):
    from app.api.routes import admin_enquiry_center as center
    from app.services import enquiry_admin_service as svc

    fake, db, _ = env
    enquiry(db, enquiry_type="course", extra={"course": "Python"}, email="c@example.com")
    enquiry(db, enquiry_type="general", source="welcome-card", email="i@example.com")
    enquiry(db, enquiry_type="upcoming-interest", extra={"service": "Robotics Solutions"}, email="u@example.com")
    application(db, category="franchise", divisions=["it", "robotics"], consultation={"date": date.today().isoformat()})
    out = center.overview(None, db)
    by = {c["key"]: c for c in out["categories"]}
    assert len(out["categories"]) == 13 and by["course"]["total"] == 1 and by["intro"]["total"] == 1 and by["upcoming"]["total"] == 2  # the interest form and the application naming Robotics
    assert by["franchise"]["total"] == 1 and by["consultation"]["total"] == 1 and out["totals"]["submissions"] == 4 and by["course"]["new"] == 1
    assert [c["key"] for c in center.categories(None)] == KEYS
    kw = dict(q=None, status=None, date_from=None, date_to=None, archived="no", assigned_to=None)
    rows, total = svc.search(db, category="intro", **kw)
    assert total == 1 and rows[0].source == "welcome-card"
    assert svc.search(db, category="general", **kw)[1] == 0  # the intro card is not also a general enquiry
    assert svc.search(db, category="course", **kw)[1] == 1 and svc.search(db, course="Python", **kw)[1] == 1 and svc.search(db, source="contact", **kw)[1] == 2
