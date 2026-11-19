from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPk


class Translation(UUIDPk, Timestamps, Base):
    """One website text translated into one language, edited in the admin panel (Translations). `source` is the English text exactly as the website shows it (whitespace collapsed); the
    website replaces that text with `value` when a visitor uses the language, and shows the English when no translation exists. Added on top of the translations shipped with the website."""

    __tablename__ = "translations"
    __table_args__ = (UniqueConstraint("lang", "source_hash", name="uq_translations_lang_source_hash"),)

    lang: Mapped[str] = mapped_column(String(8))
    source_hash: Mapped[str] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(Text)
    value: Mapped[str] = mapped_column(Text)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
