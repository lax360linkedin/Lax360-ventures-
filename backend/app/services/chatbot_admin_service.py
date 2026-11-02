"""Admin views of the AI chatbot: stored conversations, usage and failures. Only data that is really stored is shown
(conversations are kept for CHAT_RETENTION_DAYS; usage rows hold metadata only, never message text or keys)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import AiUsage, ChatMessage, ChatSession, User
from app.utils_validation import LIKE_ESCAPE, like_pattern


def search_conversations(db: Session, *, q: str | None, status: str | None, date_from: datetime | None, date_to: datetime | None,
                         page: int, page_size: int) -> tuple[list[dict], int]:
    stmt = select(ChatSession)
    if q:
        stmt = stmt.where(exists().where(ChatMessage.session_id == ChatSession.id, ChatMessage.content.ilike(like_pattern(q.strip()), escape=LIKE_ESCAPE)))
    if status == "failed":
        stmt = stmt.where(exists().where(ChatMessage.session_id == ChatSession.id, ChatMessage.status == "failed"))
    if date_from:
        stmt = stmt.where(ChatSession.created_at >= date_from)
    if date_to:
        stmt = stmt.where(ChatSession.created_at < date_to)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    sessions = list(db.scalars(stmt.order_by(ChatSession.last_active_at.desc()).limit(page_size).offset((page - 1) * page_size)))
    items = []
    for s in sessions:
        first = db.scalar(select(ChatMessage.content).where(ChatMessage.session_id == s.id, ChatMessage.role == "user").order_by(ChatMessage.created_at).limit(1))
        failed = db.scalar(select(func.count()).select_from(ChatMessage).where(ChatMessage.session_id == s.id, ChatMessage.status == "failed")) or 0
        email = db.scalar(select(User.email).where(User.id == s.user_id)) if s.user_id else None
        items.append({"id": str(s.id), "created_at": s.created_at.isoformat(), "last_active_at": s.last_active_at.isoformat(), "messages": s.message_count,
                      "failed": failed, "preview": (first or "")[:140], "visitor": email or "anonymous", "expires_at": s.expires_at.isoformat()})
    return items, total


def conversation(db: Session, session_id: uuid.UUID) -> dict:
    s = db.get(ChatSession, session_id)
    if s is None:
        raise ApiError(404, "not_found", "Conversation not found (it may have expired and been deleted).")
    msgs = db.scalars(select(ChatMessage).where(ChatMessage.session_id == s.id).order_by(ChatMessage.created_at)).all()
    return {"id": str(s.id), "created_at": s.created_at.isoformat(), "expires_at": s.expires_at.isoformat(),
            "messages": [{"id": str(m.id), "role": m.role, "content": m.content, "status": m.status, "created_at": m.created_at.isoformat()} for m in msgs]}


def usage_stats(db: Session, days: int) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        select(AiUsage.status, func.count(), func.coalesce(func.sum(AiUsage.input_tokens), 0), func.coalesce(func.sum(AiUsage.output_tokens), 0), func.coalesce(func.avg(AiUsage.latency_ms), 0))
        .where(AiUsage.created_at >= since).group_by(AiUsage.status).order_by(func.count().desc())
    ).all()
    total = sum(r[1] for r in rows)
    ok = sum(r[1] for r in rows if r[0] == "ok")
    return {"days": days, "requests": total, "ok": ok, "errors": total - ok,
            "by_status": [{"status": s, "requests": n, "input_tokens": int(i), "output_tokens": int(o), "avg_latency_ms": int(a)} for s, n, i, o, a in rows]}


def recent_failures(db: Session, limit: int = 50) -> list[dict]:
    rows = db.scalars(select(AiUsage).where(AiUsage.status != "ok").order_by(AiUsage.created_at.desc()).limit(limit))
    return [{"id": str(r.id), "status": r.status, "model": r.model, "latency_ms": r.latency_ms, "created_at": r.created_at.isoformat()} for r in rows]
