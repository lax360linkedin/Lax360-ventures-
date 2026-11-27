"""Google Sheets copy log: one row per (record, worksheet category). The database record is the source of truth; this table says whether its copy reached the spreadsheet,
how many attempts were made and why the last one failed, so a failed copy can be seen in the admin panel and retried. Contains no applicant data and no credentials."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPk


class SheetSync(UUIDPk, Base):
    __tablename__ = "sheet_sync"
    __table_args__ = (
        UniqueConstraint("record_kind", "record_id", "category", name="record_category"),
        Index("ix_sheet_sync_status", "status", "updated_at"),
    )

    record_kind: Mapped[str] = mapped_column(String(12))  # enquiry | demo | application
    record_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    category: Mapped[str] = mapped_column(String(30))  # a key of app.enquiry_categories
    tab: Mapped[str] = mapped_column(String(120))  # the worksheet it was (or will be) written to
    status: Mapped[str] = mapped_column(String(10), default="pending", server_default="pending")  # pending | synced | failed
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_error: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
