"""Google Sheets: every enquiry, demo request and franchise / partnership application is also appended, as a new row, to ONE Google Spreadsheet with three tabs
(Enquiries, Demo Requests, Franchise Requests). The database stays the source of truth and is written first; the sheet is a convenient second copy that works ALONGSIDE it.

Design
- Authentication: a Google service account (the key is a backend environment variable / file, never sent to the browser). The spreadsheet must be shared with the service account's e-mail.
- Rows are only ever APPENDED. The tabs and their header rows are created when missing; a header row (or any data) that already exists is never overwritten or deleted.
- Never blocks or breaks a submission: the append runs after the response, errors are logged without secrets, and the row stays marked "not synced" so the next run retries it.
- No duplicates: a row is marked synced once appended; the form's own duplicate guard means a repeated submission is not stored (or sent) twice; a RETRY first looks for the row's id in the
  tab, so a row whose "synced" mark was lost is not appended again.
"""

from __future__ import annotations

import base64
import json
import logging
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models import ContactEnquiry, DemoRequest
from app.schemas.contact import ENQUIRY_TYPES

log = logging.getLogger("app.sheets")
API = "https://sheets.googleapis.com/v4/spreadsheets"
SCOPE = "https://www.googleapis.com/auth/spreadsheets"

ENQUIRY_HEADERS = ["Enquiry ID", "Date & Time", "Full Name", "Email Address", "Phone Number", "Company Name", "Enquiry Category", "Subject", "Message", "Source Page", "Status"]
DEMO_HEADERS = ["Request ID", "Date & Time", "Full Name", "Email Address", "Phone Number", "Company Name", "Product / Service", "Preferred Demo Date", "Preferred Demo Time", "Additional Requirements", "Status"]
FRANCHISE_HEADERS = ["Request ID", "Date & Time", "Full Name", "Email Address", "Phone Number", "Company Name", "Interested Business Category", "Preferred Location", "Investment Capacity", "Business Experience", "Message", "Status"]

_lock = threading.Lock()
_ensured: set[str] = set()  # spreadsheets whose tabs and headers were checked in this process
_token: dict = {"value": None, "exp": 0.0}


def _client() -> httpx.Client:  # a function so tests can substitute a fake Google server
    return httpx.Client(timeout=httpx.Timeout(20.0, connect=10.0))


def configured(settings: Settings) -> bool:
    return bool(settings.google_sheets_spreadsheet_id and (settings.google_service_account_json or settings.google_service_account_file))


def tabs(settings: Settings) -> dict[str, tuple[str, list[str]]]:
    return {"enquiries": (settings.google_sheets_tab_enquiries, ENQUIRY_HEADERS), "demos": (settings.google_sheets_tab_demos, DEMO_HEADERS), "franchise": (settings.google_sheets_tab_franchise, FRANCHISE_HEADERS)}


# ---- authentication ----------------------------------------------------------------------------------------------------------------------------------
def _key_info(settings: Settings) -> dict:
    if settings.google_service_account_json:
        raw = settings.google_service_account_json.get_secret_value().strip()
        if not raw.startswith("{"):
            raw = base64.b64decode(raw).decode("utf8")
        return json.loads(raw)
    with open(settings.google_service_account_file, encoding="utf8") as f:  # type: ignore[arg-type]
        return json.load(f)


def _access_token(settings: Settings) -> str:
    """An OAuth access token for the service account (cached until shortly before it expires)."""
    if _token["value"] and time.time() < _token["exp"] - 120:
        return _token["value"]
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_info(_key_info(settings), scopes=[SCOPE])
    creds.refresh(Request())
    _token["value"], _token["exp"] = creds.token, (creds.expiry.replace(tzinfo=timezone.utc).timestamp() if creds.expiry else time.time() + 3000)
    return _token["value"]


