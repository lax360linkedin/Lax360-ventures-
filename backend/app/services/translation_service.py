"""Website translations edited in the admin panel (Translations): English text -> text in another language, per language.

The languages are listed in LANGUAGES (English is the default and needs no translations). Adding a language to the website is one entry here, one in frontend/src/i18n/languages.js and a
dictionary file: nothing else changes. A missing translation is simply absent, so the website shows the English.
"""

from __future__ import annotations

import hashlib
import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import Translation, User

LANGUAGES = {"ta": "Tamil", "hi": "Hindi"}  # code -> English name; keep in step with frontend/src/i18n/languages.js
MAX_SOURCE = 4000
MAX_VALUE = 4000


def norm(text: str) -> str:
    """The same normalisation as the website: whitespace collapsed, trimmed."""
    return re.sub(r"\s+", " ", text or "").strip()


def digest(source: str) -> str:
    return hashlib.sha256(source.encode("utf8")).hexdigest()


def check_lang(lang: str) -> str:
    if lang not in LANGUAGES:
        raise ApiError(404, "not_found", "That language is not available.")
    return lang


def strings(db: Session, lang: str) -> dict[str, str]:
    """{english: translation} for one language (what the website downloads)."""
    check_lang(lang)
    return {t.source: t.value for t in db.scalars(select(Translation).where(Translation.lang == lang))}


def save_many(db: Session, user: User, items: list[dict]) -> dict:
    """Create, update or (with an empty value) delete translations. Each item: {lang, source, value}. Everything is validated before anything is written."""
    clean = []
    for n, it in enumerate(items):
        lang = check_lang((it.get("lang") or "").strip())
        source, value = norm(it.get("source") or ""), (it.get("value") or "").strip()
        if not source or len(source) > MAX_SOURCE:
            raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={f"items.{n}.source": "The English text is required (up to 4000 characters)."})
        if len(value) > MAX_VALUE:
            raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={f"items.{n}.value": "Keep the translation under 4000 characters."})
        clean.append((lang, source, value))
    saved = removed = 0
    for lang, source, value in clean:
        h = digest(source)
        row = db.scalar(select(Translation).where(Translation.lang == lang, Translation.source_hash == h))
        if not value:
            if row is not None:
                db.delete(row)
                removed += 1
            continue
        if row is None:
            db.add(Translation(lang=lang, source_hash=h, source=source, value=value, updated_by=user.id))
        else:
            row.value, row.updated_by = value, user.id
        saved += 1
    db.flush()
    return {"saved": saved, "removed": removed}


def counts(db: Session) -> dict[str, int]:
    out = {code: 0 for code in LANGUAGES}
    for t in db.scalars(select(Translation.lang)):
        out[t] = out.get(t, 0) + 1
    return out
