"""Homepage background videos. The files live on disk (see HERO_VIDEO_DIR); the database holds only metadata and the schedule."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPk


class HeroVideo(UUIDPk, Timestamps, Base):
    __tablename__ = "hero_videos"
    __table_args__ = (
        Index("ix_hero_videos_position", "position"), Index("ix_hero_videos_deleted_at", "deleted_at"),
        CheckConstraint("storage in ('local','supabase')", name="storage"),
        CheckConstraint("verify_status in ('unknown','ok','missing','error')", name="verify_status"),
        CheckConstraint("available_from IS NULL OR available_until IS NULL OR available_until > available_from", name="window"),
        Index("uq_hero_videos_sha256_live", "sha256", unique=True, postgresql_where=text("sha256 IS NOT NULL AND deleted_at IS NULL")),
        Index("uq_hero_videos_one_fallback", "is_fallback", unique=True, postgresql_where=text("is_fallback AND deleted_at IS NULL")),
    )

    title: Mapped[str] = mapped_column(String(120))
    original_name: Mapped[str] = mapped_column(String(200))
    storage_key: Mapped[str] = mapped_column(String(80), unique=True)  # file name inside HERO_VIDEO_DIR (random, never the uploaded name)
    poster_key: Mapped[str | None] = mapped_column(String(80))
    storage: Mapped[str] = mapped_column(String(10), default="local", server_default="local")  # where the files live: 'local' disk or 'supabase' Storage
    content_type: Mapped[str] = mapped_column(String(30))
    size_bytes: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # playback queue order (1 = first)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    bucket: Mapped[str | None] = mapped_column(String(63))  # the storage bucket (None = the configured HERO_VIDEO_BUCKET)
    sha256: Mapped[str | None] = mapped_column(String(64))  # content hash: the same file cannot be recorded twice
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # set while a deletion is in progress or its file removal failed
    delete_error: Mapped[str | None] = mapped_column(String(300))
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")  # shown when no other video is eligible
    verify_status: Mapped[str] = mapped_column(String(10), default="unknown", server_default="unknown")  # unknown | ok | missing | error
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verify_detail: Mapped[str | None] = mapped_column(String(300))
    last_play_ok_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # last playback a visitor's browser reported
    last_play_error: Mapped[str | None] = mapped_column(String(120))
    last_play_error_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class HeroVideoConfig(Base):
    """The single persistent schedule (row id = 1). Slots are counted from `anchor_start`, always starting with `anchor_video_id`;
    every change to the queue re-anchors on the slot that is playing, so edits never interrupt it."""

    __tablename__ = "hero_video_config"
    __table_args__ = (CheckConstraint("id = 1", name="single_row"), CheckConstraint("slot_days between 1 and 30", name="slot_days"))

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))  # nothing is scheduled before this instant
    slot_days: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    repeat: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    anchor_video_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("hero_videos.id", ondelete="SET NULL"))
    anchor_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
