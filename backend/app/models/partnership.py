"""Partnership module: applications from the public "Partner With Us" pages and the admin-managed content that sits on top of the built-in page content.

Design: the nine opportunity pages (3 partnership types x 3 divisions) ship with original built-in content in the frontend (so they are prerendered for search engines). Everything an administrator may
change is stored here as small, validated overrides keyed by the page slug, so nothing is lost when the built-in content is improved. An application is only an ENQUIRY: it never creates a partner account.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPk

CATEGORIES = ("franchise", "authorized", "referral")
DIVISIONS = ("education", "digital-marketing", "it")
STATUSES = ("new", "contacted", "under_review", "consultation_scheduled", "documents_requested", "verification_in_progress", "agreement_pending", "approved", "rejected", "onboarding", "closed")


class PartnershipApplication(UUIDPk, Base):
    __tablename__ = "pt_applications"
    __table_args__ = (
        CheckConstraint("category in ('franchise','authorized','referral')", name="category"),
        UniqueConstraint("reference", name="reference"),
        Index("ix_pt_applications_status_created", "status", "created_at"),
        Index("ix_pt_applications_category_division", "category", "division"),
        Index("ix_pt_applications_fingerprint", "fingerprint", "created_at"),
    )

    reference: Mapped[str] = mapped_column(String(32))
    category: Mapped[str] = mapped_column(String(12))
    division: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default="new", server_default="new")
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(80))
    state: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(80))
    occupation: Mapped[str | None] = mapped_column(String(120))
    entity_type: Mapped[str | None] = mapped_column(String(20))  # individual | organization
    organization: Mapped[str | None] = mapped_column(String(160))
    preferred_location: Mapped[str | None] = mapped_column(String(160))
    answers: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # the partnership-specific answers (validated against a whitelist per category)
    consultation: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # a REQUEST for a meeting (date, time, method, mode): never a confirmed booking
    preferred_branch: Mapped[str | None] = mapped_column(String(40))
    assigned_branch: Mapped[str | None] = mapped_column(String(40))
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    consent_processing: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    consent_marketing: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_page: Mapped[str | None] = mapped_column(String(160))
    fingerprint: Mapped[str] = mapped_column(String(64))  # hash of e-mail + category + division: the same person sending the same form twice is stored once
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PartnershipMenuItem(UUIDPk, Base):
    """One entry of the Partner With Us navigation menu: a business division (or service) under a partnership category. The three built-in divisions exist in code; a row here only overrides
    their label, order and visibility. A row with builtin=false is an administrator-created entry that gets its own page at /{category}/{slug}."""

    __tablename__ = "pt_menu_items"
    __table_args__ = (
        CheckConstraint("category in ('franchise','authorized-partner','referral-partner')", name="category"),
        UniqueConstraint("category", "slug", name="category_slug"),
        Index("ix_pt_menu_items_category_sort", "category", "sort_order"),
    )

    category: Mapped[str] = mapped_column(String(24))
    slug: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(String(300))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    builtin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ApplicationEvent(UUIDPk, Base):
    """History of an application: status changes, internal notes, assignments, consultations and follow-ups. Rows are only added."""

    __tablename__ = "pt_application_events"
    __table_args__ = (CheckConstraint("kind in ('submitted','status','note','assign','consultation','followup')", name="kind"), Index("ix_pt_application_events_app", "application_id", "created_at"))

    application_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pt_applications.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(14))
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str | None] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(Text)
    author_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    author_name: Mapped[str] = mapped_column(String(120), default="Applicant")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PartnershipPage(Base):
    """Admin overrides for one partnership page (slug like 'franchise/education', 'franchise', 'overview'). No row = the built-in content, published."""

    __tablename__ = "pt_pages"

    slug: Mapped[str] = mapped_column(String(60), primary_key=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    content: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # validated text overrides (hero, intro, extra sections, hidden sections, CTA label)
    seo_title: Mapped[str | None] = mapped_column(String(160))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    noindex: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    commercial: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # {field: {"value": "...", "published": bool}}: unpublished fields are never sent to the public site
    hero_media_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("media_assets.id", ondelete="SET NULL"))
    hero_alt: Mapped[str | None] = mapped_column(String(200))
    brochure_media_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("media_assets.id", ondelete="SET NULL"))
    brochure_published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    brochure_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PartnershipFaq(UUIDPk, Base):
    __tablename__ = "pt_faqs"
    __table_args__ = (Index("ix_pt_faqs_scope_sort", "scope", "sort_order"),)

    scope: Mapped[str] = mapped_column(String(60), default="general")  # 'general' or a page slug
    question: Mapped[str] = mapped_column(String(300))
    answer: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PartnershipPolicy(UUIDPk, Base):
    """A public policy text (terms, privacy notice, ...), versioned. Only a PUBLISHED version is shown; a draft is never public. Publishing needs management and legal review (outside this system)."""

    __tablename__ = "pt_policies"
    __table_args__ = (
        CheckConstraint("status in ('draft','published','archived')", name="status"),
        UniqueConstraint("key", "scope", "version", name="key_scope_version"),
        Index("ix_pt_policies_key_scope", "key", "scope", "status"),
    )

    key: Mapped[str] = mapped_column(String(30))  # terms | privacy | commission | refund | confidentiality | ...
    scope: Mapped[str] = mapped_column(String(60), default="general")
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)  # plain text; paragraphs separated by blank lines (rendered as text, never as HTML)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    status: Mapped[str] = mapped_column(String(10), default="draft", server_default="draft")
    effective_date: Mapped[date | None] = mapped_column(Date)
    reviewed_by: Mapped[str | None] = mapped_column(String(160))  # who approved it (free text for the record)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PartnershipSetting(Base):
    __tablename__ = "pt_settings"

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # {"v": value}
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
