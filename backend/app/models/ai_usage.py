from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPk


class AiUsage(UUIDPk, Base):
    """Operational metadata for each assistant call (no prompt or reply content). Feeds the daily budget and metrics."""

    __tablename__ = "ai_usage"
    __table_args__ = (Index("ix_ai_usage_created_at", "created_at"),)

    session_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("chat_sessions.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(30))  # ok | not_configured | budget_exceeded | provider_* …
    model: Mapped[str | None] = mapped_column(String(100))
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    provider_request_id: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
