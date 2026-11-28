"""Google Sheets: every enquiry, demo request and partnership application is also appended, as a new row, to the right WORKSHEET (tab) of ONE Google Spreadsheet.
The database stays the source of truth and is written first; the sheet is a second copy for tracking and reporting that works ALONGSIDE it.

Worksheets: one per enquiry category (app/enquiry_categories.py: General, Intro Contact, Education, Course, Internship, Digital Marketing, IT & Software, Franchise, Authorized Partner,
Referral Partner, Upcoming Services, Consultation Requests, Other). Each has its own header row with only the columns that form collects. The worksheet NAME of every category, and whether it is
copied at all, are set in the admin panel (Enquiry center > Google Sheets); the defaults are used until then. A record can be copied to more than one worksheet (a partnership application that
asks for a consultation or names an upcoming service also appears in Consultation Requests / Upcoming Services).

Design
- Authentication: a Google service account (the key is a backend environment variable / file, never sent to the browser). The spreadsheet must be shared with the service account's e-mail.
- Rows are only ever APPENDED. Missing worksheets and their header rows are created; a header row (or any data) that already exists is never overwritten or deleted. Rows are a snapshot of the
  submission: later status changes are made in the admin panel (the database), not in the sheet.
- Never blocks or breaks a submission: the copy runs after the response; every attempt per worksheet is logged in `sheet_sync` (status, attempts, the last error without secrets) and a failed one
  is retried (on the next submission, by `python -m app.cli sheets-sync`, or from the admin panel).
- No duplicates: a worksheet copy is marked synced once appended; a RETRY first looks for the record's id in the worksheet, so a copy whose mark was lost is not appended again.
"""

from __future__ import annotations

import base64
import json
import logging
import re
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.enquiry_categories import CATEGORIES, DEFAULT_TABS, KEYS, LABELS, contact_category
from app.models import ContactEnquiry, DemoRequest, EnquiryFollowup, PartnershipApplication, SheetSync, SiteSetting, User
from app.schemas.contact import ENQUIRY_TYPES

log = logging.getLogger("app.sheets")
API = "https://sheets.googleapis.com/v4/spreadsheets"
SCOPE = "https://www.googleapis.com/auth/spreadsheets"
SETTING_KEY = "sheets_tabs"  # admin-managed: {category: {"name": worksheet name, "enabled": bool}}

# ---- the columns: a catalogue, and which ones each worksheet uses (only what its form really collects) ---------------------------------------------------
COLUMNS = {
    "id": "Enquiry ID", "ref": "Reference No.", "date": "Submission Date", "time": "Submission Time", "name": "Full Name", "email": "Email Address", "phone": "Mobile Number",
    "org": "Organization Name", "type": "Enquiry Type", "ptype": "Partnership Type", "divs": "Selected Business Divisions", "products": "Products or Services", "course": "Selected Course",
    "other": "Other Business Interests", "city": "City", "state": "State", "location": "Preferred Location", "budget": "Investment Budget", "message": "Message", "source": "Source Page",
    "branch": "Assigned Branch", "employee": "Assigned Employee", "status": "Enquiry Status", "followup": "Follow-up Date", "updated": "Last Updated", "details": "Additional Details",
    "scat": "Service Category", "cdate": "Consultation Date", "ctime": "Consultation Time", "cmethod": "Contact Method", "cmode": "Meeting Mode",
}
_BASE = ["id", "date", "time", "name", "email", "phone"]
_TAIL = ["message", "source", "branch", "employee", "status", "followup", "updated"]
_PARTNER = [*_BASE[:1], "ref", *_BASE[1:], "org", "ptype", "divs", "other", "city", "state", "location"]
TAB_COLUMNS: dict[str, list[str]] = {
    "general": [*_BASE, "org", "type", *_TAIL],
    "intro": [*_BASE, "type", "message", "source", "status", "updated"],
    "education": [*_BASE, "org", "type", "details", *_TAIL],
    "course": [*_BASE, "org", "course", "details", *_TAIL],
    "internship": [*_BASE, "org", "type", "city", "details", *_TAIL],
    "digital_marketing": [*_BASE, "org", "products", "details", *_TAIL],
    "it_software": [*_BASE, "org", "type", "products", "budget", "details", *_TAIL],
    "franchise": [*_PARTNER, "budget", *_TAIL],
    "authorized": [*_PARTNER, *_TAIL],
    "referral": [*_PARTNER, *_TAIL],
    "product": [*_BASE, "org", "scat", "products", "budget", "details", *_TAIL],
    "upcoming": [*_BASE, "org", "type", "ptype", "products", "divs", "other", *_TAIL[:2], "status", "updated"],
    "consultation": [*_BASE, "org", "type", "ptype", "divs", "cdate", "ctime", "cmethod", "cmode", "message", "source", "branch", "employee", "status", "updated"],
    "other": [*_BASE, "org", "type", "details", "message", "source", "status", "updated"],
}
assert set(TAB_COLUMNS) == set(KEYS)