def _call(settings: Settings, http: httpx.Client, method: str, path: str, **kw) -> dict:
    r = http.request(method, f"{API}/{settings.google_sheets_spreadsheet_id}{path}", headers={"Authorization": f"Bearer {_access_token(settings)}"}, **kw)
    if r.status_code >= 300:
        # the message names what is wrong (permission, wrong id, quota...) but never carries a credential
        reason = ""
        try:
            reason = r.json().get("error", {}).get("message", "")[:200]
        except ValueError:
            pass
        raise RuntimeError(f"Google Sheets answered HTTP {r.status_code}: {reason}")
    return r.json() if r.content else {}


def _q(tab: str) -> str:
    return "'" + tab.replace("'", "''") + "'"


# ---- tabs and headers (create what is missing; never overwrite) --------------------------------------------------------------------------------------
def ensure_tabs(settings: Settings, http: httpx.Client) -> dict[str, str]:
    """Make sure the three tabs exist with their header row. Returns what was done, per tab. Existing tabs, headers and data are left exactly as they are."""
    done: dict[str, str] = {}
    meta = _call(settings, http, "GET", "", params={"fields": "sheets.properties.title"})
    have = {s["properties"]["title"] for s in meta.get("sheets", [])}
    missing = [name for name, _ in tabs(settings).values() if name not in have]
    if missing:
        _call(settings, http, "POST", ":batchUpdate", json={"requests": [{"addSheet": {"properties": {"title": name}}} for name in missing]})
    for key, (name, headers) in tabs(settings).items():
        first = _call(settings, http, "GET", f"/values/{_q(name)}!A1:Z1").get("values") or []
        if first and any(str(c).strip() for c in first[0]):
            done[name] = "kept (already has a header row)" if name in have else "created, header present"
            continue
        _call(settings, http, "PUT", f"/values/{_q(name)}!A1", params={"valueInputOption": "RAW"}, json={"values": [headers]})
        done[name] = "header row written" + ("" if name in have else " (new tab)")
    _ensured.add(settings.google_sheets_spreadsheet_id or "")
    return done


def _append(settings: Settings, http: httpx.Client, tab: str, headers: list[str], row: list[str], *, check_id: bool) -> bool:
    """Append one row. Returns False when `check_id` found the row's id already in the tab (so it was not appended again)."""
    if (settings.google_sheets_spreadsheet_id or "") not in _ensured:
        with _lock:
            if (settings.google_sheets_spreadsheet_id or "") not in _ensured:
                ensure_tabs(settings, http)
    if check_id:
        ids = _call(settings, http, "GET", f"/values/{_q(tab)}!A:A").get("values") or []
        if any(r and r[0] == row[0] for r in ids):
            return False
    _call(settings, http, "POST", f"/values/{_q(tab)}!A1:append", params={"valueInputOption": "RAW", "insertDataOption": "INSERT_ROWS"}, json={"values": [row]})
    return True


# ---- the rows ----------------------------------------------------------------------------------------------------------------------------------------
def _cell(value) -> str:
    """A cell value as plain text. Rows are written with valueInputOption=RAW, so Google stores every value literally: text that looks like a formula (=, +, -, @) is NEVER evaluated, and a
    phone number such as +91... stays exactly as typed. Very long text is cut at the cell limit."""
    return ("" if value is None else str(value))[:40000]


def _when(dt: datetime | None, settings: Settings) -> str:
    dt = dt or datetime.now(timezone.utc)
    return dt.astimezone(ZoneInfo(settings.app_timezone)).strftime("%Y-%m-%d %H:%M:%S")


def is_franchise(enquiry_type: str) -> bool:
    return enquiry_type == "partnership" or enquiry_type.startswith("partner-")


