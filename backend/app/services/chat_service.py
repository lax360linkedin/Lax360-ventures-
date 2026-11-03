"""Chat orchestration: validation, session ownership, bounded context, usage tracking and the provider call.

The model only produces text. Links, follow-up chips and any action (e.g. the demo form) are chosen here from
fixed, server-side rules, so model output can never trigger a database write or an administrative action.
"""

from __future__ import annotations

import hashlib
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from dataclasses import dataclass

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import ConfigError, Settings
from app.core.errors import ApiError
from app.core.security import new_token, safe_equal, token_digest
from app.models import AiUsage, ChatMessage, ChatSession, User
from app.schemas.chat import ChatLink, ChatReply, ChatRequest, ChatResponse
from app.knowledge.lax360_knowledge import build_instructions
from app.providers.base import FALLBACK_MESSAGE, AIServiceError
from app.services.ai_service import AIService
from app.services import settings_service
from app.services.branch_service import list_branches

log = logging.getLogger("app.chat")

# Fixed rules: (pattern, link, follow-up chip id). First two matches win.
_INTENTS: list[tuple[re.Pattern[str], ChatLink, str | None]] = [
    (re.compile(r"\b(demo|book a demo|schedule)\b", re.I), ChatLink(label="Get a Demo (login required)", to="/demo"), None),
    (re.compile(r"\b(branch|branches|office|location|address|salem|bangalore|bengaluru|mumbai)\b", re.I), ChatLink(label="Our branches", to="/contact#branches"), None),
    (re.compile(r"\b(ai|automation|chatbot|assistant|prompt)\b", re.I), ChatLink(label="AI & Automation", to="/services/ai"), "ai"),
    (re.compile(r"\b(software|app|crm|erp|website|web|mobile|custom)\b", re.I), ChatLink(label="Software & Apps", to="/services/software"), "software"),
    (re.compile(r"\b(course|training|workshop|python|student|college)\b", re.I), ChatLink(label="Enquire about training", to="/contact?type=course"), "training"),
    (re.compile(r"\b(industry|industries|sector|sectors)\b", re.I), ChatLink(label="Industries we serve", to="/industries"), None),
    (re.compile(r"\b(partner|partners|network|cadpoint|collaboration)\b", re.I), ChatLink(label="Our Network", to="/our-network"), None),
    (re.compile(r"\b(founder|leadership|our team|meet the team|who works)\b", re.I), ChatLink(label="Our Team", to="/our-team"), None),
    (re.compile(r"\b(blog|blogs|article|articles|insight|insights|news)\b", re.I), ChatLink(label="Read our Insights", to="/insights"), None),
    (re.compile(r"\b(marketing|seo|social|ads)\b", re.I), ChatLink(label="Digital Growth", to="/services/growth"), None),
    (re.compile(r"\b(cad|civil|mechanical|drafting|3d)\b", re.I), ChatLink(label="CAD & Engineering", to="/services/engineering"), None),
    (re.compile(r"\b(contact|project|price|pricing|cost|quote|enquiry|talk|call|whatsapp|reach)\b", re.I), ChatLink(label="Contact the team", to="/contact"), "project"),
]
_CONTACT_LINK = ChatLink(label="Contact the team", to="/contact")


def pick_extras(text: str) -> tuple[list[ChatLink], bool, list[str]]:
    links: list[ChatLink] = []
    follow: list[str] = []
    for pattern, link, chip in _INTENTS:
        if pattern.search(text) and link not in links:
            links.append(link)
            if chip and chip not in follow:
                follow.append(chip)
        if len(links) == 2:
            break
    wants_person = bool(re.search(r"\b(contact|price|pricing|cost|quote|whatsapp|call|talk|branch|address|demo)\b", text, re.I))
    return links, wants_person, follow[:3]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _record_usage(db: Session, *, session_id: uuid.UUID | None, status: str, model: str | None = None, latency_ms: int | None = None,
                  input_tokens: int | None = None, output_tokens: int | None = None, request_id: str | None = None) -> None:
    db.add(AiUsage(session_id=session_id, status=status, model=model, latency_ms=latency_ms, input_tokens=input_tokens,
                   output_tokens=output_tokens, provider_request_id=request_id))