def headers_of(category: str) -> list[str]:
    return [COLUMNS[c] for c in TAB_COLUMNS[category]]


_lock = threading.Lock()
_ensured: set[tuple] = set()  # (spreadsheet, worksheet names) whose worksheets and headers were checked in this process
_token: dict = {"value": None, "exp": 0.0}


def _client() -> httpx.Client:  # a function so tests can substitute a fake Google server
    return httpx.Client(timeout=httpx.Timeout(20.0, connect=10.0))


def configured(settings: Settings) -> bool:
    return bool(settings.google_sheets_spreadsheet_id and (settings.google_service_account_json or settings.google_service_account_file))


# ---- worksheet names (admin-managed) -------------------------------------------------------------------------------------------------------------------
_BAD_NAME = re.compile(r"[\[\]*?:/\\]")


def tab_config(db: Session | None) -> dict[str, dict]:
    """{category: {"name", "enabled"}} with the admin panel's choices over the defaults."""
    saved = {}
    if db is not None:
        row = db.get(SiteSetting, SETTING_KEY)
        saved = row.value if row is not None and isinstance(row.value, dict) else {}
    out = {}
    for key in KEYS:
        s = saved.get(key) if isinstance(saved.get(key), dict) else {}
        name = str(s.get("name") or "").strip()
        out[key] = {"name": name if name and not _BAD_NAME.search(name) else DEFAULT_TABS[key], "enabled": s.get("enabled") is not False}
    return out


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


def _clean_error(exc: Exception) -> str:
    """The text kept in the log: what failed, never a key or token."""
    text = re.sub(r"-----BEGIN[\s\S]*?-----END[^-]*-----", "[key removed]", str(exc))
    return text.replace("\n", " ")[:300]


# ---- worksheets and headers (create what is missing; never overwrite) ---------------------------------------------------------------------------------
def ensure_tabs(settings: Settings, http: httpx.Client, cfg: dict[str, dict] | None = None) -> dict[str, str]:
    """Make sure every enabled worksheet exists with its header row. Returns what was done, per worksheet. Existing worksheets, headers and data are left exactly as they are."""
    cfg = cfg or tab_config(None)
    wanted = {key: c["name"] for key, c in cfg.items() if c["enabled"]}
    done: dict[str, str] = {}
    meta = _call(settings, http, "GET", "", params={"fields": "sheets.properties.title"})
    have = {s["properties"]["title"] for s in meta.get("sheets", [])}
    missing = list(dict.fromkeys(name for name in wanted.values() if name not in have))
    if missing:
        _call(settings, http, "POST", ":batchUpdate", json={"requests": [{"addSheet": {"properties": {"title": name}}} for name in missing]})
    for key, name in wanted.items():
        first = _call(settings, http, "GET", f"/values/{_q(name)}!A1:AF1").get("values") or []
        if first and any(str(c).strip() for c in first[0]):
            done[name] = "kept (already has a header row)" if name in have else "created, header present"
            continue
        _call(settings, http, "PUT", f"/values/{_q(name)}!A1", params={"valueInputOption": "RAW"}, json={"values": [headers_of(key)]})
        done[name] = "header row written" + ("" if name in have else " (new worksheet)")
    _ensured.add((settings.google_sheets_spreadsheet_id or "", tuple(sorted(wanted.values()))))
    return done


def _append(settings: Settings, http: httpx.Client, cfg: dict, tab: str, row: list[str], *, check_id: bool) -> bool:
    """Append one row. Returns False when `check_id` found the row's id already in the worksheet (so it was not appended again)."""
    marker = (settings.google_sheets_spreadsheet_id or "", tuple(sorted(c["name"] for c in cfg.values() if c["enabled"])))
    if marker not in _ensured:
        with _lock:
            if marker not in _ensured:
                ensure_tabs(settings, http, cfg)
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


def _local(dt: datetime | None, settings: Settings) -> datetime:
    return (dt or datetime.now(timezone.utc)).astimezone(ZoneInfo(settings.app_timezone))


def _when(dt: datetime | None, settings: Settings) -> str:
    return _local(dt, settings).strftime("%Y-%m-%d %H:%M:%S")


def _details(extra: dict, skip: set[str]) -> str:
    return "; ".join(f"{k}: {v}" for k, v in extra.items() if k not in skip and k != "attachments" and v not in (None, ""))


