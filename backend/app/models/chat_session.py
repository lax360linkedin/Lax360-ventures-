from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPk


class ChatSession(UUIDPk, Base):
    """One conversation. Ownership is proven by a secret session token (only its hash is stored here)
    and, when the visitor was signed in, by the user id. Rows expire (`expires_at`) and are purged."""

    __tablename__ = "chat_sessions"
    __table_args__ = (Index("ix_chat_sessions_expires_at", "expires_at"),)

    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    token_hash: Mapped[str] = mapped_column(String(64))
    message_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="session", cascade="all, delete-orphan", passive_deletes=True, order_by="ChatMessage.created_at")