def _unavailable(db: Session, settings: Settings, status: str, http_status: int, code: str, exc: ConfigError | None = None) -> ApiError:
    _record_usage(db, session_id=None, status=status)
    db.commit()
    message = FALLBACK_MESSAGE
    if exc is not None and not settings.is_production:
        message += f" [developer hint: {exc}]"  # development only; never shown in production
    return ApiError(http_status, code, message)


def _tokens_used_today(db: Session) -> int:
    start = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    total = db.scalar(select(func.coalesce(func.sum(func.coalesce(AiUsage.input_tokens, 0) + func.coalesce(AiUsage.output_tokens, 0)), 0)).where(AiUsage.created_at >= start))
    return int(total or 0)


def _load_session(db: Session, settings: Settings, user: User | None, data: ChatRequest) -> ChatSession:
    """Return the caller's session. Wrong id, wrong token, other user or expired all look the same: not found."""
    not_found = ApiError(404, "chat_session_not_found", "That conversation was not found. Please start a new one.")
    session = db.get(ChatSession, data.session_id) if data.session_id else None
    if session is None or not data.session_token or session.expires_at <= _now():
        raise not_found
    if not safe_equal(session.token_hash, token_digest(data.session_token, settings)):
        raise not_found
    if session.user_id is not None and (user is None or user.id != session.user_id):
        raise not_found
    return session


@dataclass
class _Prepared:
    session_id: uuid.UUID
    new_token: str | None
    context: list[dict[str, str]]
    instructions: str
    safety_id: str


def _model_name(settings: Settings) -> str | None:
    return getattr(settings, f"{settings.ai_provider}_model", None)


def _prepare(db: Session, settings: Settings, user: User | None, data: ChatRequest) -> _Prepared:
    """All the blocking database work before the provider call (validation, session, user message, bounded context)."""
    if len(data.message) > settings.chat_max_input_chars:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"message": f"Please keep your message under {settings.chat_max_input_chars} characters."})
    if not data.message.strip():
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"message": "Type a message first."})
    if any(len(h.content) > settings.chat_max_input_chars for h in data.history):
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"history": "A history message is too long."})

    if settings_service.get(db, "chatbot_enabled", True) is False:
        raise ApiError(503, "chat_disabled", "The assistant is switched off right now. Please use the contact form or WhatsApp and the team will help you directly.")
    try:
        settings.require_ai()
    except ConfigError as exc:
        raise _unavailable(db, settings, "not_configured", 503, "ai_not_configured", exc) from None

    if settings.chat_daily_token_budget and _tokens_used_today(db) >= settings.chat_daily_token_budget:
        raise _unavailable(db, settings, "budget_exceeded", 503, "ai_budget_exceeded")

    new_session_token: str | None = None
    if data.session_id:
        session = _load_session(db, settings, user, data)
    else:
        new_session_token = new_token()
        session = ChatSession(user_id=user.id if user else None, token_hash=token_digest(new_session_token, settings),
                              expires_at=_now() + timedelta(days=settings.chat_retention_days))
        db.add(session)
        db.flush()
    if session.message_count >= settings.chat_max_messages_per_session:
        raise ApiError(409, "conversation_limit", "This conversation has reached its length limit. Please start a new one.")

    user_msg = ChatMessage(session_id=session.id, role="user", content=data.message, status="received")
    db.add(user_msg)
    db.commit()  # persist before the (slow) provider call so no transaction is held open

    if data.session_id is None and data.history:
        # Stateless client: use its (validated, bounded) history as context for this first turn only; it is not stored.
        context = [{"role": h.role, "content": h.content} for h in data.history[-settings.chat_context_messages:]]
    else:
        recent = list(db.scalars(
            select(ChatMessage).where(ChatMessage.session_id == session.id, ChatMessage.status != "failed")
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id).limit(settings.chat_context_messages)
        ))
        recent.reverse()
        context = [{"role": m.role, "content": m.content} for m in recent]
    while context and context[0]["role"] != "user":
        context.pop(0)
    if not context or context[-1]["content"] != data.message:
        context.append({"role": "user", "content": data.message})
    context = context[-settings.chat_context_messages:] or context
    while context and context[0]["role"] != "user":
        context.pop(0)
    return _Prepared(session.id, new_session_token, context, build_instructions(list_branches(db), settings_service.get(db, "chatbot_instructions")),
                     hashlib.sha256(str(session.id).encode()).hexdigest()[:32])


