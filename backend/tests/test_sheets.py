"""Google Sheets: every enquiry, demo request and franchise application is appended to the right tab of ONE spreadsheet, alongside the database. A fake Google server stands in for the API."""

import json
import re

import httpx
import pytest
from sqlalchemy import select

from app.models import ContactEnquiry, DemoRequest
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
        if request.method == "GET" and path.endswith("!A1:Z1"):
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


def test_the_three_tabs_and_headers_are_created_and_a_contact_enquiry_lands_in_enquiries(sheet, client, db):
    r = client.post("/api/contact", json=enquiry_payload(name="Grace Hopper", company="COBOL Co", source="contact"))
    assert r.status_code == 201
    assert set(sheet.tabs) == {"Enquiries", "Demo Requests", "Franchise Requests"}  # three tabs inside the same spreadsheet
    assert sheet.tabs["Enquiries"][0] == ss.ENQUIRY_HEADERS and sheet.tabs["Demo Requests"][0] == ss.DEMO_HEADERS and sheet.tabs["Franchise Requests"][0] == ss.FRANCHISE_HEADERS
    row = sheet.tabs["Enquiries"][1]
    assert row[0] == r.json()["id"] and row[2:6] == ["Grace Hopper", "grace@example.com", "+919566679928", "COBOL Co"] and row[6] == "Software project" and row[9] == "contact" and row[10] == "New"
    assert re.match(r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$", row[1])  # the submission date and time
    assert len(sheet.tabs["Franchise Requests"]) == 1 and len(sheet.tabs["Demo Requests"]) == 1  # nothing in the other tabs
    assert db.scalar(select(ContactEnquiry.sheets_synced_at)) is not None  # marked as in the sheet; the database copy is kept as always


def test_franchise_and_partnership_applications_go_to_the_franchise_tab_only(sheet, client):
    extra = {"partnership_category": "Franchise Opportunities", "business_division": "Software & IT Services", "city": "Madurai", "state": "Tamil Nadu", "country": "India", "business_background": "10 years in retail"}
    assert client.post("/api/contact", json=enquiry_payload(enquiry_type="partner-franchise", message="We want a franchise in our city please.", extra=extra, source="our-network")).status_code == 201
    row = sheet.tabs["Franchise Requests"][1]
    assert row[6] == "Software & IT Services" and row[7] == "Madurai, Tamil Nadu, India" and row[9] == "10 years in retail" and row[10] == "We want a franchise in our city please." and row[11] == "New"
    assert len(sheet.tabs["Enquiries"]) == 1  # not also in Enquiries
    assert client.post("/api/contact", json=enquiry_payload(email="p@example.com", enquiry_type="partner-reseller", message="We resell software and would like to partner.")).status_code == 201
    assert len(sheet.tabs["Franchise Requests"]) == 3  # every partnership application


def test_a_demo_request_lands_in_demo_requests(sheet, client, db):
    make_user(db, email="cust@example.com")
    csrf = login(client, "cust@example.com")
    r = client.post("/api/demo-requests", json=demo_payload(branch_id=branch_id(client, "Salem"), company="Acme", interest="CRM"), headers=csrf)
    assert r.status_code == 201
    row = sheet.tabs["Demo Requests"][1]
    assert row[0] == r.json()["id"] and row[2] == "Ada Lovelace" and row[5] == "Acme" and row[6] == "CRM" and row[10] == "Pending"
    assert len(sheet.tabs["Enquiries"]) == 1 and db.scalar(select(DemoRequest.sheets_synced_at)) is not None


def test_existing_tabs_headers_and_data_are_never_overwritten(monkeypatch, env, client):
    fake = FakeGoogle({"Enquiries": [["My own header", "Anything"], ["old row 1"], ["old row 2"]], "Notes": [["keep me"]]})
    monkeypatch.setattr(ss, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    monkeypatch.setattr(ss, "_access_token", lambda settings: "test-token")
    ss._ensured.clear()
    env(GOOGLE_SHEETS_SPREADSHEET_ID=SHEET, GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account"}')
    client.post("/api/contact", json=enquiry_payload())
    assert fake.tabs["Enquiries"][:3] == [["My own header", "Anything"], ["old row 1"], ["old row 2"]] and len(fake.tabs["Enquiries"]) == 4  # the new row is appended after the old data
    assert fake.tabs["Notes"] == [["keep me"]] and "Demo Requests" in fake.tabs  # other tabs untouched; the missing tabs were added


def test_a_repeated_submission_is_one_row_and_formula_text_is_stored_literally(sheet, client):
    body = enquiry_payload(message="=HYPERLINK(\"http://evil\",\"click\") please call me")
    assert client.post("/api/contact", json=body).status_code == 201
    assert client.post("/api/contact", json=body).status_code == 200  # the form's own duplicate guard: stored once ...
    assert len(sheet.tabs["Enquiries"]) == 2  # ... and sent once
    assert sheet.tabs["Enquiries"][1][8].startswith("=HYPERLINK")  # written RAW: Google stores it as text and never evaluates it


def test_a_failed_append_never_breaks_the_submission_and_is_retried_without_duplicates(sheet, client, db):
    sheet.fail_append = True
    r = client.post("/api/contact", json=enquiry_payload())
    assert r.status_code == 201  # the visitor is not affected
    assert db.scalar(select(ContactEnquiry.sheets_synced_at)) is None and len(sheet.tabs["Enquiries"]) == 1  # saved in the database, marked "not in the sheet yet"
    sheet.fail_append = False
    assert ss.sync_pending() == {"configured": True, "synced": 1, "failed": 0}
    assert len(sheet.tabs["Enquiries"]) == 2 and ss.sync_pending()["synced"] == 0
    db.expire_all()
    row = db.scalar(select(ContactEnquiry))
    row.sheets_synced_at = None  # the "synced" mark is lost ...
    db.commit()
    assert ss.sync_pending()["synced"] == 1 and len(sheet.tabs["Enquiries"]) == 2  # ... the id is found in the tab, so it is not appended again


def test_without_google_settings_nothing_is_sent_and_the_website_works_as_before(monkeypatch, client, db):
    calls = []
    monkeypatch.setattr(ss, "_client", lambda: calls.append(1) or httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500))))
    assert client.post("/api/contact", json=enquiry_payload()).status_code == 201 and calls == []
    assert db.scalar(select(ContactEnquiry.id)) is not None
