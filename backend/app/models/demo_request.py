from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPk
from app.models.branch import Branch

DEMO_STATUSES = ("pending", "contacted", "confirmed", "cancelled")


class DemoRequest(UUIDPk, Timestamps, Base):
    """A request for a demo. `pending` until a person at LAX360 follows up; submitting never means confirmed."""

    __tablename__ = "demo_requests"
    __table_args__ = (
        CheckConstraint("status in ('pending','contacted','confirmed','cancelled')", name="status"),
        Index("ix_demo_requests_user_id_created_at", "user_id", "created_at"),
        Index("ix_demo_requests_status_created_at", "status", "created_at"),
        Index("ix_demo_requests_fingerprint", "fingerprint"),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    company: Mapped[str | None] = mapped_column(String(160))
    preferred_date: Mapped[date | None] = mapped_column(Date)
    interest: Mapped[str | None] = mapped_column(String(80))
    branch_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("branches.id", ondelete="SET NULL"))
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    fingerprint: Mapped[str] = mapped_column(String(64))  # duplicate-submission guard

    branch: Mapped[Branch | None] = relationship(lazy="joined")
