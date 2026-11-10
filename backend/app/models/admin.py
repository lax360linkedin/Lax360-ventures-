"""Admin-panel tables: enquiry notes, site settings, CMS content, media and the audit log."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, LargeBinary, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, deferred, mapped_column

from app.db.base import Base, Timestamps, UUIDPk


class EnquiryNote(UUIDPk, Base):
    __tablename__ = "enquiry_notes"
    __table_args__ = (Index("ix_enquiry_notes_enquiry_id_created_at", "enquiry_id", "created_at"),)

    enquiry_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("contact_enquiries.id", ondelete="CASCADE"))
    author_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    author_name: Mapped[str] = mapped_column(String(120))  # snapshot, so the note stays attributed if the account changes
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EnquiryFollowup(UUIDPk, Base):
    """A follow-up on an enquiry: a call, email, WhatsApp message or meeting that happened or is planned (`due_on`), with a summary and a done flag."""

    __tablename__ = "enquiry_followups"
    __table_args__ = (
        CheckConstraint("kind in ('call','email','whatsapp','meeting','other')", name="kind"),
        Index("ix_enquiry_followups_enquiry_id_created_at", "enquiry_id", "created_at"),
        Index("ix_enquiry_followups_due_on", "due_on"),
    )

    enquiry_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("contact_enquiries.id", ondelete="CASCADE"))
    author_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    author_name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(12), default="call")
    summary: Mapped[str] = mapped_column(Text)
    due_on: Mapped[date | None] = mapped_column(Date)
    done: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SiteSetting(Base):
    """Key/value website settings. `is_public` keys are served to the public site; the rest are admin-only.
    Never store secrets here (keys, passwords): those stay in the backend environment."""

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[object] = mapped_column(JSON)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))


class ContentItem(UUIDPk, Timestamps, Base):
    """A piece of managed website content (hero text, an FAQ entry, a project…). Only `published` items are public."""

    __tablename__ = "content_items"
    __table_args__ = (
        CheckConstraint("status in ('draft','published')", name="status"),
        UniqueConstraint("kind", "slug", name="uq_content_items_kind_slug"),
        Index("ix_content_items_kind_status_sort", "kind", "status", "sort_order"),
    )

    kind: Mapped[str] = mapped_column(String(30))
    slug: Mapped[str | None] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(200))
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="draft", server_default="draft")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))


class MediaAsset(UUIDPk, Timestamps, Base):
    """An uploaded image/PDF stored in the database (no extra storage credentials). Private unless `is_public`."""

    __tablename__ = "media_assets"
    __table_args__ = (
        Index("ix_media_assets_created_at", "created_at"), Index("ix_media_assets_sha256", "sha256"), Index("ix_media_assets_kind", "kind"),
        CheckConstraint("storage in ('db','local','supabase')", name="storage"), CheckConstraint("kind in ('image','video','document')", name="kind"),
        CheckConstraint("data IS NOT NULL OR storage_key IS NOT NULL", name="has_file"),
    )

    filename: Mapped[str] = mapped_column(String(200))
    content_type: Mapped[str] = mapped_column(String(60))
    size_bytes: Mapped[int] = mapped_column(Integer)
    alt_text: Mapped[str | None] = mapped_column(String(200))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    # Where the file lives: 'supabase' (durable object storage), 'local' (development disk) or 'db' (older uploads kept in the database; never removed).
    storage: Mapped[str] = mapped_column(String(10), default="db", server_default="db")
    storage_key: Mapped[str | None] = mapped_column(String(120))
    bucket: Mapped[str | None] = mapped_column(String(63))
    sha256: Mapped[str | None] = mapped_column(String(64))  # content hash: identical re-uploads are detected instead of stored twice
    kind: Mapped[str] = mapped_column(String(12), default="image", server_default="image")  # image | video | document
    data: Mapped[bytes | None] = deferred(mapped_column(LargeBinary, nullable=True))  # only for storage='db'; loaded only when a file is served


class AuditLog(UUIDPk, Base):
    """Append-only record of administrative actions. A database trigger rejects UPDATE/DELETE (see migration 0003)."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint("status in ('success','failure')", name="status"),
        Index("ix_audit_logs_created_at", "created_at"),
        Index("ix_audit_logs_admin_id_created_at", "admin_id", "created_at"),
        Index("ix_audit_logs_action", "action"),
    )

    admin_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    admin_email: Mapped[str] = mapped_column(String(254))
    action: Mapped[str] = mapped_column(String(60))
    resource_type: Mapped[str | None] = mapped_column(String(40))
    resource_id: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(10), default="success")
    detail: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
