"""System / integration status. "connected" is only ever reported after a real check succeeded in this process."""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import ConfigError, Settings
from app.providers.base import AIServiceError
from app.services import media_service
from app.services.ai_service import AIService, build_ai_service

# Result of the last "test the AI provider" run (kept in memory; lost on restart, so it reverts to "not tested").
_last_ai_test: dict | None = None


def _item(key, label, status, detail="", **extra):
    return {"key": key, "label": label, "status": status, "detail": detail, **extra}


def snapshot(db: Session, settings: Settings) -> list[dict]:
    items = [_item("backend", "FastAPI backend", "connected", f"Environment: {settings.app_env}")]
    try:
        t = time.monotonic()
        db.execute(text("select 1"))
        latency = int((time.monotonic() - t) * 1000)
        schema = db.execute(text("select to_regclass('public.audit_logs') is not null")).scalar()
        revision = db.execute(text("select version_num from alembic_version")).scalar()
        items.append(_item("database", "PostgreSQL database", "connected" if schema else "unavailable",
                           f"Responded in {latency} ms. Migration revision {revision}." if schema else "Connected, but the schema is incomplete: run `alembic upgrade head`."))
    except Exception:  # noqa: BLE001 - never leak driver details
        items.append(_item("database", "PostgreSQL database", "unavailable", "The database did not answer. Check DATABASE_URL and that the database (e.g. your Supabase project) is running."))

    provider = settings.ai_provider
    model = getattr(settings, f"{provider}_model", None)
    if not settings.ai_configured:
        ai = _item("ai", f"AI provider ({provider})", "configuration_missing", f"Set {provider.upper()}_API_KEY and {provider.upper()}_MODEL in the backend environment.")
    elif _last_ai_test and _last_ai_test["provider"] == provider and _last_ai_test["model"] == model:
        ok = _last_ai_test["ok"]
        ai = _item("ai", f"AI provider ({provider})", "connected" if ok else "unavailable",
                   f"Last test {_last_ai_test['at']}: " + (f"answered in {_last_ai_test['latency_ms']} ms." if ok else f"failed ({_last_ai_test['code']})."))
    else:
        ai = _item("ai", f"AI provider ({provider})", "not_tested", "Configured. Press “Run test” to make one small real request.")
    ai["model"] = model
    items.append(ai)
    other = "openai" if provider == "gemini" else "gemini"
    other_name = {"openai": "OpenAI", "gemini": "Gemini"}[other]
    configured_other = bool(getattr(settings, f"{other}_api_key") and getattr(settings, f"{other}_model"))
    items.append(_item(other, f"{other_name} (inactive)", "not_tested" if configured_other else "configuration_missing",
                       "Configured but not the active provider." if configured_other else f"Not configured. Selecting {other} would require {other.upper()}_API_KEY and {other.upper()}_MODEL."))
    count, size = media_service.usage(db)
    items.append(_item("media", "Media library", "connected", f"{count} files, {size / 1024 / 1024:.1f} MB (file data lives in object storage; older uploads stay in the database)."))
    from app.services import hero_video_service

    store = hero_video_service.storage_status(settings)
    items.append(_item("video_storage", "Homepage video storage", "connected" if store["durable"] else "configuration_missing", store.get("warning") or store["detail"]))
    from app.services import object_storage

    media = object_storage.durability(settings)
    items.append(_item("media_storage", "Media library storage", "connected" if media["durable"] else "configuration_missing", media.get("warning") or f"Files are kept permanently in {media['detail']}."))
    items.append(_item("email", "Email delivery", "not_implemented", "Not implemented: enquiries are stored and shown here; no emails are sent."))
    return items


async def test_ai(settings: Settings) -> dict:
    """One tiny real request to the active provider; records the outcome for the status page."""
    global _last_ai_test
    provider = settings.ai_provider
    model = getattr(settings, f"{provider}_model", None)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    try:
        settings.require_ai()
        result = await build_ai_service(settings).generate(instructions="Reply with one short sentence.", messages=[{"role": "user", "content": "Say hello."}])
        _last_ai_test = {"provider": provider, "model": model, "ok": True, "latency_ms": result.latency_ms, "at": stamp, "code": None}
    except ConfigError:
        _last_ai_test = None
        return {"ok": False, "code": "configuration_missing"}
    except AIServiceError as err:
        _last_ai_test = {"provider": provider, "model": model, "ok": False, "latency_ms": err.latency_ms, "at": stamp, "code": err.code}
    return {"ok": _last_ai_test["ok"], "code": _last_ai_test["code"], "latency_ms": _last_ai_test["latency_ms"]}