def _set_user_status(db: Session, session_id: uuid.UUID, status: str) -> None:
    db.execute(ChatMessage.__table__.update().where(ChatMessage.session_id == session_id, ChatMessage.role == "user", ChatMessage.status == "received").values(status=status))


def _fail(db: Session, settings: Settings, prep: _Prepared, err: AIServiceError) -> ApiError:
    _set_user_status(db, prep.session_id, "failed")
    _record_usage(db, session_id=prep.session_id, status=err.code, latency_ms=err.latency_ms, request_id=err.request_id, model=_model_name(settings))
    db.commit()
    message = settings_service.get(db, "chatbot_fallback") or err.user_message  # admin-configurable fallback text
    return ApiError(err.http_status, err.code, message, headers={"Retry-After": "30"} if err.http_status == 429 else None)


def _finish(db: Session, settings: Settings, prep: _Prepared, result, message: str) -> ChatResponse:
    session = db.get(ChatSession, prep.session_id)
    reply = ChatMessage(session_id=prep.session_id, role="assistant", content=result.text, status="completed", provider_response_id=result.response_id)
    db.add(reply)
    _set_user_status(db, prep.session_id, "completed")
    session.message_count += 2
    session.last_active_at = _now()
    session.expires_at = _now() + timedelta(days=settings.chat_retention_days)
    _record_usage(db, session_id=prep.session_id, status="ok", model=result.model, latency_ms=result.latency_ms,
                  input_tokens=result.input_tokens, output_tokens=result.output_tokens, request_id=result.request_id)
    db.commit()
    log.info("chat ok provider=%s session=%s latency_ms=%s in=%s out=%s", result.provider, prep.session_id, result.latency_ms, result.input_tokens, result.output_tokens)

    links, whatsapp, follow = pick_extras(message)
    if not links and whatsapp:
        links = [_CONTACT_LINK]
    return ChatResponse(
        reply=result.text, conversation_id=prep.session_id, provider=result.provider,
        session_id=prep.session_id, session_token=prep.new_token,
        message=ChatReply(id=str(reply.id), text=result.text),
        links=links, whatsapp=whatsapp, follow_ups=follow,
        meta={"status": "ok", "latency_ms": result.latency_ms},
    )


async def handle_chat(db: Session, settings: Settings, ai: AIService, user: User | None, data: ChatRequest) -> ChatResponse:
    prep = await run_in_threadpool(_prepare, db, settings, user, data)
    try:
        result = await ai.generate(instructions=prep.instructions, messages=prep.context, safety_identifier=prep.safety_id)
    except AIServiceError as err:
        raise await run_in_threadpool(_fail, db, settings, prep, err) from None
    return await run_in_threadpool(_finish, db, settings, prep, result, data.message)


def purge_expired(db: Session) -> int:
    """Delete expired conversations (messages cascade). Run from the CLI / a scheduler."""
    result = db.execute(delete(ChatSession).where(ChatSession.expires_at <= _now()))
    db.commit()
    return result.rowcount or 0