def _employee(db: Session, user_id) -> str:
    if not user_id:
        return ""
    u = db.get(User, user_id)
    return u.full_name if u else ""


def _followup(db: Session, enquiry_id) -> str:
    try:
        with db.begin_nested():
            f = db.scalar(select(EnquiryFollowup).where(EnquiryFollowup.enquiry_id == enquiry_id, EnquiryFollowup.due_on.is_not(None), EnquiryFollowup.done.is_(False)).order_by(EnquiryFollowup.due_on).limit(1))
            return f.due_on.isoformat() if f and f.due_on else ""
    except Exception:  # noqa: BLE001 - a database that has no follow-up table yet: the column stays empty
        return ""


def _stamp(rec: dict, created: datetime | None, updated: datetime | None, settings: Settings) -> None:
    c = _local(created, settings)
    rec["date"], rec["time"] = c.strftime("%Y-%m-%d"), c.strftime("%H:%M:%S")
    rec["updated"] = _when(updated or created, settings)


def enquiry_text(e: ContactEnquiry) -> str:
    return f"{e.subject or ''} {e.message or ''} {json.dumps(e.extra or {}, default=str)}"


def _enquiry_record(db: Session, e: ContactEnquiry, settings: Settings) -> dict:
    x = e.extra or {}
    rec = {"id": str(e.id), "name": e.name, "email": e.email, "phone": e.phone, "org": e.company or x.get("college") or x.get("company"), "type": ENQUIRY_TYPES.get(e.enquiry_type, e.enquiry_type),
           "message": e.message, "source": x.get("source_page") or e.source, "branch": e.branch.city if e.branch else "", "employee": _employee(db, e.assigned_to), "status": e.status, "followup": _followup(db, e.id)}
    rec["course"] = x.get("course")
    rec["scat"] = x.get("service_category")
    rec["products"] = x.get("service_subs") or x.get("service_mains") or x.get("service") or x.get("projectType") or x.get("task") or x.get("goal")
    rec["budget"] = x.get("investment_capacity") or x.get("investment") or x.get("budget")
    rec["city"], rec["state"], rec["location"] = x.get("city"), x.get("state"), x.get("preferred_location") or x.get("location") or x.get("city")
    rec["divs"] = x.get("business_division")
    rec["ptype"] = x.get("interestedAs") or x.get("partnership_category") or (ENQUIRY_TYPES.get(e.enquiry_type) if e.enquiry_type.startswith("partner") else "")
    rec["details"] = _details(x, {"course", "service_subs", "service_mains", "service", "projectType", "task", "goal", "college", "company", "business_division", "partnership_category", "interestedAs", "investment_capacity",
                                  "investment", "budget", "city", "state", "preferred_location", "location", "service_category", "source_page"})
    _stamp(rec, e.created_at, e.updated_at, settings)
    return rec


def _application_record(db: Session, a: PartnershipApplication, settings: Settings) -> dict:
    from app.services import partnership_service as ps

    labels = {o["value"]: o["label"] for o in ps.division_options(db)}
    names = [labels.get(d, d) for d in ps.divisions_of(a) if d != ps.OTHER_KEY]
    answers = a.answers or {}
    cons = a.consultation or {}
    ptype = {"franchise": "Franchise Opportunities", "authorized": "Authorized Partner Program", "referral": "Referral Partner Program"}.get(a.category, a.category)
    rec = {"id": str(a.id), "ref": a.reference, "name": a.full_name, "email": a.email, "phone": a.phone, "org": a.organization, "ptype": ptype,
           "type": "Short partnership enquiry" if answers.get("enquiry_form") == "short" else "Partnership application",
           "divs": ("All Business Divisions: " if a.all_divisions else "") + "; ".join(names), "products": "; ".join(names), "other": a.other_interest,
           "city": a.city, "state": a.state, "location": answers.get("proposed_location") or a.preferred_location or answers.get("operating_region"), "budget": answers.get("investment_budget"),
           "message": cons.get("message") or answers.get("additional_info") or "", "source": a.source_page, "branch": a.assigned_branch or a.preferred_branch, "employee": _employee(db, a.assigned_to),
           "status": a.status, "followup": "", "cdate": cons.get("date"), "ctime": cons.get("time"), "cmethod": cons.get("method"), "cmode": cons.get("mode")}
    _stamp(rec, a.created_at, a.updated_at, settings)
    return rec


