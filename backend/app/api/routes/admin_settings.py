"""Website settings and chatbot management."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.api.paging import Paging, day_after, day_start
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import User
from app.schemas.admin import SettingsUpdate
from app.services import audit_service, chatbot_admin_service as chat_admin, settings_service as svc

router = APIRouter(prefix="/admin", tags=["admin: settings & chatbot"])


def _settings_payload(db: Session, keys: tuple[str, ...]) -> dict:
    stored = svc.get_all(db)
    return {"fields": svc.spec_for_ui(keys), "values": {k: stored.get(k) for k in keys if k in stored}}


def _changed_detail(changed: list[str]) -> dict:
    return {"keys": changed}  # which settings changed; never the values (could be long text)


@router.get("/settings")
def get_site_settings(_: User = Depends(permission("settings")), db: Session = Depends(get_db)) -> dict:
    return _settings_payload(db, svc.SITE_KEYS)


@router.put("/settings")
def put_site_settings(body: SettingsUpdate, user: User = Depends(permission("settings", write=True)), db: Session = Depends(get_db)) -> dict:
    changed = svc.update(db, user, body.values, allowed=svc.SITE_KEYS)
    if changed:
        audit_service.record(db, user, "settings.update", resource_type="settings", detail=_changed_detail(changed))
    db.commit()
    return _settings_payload(db, svc.SITE_KEYS)


@router.get("/chatbot/settings")
def get_chatbot_settings(_: User = Depends(permission("chatbot")), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    provider = settings.ai_provider
    return {
        **_settings_payload(db, svc.CHATBOT_KEYS),
        "provider": {
            "active": provider, "model": getattr(settings, f"{provider}_model", None), "configured": settings.ai_configured,
            "available": {"gemini": bool(settings.gemini_api_key and settings.gemini_model), "openai": bool(settings.openai_api_key and settings.openai_model)},
            "note": "The provider and model are set in the server environment (AI_PROVIDER, GEMINI_MODEL / OPENAI_MODEL) and API keys are never shown or editable here.",
        },
    }


@router.put("/chatbot/settings")
def put_chatbot_settings(body: SettingsUpdate, user: User = Depends(permission("chatbot", write=True)), db: Session = Depends(get_db)) -> dict:
    changed = svc.update(db, user, body.values, allowed=svc.CHATBOT_KEYS)
    if changed:
        audit_service.record(db, user, "chatbot.settings", resource_type="chatbot", detail=_changed_detail(changed))
    db.commit()
    return _settings_payload(db, svc.CHATBOT_KEYS)


@router.get("/chatbot/conversations")
def conversations(q: str | None = Query(None, max_length=100), status: str | None = Query(None, pattern="^failed$"),
                  date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"),
                  paging: Paging = Depends(), user: User = Depends(permission("chatbot")), db: Session = Depends(get_db)) -> dict:
    items, total = chat_admin.search_conversations(db, q=q, status=status, date_from=day_start(date_from), date_to=day_after(date_to), page=paging.page, page_size=paging.page_size)
    return paging.envelope(items, total)


@router.get("/chatbot/conversations/{session_id}")
def conversation(session_id: uuid.UUID, user: User = Depends(permission("chatbot")), db: Session = Depends(get_db)) -> dict:
    data = chat_admin.conversation(db, session_id)
    audit_service.record_now(db, user, "chatbot.view_conversation", resource_type="conversation", resource_id=session_id)  # visitor messages are personal data: viewing is logged
    return data


@router.get("/chatbot/usage")
def usage(days: int = Query(7, ge=1, le=90), _: User = Depends(permission("chatbot")), db: Session = Depends(get_db)) -> dict:
    return {**chat_admin.usage_stats(db, days), "failures": chat_admin.recent_failures(db)}


@router.get("/ai-usage")
def ai_usage(days: int = Query(7, ge=1, le=90), _: User = Depends(permission("chatbot")), db: Session = Depends(get_db)) -> dict:
    """Aggregate assistant metrics (no conversation content). Kept for compatibility; /chatbot/usage adds the failure list."""
    stats = chat_admin.usage_stats(db, days)
    return {"days": days, "by_status": stats["by_status"]}
