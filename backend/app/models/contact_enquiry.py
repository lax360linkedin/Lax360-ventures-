from __future__ import annotations

import uuid

from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPk
from app.models.branch import Branch

# "in_progress" is kept for enquiries handled before the fuller pipeline existed; new work uses the stages from "contacted" to "closed".
ENQUIRY_STATUSES = ("new", "in_progress", "contacted", "qualified", "proposal_sent", "negotiation", "converted", "not_interested", "closed")


class ContactEnquiry(UUIDPk, Timestamps, Base):
    __tablename__ = "contact_enquiries"
    __table_args__ = (
        CheckConstraint("status in ('new','in_progress','contacted','qualified','proposal_sent','negotiation','converted','not_interested','closed')", name="status"),
        Index("ix_contact_enquiries_status_created_at", "status", "created_at"),
        Index("ix_contact_enquiries_fingerprint", "fingerprint"),
    )

    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(32))
    company: Mapped[str | None] = mapped_column(String(160))
    enquiry_type: Mapped[str] = mapped_column(String(30))
    subject: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    extra: Mapped[dict | None] = mapped_column(JSON)  # type-specific answers (course, timeline, …)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("branches.id", ondelete="SET NULL"))
    consented: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    source: Mapped[str | None] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="new", server_default="new")
    fingerprint: Mapped[str] = mapped_column(String(64))
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    branch: Mapped[Branch | None] = relationship(lazy="joined")