def _demo_record(db: Session, d: DemoRequest, settings: Settings) -> dict:
    rec = {"id": str(d.id), "name": d.name, "email": d.email, "phone": "", "org": d.company, "type": "Demo request", "products": d.interest, "cdate": d.preferred_date.isoformat() if d.preferred_date else "",
           "message": d.message, "source": "demo-request", "branch": d.branch.city if d.branch else "", "status": d.status}
    _stamp(rec, d.created_at, d.updated_at, settings)
    return rec


def targets(db: Session, kind: str, obj, settings: Settings) -> list[tuple[str, dict]]:
    """[(category, record)] for a stored submission: its own category and, for a partnership application, the extra copies (an upcoming service named, a consultation requested)."""
    if kind == "enquiry":
        return [(contact_category(obj.enquiry_type, obj.source, enquiry_text(obj)), _enquiry_record(db, obj, settings))]
    if kind == "demo":
        return [("consultation", _demo_record(db, obj, settings))]
    from app.services import partnership_service as ps

    rec = _application_record(db, obj, settings)
    out = [({"franchise": "franchise", "authorized": "authorized", "referral": "referral"}.get(obj.category, "other"), rec)]
    upcoming = ps.upcoming_slugs(db)
    chosen = [d for d in ps.divisions_of(obj) if d != ps.OTHER_KEY]
    if obj.all_divisions or any(d in upcoming for d in chosen):
        labels = {o["value"]: o["label"] for o in ps.division_options(db)}
        out.append(("upcoming", {**rec, "products": "; ".join(labels.get(d, d) for d in chosen if d in upcoming)}))
    if (obj.consultation or {}).get("date") or (obj.consultation or {}).get("time"):
        out.append(("consultation", rec))
    return out


def _row(category: str, rec: dict) -> list[str]:
    return [_cell(rec.get(c)) for c in TAB_COLUMNS[category]]


# ---- syncing ------------------------------------------------------------------------------------------------------------------------------------------
MODELS = {"enquiry": ContactEnquiry, "demo": DemoRequest, "application": PartnershipApplication}


def _factory():
    from app.db.session import _factory as f

    return f()


def _sync(db: Session, settings: Settings, kind: str, record_id: uuid.UUID, *, retry: bool) -> bool:
    """Copy one stored record to every worksheet it belongs to. Returns True when all its copies are in the sheet. Never raises for a Google failure (it is logged on the sync row)."""
    row = db.get(MODELS[kind], record_id)
    if row is None:
        return True
    cfg = tab_config(db)
    wanted = [(cat, rec) for cat, rec in targets(db, kind, row, settings) if cfg[cat]["enabled"]]
    all_ok = True
    with _client() as http:
        for cat, rec in wanted:
            tab = cfg[cat]["name"]
            s = db.scalar(select(SheetSync).where(SheetSync.record_kind == kind, SheetSync.record_id == record_id, SheetSync.category == cat))
            if s is None:
                s = SheetSync(record_kind=kind, record_id=record_id, category=cat, tab=tab, status="pending", attempts=0)
                db.add(s)
            if s.status == "synced":
                continue
            s.tab = tab
            try:
                _append(settings, http, cfg, tab, _row(cat, rec), check_id=retry or s.attempts > 0)
                s.status, s.synced_at, s.last_error = "synced", datetime.now(timezone.utc), None
            except Exception as exc:  # noqa: BLE001 - a failed copy to the sheet must never affect the visitor
                s.status, s.attempts, s.last_error = "failed", (s.attempts or 0) + 1, _clean_error(exc)
                all_ok = False
                log.warning("Google Sheets copy failed (%s, %s): %s", kind, cat, s.last_error)
            db.commit()
    if all_ok:
        row.sheets_synced_at = datetime.now(timezone.utc)
        db.commit()
    return all_ok


def sync_record(kind: str, record_id: uuid.UUID, *, retry: bool = False) -> None:
    """Background task after a form was stored. Never raises."""
    settings = get_settings()
    if not configured(settings):
        return
    try:
        with _factory()() as db:
            _sync(db, settings, kind, record_id, retry=retry)
    except Exception as exc:  # noqa: BLE001 - the row stays marked "not synced" and is retried
        log.warning("Google Sheets copy failed (will be retried): %s", _clean_error(exc))


def sync_enquiry(enquiry_id: uuid.UUID) -> None:
    sync_record("enquiry", enquiry_id)


def sync_demo(request_id: uuid.UUID) -> None:
    sync_record("demo", request_id)


def sync_application(application_id: uuid.UUID) -> None:
    sync_record("application", application_id)


