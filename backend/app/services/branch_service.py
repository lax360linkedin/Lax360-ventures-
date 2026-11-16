from __future__ import annotations

import re
import uuid
from urllib.parse import parse_qs, urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import Branch


def list_branches(db: Session) -> list[Branch]:
    return list(db.scalars(select(Branch).where(Branch.is_active.is_(True)).order_by(Branch.sort_order, Branch.city)))


def require_branch(db: Session, branch_id: uuid.UUID | None) -> Branch | None:
    """Verify a submitted branch id against the database (never trust the client)."""
    if branch_id is None:
        return None
    branch = db.get(Branch, branch_id)
    if branch is None or not branch.is_active:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"branch_id": "Choose a valid branch."})
    return branch


# ---- the map of a branch: a Google Maps EMBED address, extracted and checked on the server ---------------------------------------------------------------
_IFRAME_SRC = re.compile(r"""<iframe\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')""", re.I | re.S)
_MAP_HOSTS = {"www.google.com", "google.com", "maps.google.com"}


def parse_map_embed(value: str | None) -> str | None:
    """Accepts a pasted <iframe ...> code or the embed address itself and returns just the address, or None for an empty value. Only an https Google Maps EMBED address is
    accepted (host google.com / maps.google.com, path /maps/embed, or /maps with output=embed), so nothing else can be framed on the website, and no HTML is ever stored."""
    raw = (value or "").strip()
    if not raw:
        return None
    m = _IFRAME_SRC.search(raw)
    url = (m.group(1) or m.group(2) or "").strip() if m else raw
    url = url.replace("&amp;", "&")
    bad = ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"map": "Paste the Google Maps embed code (Share > Embed a map > Copy HTML) or its https://www.google.com/maps/embed address."})
    if len(url) > 1500 or any(c in url for c in "<> \t\r\n\"'"):
        raise bad
    parts = urlparse(url)
    if parts.scheme != "https" or (parts.hostname or "") not in _MAP_HOSTS or parts.username or parts.port not in (None, 443):
        raise bad
    embed = parts.path.startswith("/maps/embed") or (parts.path.rstrip("/") == "/maps" and parse_qs(parts.query).get("output") == ["embed"])
    if not embed:
        raise bad
    return url


def _slug(city: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", city.lower()).strip("-")[:40] or "branch"


def list_all(db: Session) -> list[Branch]:
    return list(db.scalars(select(Branch).order_by(Branch.sort_order, Branch.city)))


def _clean(db: Session, data: dict, current: Branch | None) -> dict:
    out = {"name": data["name"].strip(), "city": data["city"].strip(), "address": (data.get("address") or "").strip() or None, "phone": (data.get("phone") or "").strip() or None,
           "map_embed_url": parse_map_embed(data.get("map")), "is_active": bool(data.get("is_active", True)), "sort_order": int(data.get("sort_order") or 0)}
    taken = db.scalar(select(Branch.id).where(Branch.city.ilike(out["city"]), Branch.id != (current.id if current else uuid.uuid4())))
    if taken:
        raise ApiError(409, "already_exists", "Please check the highlighted fields.", fields={"city": "A branch in this city already exists: edit it instead."})
    return out


def create(db: Session, data: dict) -> Branch:
    values = _clean(db, data, None)
    slug = _slug(values["city"])
    if db.scalar(select(Branch.id).where(Branch.slug == slug)):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    branch = Branch(slug=slug, **values)
    db.add(branch)
    db.flush()
    return branch


def update(db: Session, branch: Branch, data: dict) -> Branch:
    for k, v in _clean(db, data, branch).items():
        setattr(branch, k, v)
    db.flush()
    return branch
