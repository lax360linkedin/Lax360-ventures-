"""Homepage background videos. The files live on disk (see HERO_VIDEO_DIR); the database holds only metadata and the schedule."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPk


class HeroVideo(UUIDPk, Timestamps, Base):
    __tablename__ = "hero_videos"
    __table_args__ = (Index("ix_hero_videos_position", "position"),)

    title: Mapped[str] = mapped_column(String(120))
    original_name: Mapped[str] = mapped_column(String(200))
    storage_key: Mapped[str] = mapped_column(String(80), unique=True)  # file name inside HERO_VIDEO_DIR (random, never the uploaded name)
    poster_key: Mapped[str | None] = mapped_column(String(80))
    content_type: Mapped[str] = mapped_column(String(30))
    size_bytes: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # playback queue order (1 = first)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))


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