def sync_pending(settings: Settings | None = None, *, days: int | None = 3, limit: int = 200) -> dict:
    """Copy every recent submission that is not completely in the sheet yet (a failed earlier attempt). Uses the id check, so nothing is added twice. `days=None` looks at all of them."""
    settings = settings or get_settings()
    if not configured(settings):
        return {"configured": False, "synced": 0, "failed": 0}
    since = datetime.now(timezone.utc) - timedelta(days=days) if days else None
    synced = failed = 0
    with _factory()() as db:
        for kind, model in MODELS.items():
            q = select(model.id).where(model.sheets_synced_at.is_(None)).order_by(model.created_at).limit(limit)
            if since:
                q = q.where(model.created_at >= since)
            for rid in list(db.scalars(q)):
                try:
                    ok = _sync(db, settings, kind, rid, retry=True)
                except Exception as exc:  # noqa: BLE001
                    db.rollback()
                    ok = False
                    log.warning("Google Sheets retry failed: %s", _clean_error(exc))
                synced += 1 if ok else 0
                failed += 0 if ok else 1
    return {"configured": True, "synced": synced, "failed": failed}


def retry_recent() -> None:
    """Background task after a new submission: also retry a few earlier failures (last 3 days)."""
    try:
        sync_pending(days=3, limit=10)
    except Exception as exc:  # noqa: BLE001
        log.warning("Google Sheets retry failed: %s", _clean_error(exc))


# ---- admin panel ---------------------------------------------------------------------------------------------------------------------------------------
def admin_status(db: Session, settings: Settings) -> dict:
    """What the admin panel shows: is it connected, each category's worksheet, its columns and the copy counts, and the recent failures (no secrets)."""
    cfg = tab_config(db)
    counts: dict[str, dict[str, int]] = {}
    for cat, st, n in db.execute(select(SheetSync.category, SheetSync.status, func.count()).group_by(SheetSync.category, SheetSync.status)).all():
        counts.setdefault(cat, {})[st] = int(n)
    failures = db.scalars(select(SheetSync).where(SheetSync.status != "synced").order_by(SheetSync.updated_at.desc()).limit(25)).all()
    sid = settings.google_sheets_spreadsheet_id or ""
    return {
        "configured": configured(settings), "spreadsheet": ("…" + sid[-6:]) if sid else "", "service_account": _service_email(settings),
        "tabs": [{"key": k, "label": LABELS[k], "default_name": DEFAULT_TABS[k], "name": cfg[k]["name"], "enabled": cfg[k]["enabled"], "columns": headers_of(k), "synced": counts.get(k, {}).get("synced", 0),
                  "pending": counts.get(k, {}).get("pending", 0), "failed": counts.get(k, {}).get("failed", 0)} for k, *_ in CATEGORIES],
        "failures": [{"id": str(f.id), "kind": f.record_kind, "record_id": str(f.record_id), "category": f.category, "label": LABELS.get(f.category, f.category), "tab": f.tab, "status": f.status, "attempts": f.attempts,
                      "error": f.last_error, "updated_at": f.updated_at.isoformat() if f.updated_at else None} for f in failures],
        "unsynced": {kind: int(db.scalar(select(func.count()).select_from(model).where(model.sheets_synced_at.is_(None))) or 0) for kind, model in MODELS.items()},
    }


def _service_email(settings: Settings) -> str:
    try:
        return str(_key_info(settings).get("client_email", ""))
    except Exception:  # noqa: BLE001
        return ""


def save_tab_config(db: Session, data: dict, user_id) -> dict[str, dict]:
    """Validate and store the worksheet names / switches. Names must be unique and may not contain [ ] * ? : / \\ (Google rules). Raises ValueError with the field message."""
    clean: dict[str, dict] = {}
    for key in KEYS:
        s = data.get(key) if isinstance(data.get(key), dict) else {}
        name = " ".join(str(s.get("name") or DEFAULT_TABS[key]).split())
        if not name or len(name) > 100 or _BAD_NAME.search(name):
            raise ValueError(f"{key}: the worksheet name must be 1 to 100 characters and may not contain [ ] * ? : / \\")
        clean[key] = {"name": name, "enabled": s.get("enabled") is not False}
    seen = {}
    for key, c in clean.items():
        if c["enabled"]:
            low = c["name"].lower()
            if low in seen:
                raise ValueError(f"{key}: the worksheet name '{c['name']}' is already used by another category.")
            seen[low] = key
    row = db.get(SiteSetting, SETTING_KEY)
    if row is None:
        db.add(SiteSetting(key=SETTING_KEY, value=clean, is_public=False, updated_by=user_id))
    else:
        row.value, row.updated_by = clean, user_id
    db.flush()
    return clean


def setup_worksheets(db: Session, settings: Settings) -> dict[str, str]:
    with _client() as http:
        return ensure_tabs(settings, http, tab_config(db))
