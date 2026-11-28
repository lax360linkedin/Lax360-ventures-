"""Google Sheets through the real endpoints (needs the throwaway PostgreSQL): every form lands in the worksheet of its category, alongside the database. A fake Google server stands in for the API.
Routing, columns, multi-division values, the copy log and the admin-managed names are also covered without PostgreSQL in test_sheets_routing.py."""

import json
import re

import httpx
import pytest
from sqlalchemy import select

from app.models import ContactEnquiry, DemoRequest
from app.enquiry_categories import DEFAULT_TABS
from app.services import sheets_service as ss
from tests.admin_helpers import enquiry_payload
from tests.conftest import branch_id, login, make_user
from tests.test_demo_requests import payload as demo_payload

SHEET = "sheet-test-id"


class FakeGoogle:
    """Just enough of the Sheets v4 REST API: list tabs, add a tab, read / write a range, append a row."""

    def __init__(self, tabs=None):
        self.tabs = {k: [list(r) for r in v] for k, v in (tabs or {}).items()}
        self.calls = []
        self.fail_append = False

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path.removeprefix(f"/v4/spreadsheets/{SHEET}")
        self.calls.append((request.method, path))
        assert request.headers["authorization"] == "Bearer test-token"
        tab = lambda p: re.search(r"/values/'((?:[^']|'')+)'!", p).group(1).replace("''", "'")  # noqa: E731
        if request.method == "GET" and path == "":
            return httpx.Response(200, json={"sheets": [{"properties": {"title": t}} for t in self.tabs]})
        if request.method == "POST" and path == ":batchUpdate":
            for r in json.loads(request.content)["requests"]:
                self.tabs.setdefault(r["addSheet"]["properties"]["title"], [])
            return httpx.Response(200, json={})
        if request.method == "GET" and re.search(r"!A1:[A-Z]+1$", path):  # the header row (the service reads as many columns as the widest worksheet has)
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
def sheet(monkeypatch, env):
    fake = FakeGoogle()
    monkeypatch.setattr(ss, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    monkeypatch.setattr(ss, "_access_token", lambda settings: "test-token")
    ss._ensured.clear()
    env(GOOGLE_SHEETS_SPREADSHEET_ID=SHEET, GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account"}')
    return fake


def cell(sheet, key, name, row=1):
    tab = sheet.tabs[DEFAULT_TABS[key]]
    return tab[row][tab[0].index(name)]


def test_all_worksheets_and_headers_are_created_and_a_contact_enquiry_lands_in_its_category(sheet, client, db):
    r = client.post("/api/contact", json=enquiry_payload(name="Grace Hopper", company="COBOL Co", source="contact"))
    assert r.status_code == 201
    assert set(sheet.tabs) == set(DEFAULT_TABS.values())  # one worksheet per enquiry category, inside the same spreadsheet
    assert sheet.tabs[DEFAULT_TABS["it_software"]][0] == ss.headers_of("it_software") and sheet.tabs[DEFAULT_TABS["course"]][0] == ss.headers_of("course")
    assert cell(sheet, "it_software", "Enquiry ID") == r.json()["id"] and cell(sheet, "it_software", "Full Name") == "Grace Hopper" and cell(sheet, "it_software", "Organization Name") == "COBOL Co"
    assert cell(sheet, "it_software", "Enquiry Type") == "Software project" and cell(sheet, "it_software", "Source Page") == "contact" and cell(sheet, "it_software", "Enquiry Status") == "new"
    assert re.match(r"\d{4}-\d\d-\d\d$", cell(sheet, "it_software", "Submission Date")) and re.match(r"\d\d:\d\d:\d\d$", cell(sheet, "it_software", "Submission Time"))
    assert all(len(sheet.tabs[t]) == 1 for k, t in DEFAULT_TABS.items() if k != "it_software")  # nothing in the other worksheets
    assert db.scalar(select(ContactEnquiry.sheets_synced_at)) is not None  # marked as in the sheet; the database copy is kept as always


def test_partnership_enquiries_go_to_their_program_worksheet_only(sheet, client):
    extra = {"partnership_category": "Franchise Opportunities", "business_division": "Software & IT Services", "city": "Madurai", "state": "Tamil Nadu", "investment_capacity": "10 lakh"}
    assert client.post("/api/contact", json=enquiry_payload(enquiry_type="partner-franchise", message="We want a franchise in our city please.", extra=extra, source="our-network")).status_code == 201
    assert cell(sheet, "franchise", "Selected Business Divisions") == "Software & IT Services" and cell(sheet, "franchise", "City") == "Madurai" and cell(sheet, "franchise", "Investment Budget") == "10 lakh"
    assert len(sheet.tabs[DEFAULT_TABS["it_software"]]) == 1  # not also in the software worksheet
    assert client.post("/api/contact", json=enquiry_payload(email="p@example.com", enquiry_type="partner-reseller", message="We resell software and would like to partner.")).status_code == 201
    assert len(sheet.tabs[DEFAULT_TABS["authorized"]]) == 2


def test_a_demo_request_lands_in_consultation_requests(sheet, client, db):
    make_user(db, email="cust@example.com")
    csrf = login(client, "cust@example.com")
    r = client.post("/api/demo-requests", json=demo_payload(branch_id=branch_id(client, "Salem"), company="Acme", interest="CRM"), headers=csrf)
    assert r.status_code == 201
    assert cell(sheet, "consultation", "Enquiry ID") == r.json()["id"] and cell(sheet, "consultation", "Full Name") == "Ada Lovelace" and cell(sheet, "consultation", "Enquiry Type") == "Demo request"
    assert db.scalar(select(DemoRequest.sheets_synced_at)) is not None


def test_existing_tabs_headers_and_data_are_never_overwritten(monkeypatch, env, client):
    tab = DEFAULT_TABS["it_software"]
    fake = FakeGoogle({tab: [["My own header", "Anything"], ["old row 1"], ["old row 2"]], "Notes": [["keep me"]]})
    monkeypatch.setattr(ss, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    monkeypatch.setattr(ss, "_access_token", lambda settings: "test-token")
    ss._ensured.clear()
    env(GOOGLE_SHEETS_SPREADSHEET_ID=SHEET, GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account"}')
    client.post("/api/contact", json=enquiry_payload())
    assert fake.tabs[tab][:3] == [["My own header", "Anything"], ["old row 1"], ["old row 2"]] and len(fake.tabs[tab]) == 4  # the new row is appended after the old data
    assert fake.tabs["Notes"] == [["keep me"]] and DEFAULT_TABS["course"] in fake.tabs  # other worksheets untouched; the missing ones were added


def test_a_repeated_submission_is_one_row_and_formula_text_is_stored_literally(sheet, client):
    body = enquiry_payload(message="=HYPERLINK(\"http://evil\",\"click\") please call me")
    assert client.post("/api/contact", json=body).status_code == 201
    assert client.post("/api/contact", json=body).status_code == 200  # the form's own duplicate guard: stored once ...
    assert len(sheet.tabs[DEFAULT_TABS["it_software"]]) == 2  # ... and sent once
    assert cell(sheet, "it_software", "Message").startswith("=HYPERLINK")  # written RAW: Google stores it as text and never evaluates it


def test_a_failed_append_never_breaks_the_submission_and_is_retried_without_duplicates(sheet, client, db):
    sheet.fail_append = True
    r = client.post("/api/contact", json=enquiry_payload())
    assert r.status_code == 201  # the visitor is not affected
    assert db.scalar(select(ContactEnquiry.sheets_synced_at)) is None and len(sheet.tabs[DEFAULT_TABS["it_software"]]) == 1  # saved in the database, marked "not in the sheet yet"
    sheet.fail_append = False
    assert ss.sync_pending() == {"configured": True, "synced": 1, "failed": 0}
    assert len(sheet.tabs[DEFAULT_TABS["it_software"]]) == 2 and ss.sync_pending()["synced"] == 0


def test_without_google_settings_nothing_is_sent_and_the_website_works_as_before(monkeypatch, client, db):
    calls = []
    monkeypatch.setattr(ss, "_client", lambda: calls.append(1) or httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500))))
    assert client.post("/api/contact", json=enquiry_payload()).status_code == 201 and calls == []
    assert db.scalar(select(ContactEnquiry.id)) is not None