def enquiry_target(e: ContactEnquiry, settings: Settings) -> tuple[str, list[str], list[str]]:
    """(tab, headers, row) for an enquiry: franchise / partnership applications go to the Franchise Requests tab, everything else to Enquiries."""
    t = tabs(settings)
    if is_franchise(e.enquiry_type):
        x = e.extra or {}
        place = ", ".join(p for p in (x.get("city"), x.get("state"), x.get("country")) if p)
        row = [str(e.id), _when(e.created_at, settings), e.name, e.email, e.phone, e.company, x.get("business_division") or x.get("partnership_category") or ENQUIRY_TYPES.get(e.enquiry_type, ""),
               place, x.get("investment_capacity") or x.get("investment"), x.get("business_background") or x.get("experience"), e.message, "New"]
        name, headers = t["franchise"]
    else:
        row = [str(e.id), _when(e.created_at, settings), e.name, e.email, e.phone, e.company, ENQUIRY_TYPES.get(e.enquiry_type, e.enquiry_type), e.subject, e.message, e.source, "New"]
        name, headers = t["enquiries"]
    return name, headers, [_cell(c) for c in row]


def demo_target(d: DemoRequest, settings: Settings) -> tuple[str, list[str], list[str]]:
    name, headers = tabs(settings)["demos"]
    # the demo form does not ask for a phone number or a time: those columns stay empty rather than being invented
    row = [str(d.id), _when(d.created_at, settings), d.name, d.email, "", d.company, d.interest, d.preferred_date.isoformat() if d.preferred_date else "", "", d.message, "Pending"]
    return name, headers, [_cell(c) for c in row]


# ---- syncing ------------------------------------------------------------------------------------------------------------------------------------------
def _factory():
    from app.db.session import _factory as f

    return f()


def _sync_row(db: Session, settings: Settings, row, target, *, retry: bool) -> bool:
    name, headers, cells = target
    with _client() as http:
        _append(settings, http, name, headers, cells, check_id=retry)
    row.sheets_synced_at = datetime.now(timezone.utc)
    db.commit()
    return True


def sync_enquiry(enquiry_id: uuid.UUID) -> None:
    """Background task after an enquiry was stored. Never raises."""
    _sync_one(ContactEnquiry, enquiry_id, enquiry_target)


def sync_demo(request_id: uuid.UUID) -> None:
    """Background task after a demo request was stored. Never raises."""
    _sync_one(DemoRequest, request_id, demo_target)


def _sync_one(model, row_id: uuid.UUID, target_fn) -> None:
    settings = get_settings()
    if not configured(settings):
        return
    try:
        with _factory()() as db:
            row = db.get(model, row_id)
            if row is None or row.sheets_synced_at is not None:
                return
            _sync_row(db, settings, row, target_fn(row, settings), retry=False)
    except Exception as exc:  # noqa: BLE001 - a failed copy to the sheet must never affect the visitor; the row stays marked "not synced" and is retried
        log.warning("Google Sheets append failed (will be retried): %s", str(exc)[:300])


def sync_pending(settings: Settings | None = None, *, days: int | None = 3, limit: int = 200) -> dict:
    """Append every recent submission that is not in the sheet yet (a failed earlier attempt). Uses the id check, so nothing is added twice. `days=None` looks at all of them."""
    settings = settings or get_settings()
    if not configured(settings):
        return {"configured": False, "synced": 0, "failed": 0}
    since = datetime.now(timezone.utc) - timedelta(days=days) if days else None
    synced = failed = 0
    with _factory()() as db:
        for model, target in ((ContactEnquiry, enquiry_target), (DemoRequest, demo_target)):
            q = select(model).where(model.sheets_synced_at.is_(None)).order_by(model.created_at).limit(limit)
            if since:
                q = q.where(model.created_at >= since)
            for row in list(db.scalars(q)):
                try:
                    _sync_row(db, settings, row, target(row, settings), retry=True)
                    synced += 1
                except Exception as exc:  # noqa: BLE001
                    db.rollback()
                    failed += 1
                    log.warning("Google Sheets retry failed: %s", str(exc)[:300])
    return {"configured": True, "synced": synced, "failed": failed}


def retry_recent() -> None:
    """Background task after a new submission: also retry a few earlier failures (last 3 days)."""
    try:
        sync_pending(days=3, limit=10)
    except Exception as exc:  # noqa: BLE001
        log.warning("Google Sheets retry failed: %s", str(exc)[:300])
