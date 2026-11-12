from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPk

ROLES = ("user", "admin", "super_admin")


class User(UUIDPk, Timestamps, Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role in ('user','admin','super_admin')", name="role"),)

    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True)  # stored lower-cased
    username: Mapped[str | None] = mapped_column(String(60), unique=True)  # optional alternative login name (lower-cased)
    password_hash: Mapped[str] = mapped_column(String(255))  # argon2id; never the password
    role: Mapped[str] = mapped_column(String(20), default="user", server_default="user")
    permissions: Mapped[list] = mapped_column(JSON, default=list, server_default=text("'[]'"))  # admin modules this admin may use
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    sessions: Mapped[list[AuthSession]] = relationship(back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    profile: Mapped["UserProfile | None"] = relationship(back_populates="user", cascade="all, delete-orphan", passive_deletes=True, uselist=False)


class UserProfile(Base):
    """What a customer told us at registration (one row per customer; accounts created before this existed have none). Only the account's owner and authorised administrators can read it.
    Deleting the account deletes this row."""

    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint("category in ('student','professional','other')", name="category"),
        Index("ix_user_profiles_category", "category"),
        Index("ix_user_profiles_mobile", "mobile"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    mobile: Mapped[str | None] = mapped_column(String(20))
    category: Mapped[str | None] = mapped_column(String(15))
    institution: Mapped[str | None] = mapped_column(String(160))
    course: Mapped[str | None] = mapped_column(String(120))
    department: Mapped[str | None] = mapped_column(String(120))
    study_year: Mapped[str | None] = mapped_column(String(20))
    company: Mapped[str | None] = mapped_column(String(160))
    job_role: Mapped[str | None] = mapped_column(String(120))
    industry: Mapped[str | None] = mapped_column(String(120))
    experience_years: Mapped[int | None] = mapped_column(Integer)
    other_details: Mapped[str | None] = mapped_column(String(300))
    purposes: Mapped[list] = mapped_column(JSON, default=list, server_default=text("'[]'"))
    purpose_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship(back_populates="profile")


class AuthSession(UUIDPk, Base):
    """Server-side login session. The browser holds only an opaque random token (HttpOnly cookie);
    this row stores its keyed hash, so sessions can be revoked and a database leak reveals no live tokens."""

    __tablename__ = "auth_sessions"
    __table_args__ = (Index("ix_auth_sessions_user_id_expires_at", "user_id", "expires_at"), CheckConstraint("realm in ('public','admin')", name="realm"))

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    csrf_token: Mapped[str] = mapped_column(String(64))
    realm: Mapped[str] = mapped_column(String(10), default="public", server_default="public")  # 'public' website session or 'admin' company-admin session; never interchangeable
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")
