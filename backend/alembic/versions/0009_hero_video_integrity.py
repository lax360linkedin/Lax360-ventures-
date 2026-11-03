"""Homepage videos: storage integrity, verification, safe (soft) deletion, availability windows and a fallback video.

Additive and non-destructive: no table is dropped or reset, no existing column changes, every existing video keeps its record and its
storage reference. New columns have safe defaults ('unknown' verification, not deleted, no window, not the fallback).

- bucket / sha256: where the object lives and a content hash (a second record for the same file is refused; old rows have no hash yet).
- deleted_at / delete_error: a deletion first marks the record, then removes the stored file, and only a confirmed removal drops the record.
  If removing the file fails the record stays (as a pending deletion) so nothing is silently lost.
- available_from / available_until: optional per-video playback window (Asia/Kolkata wall time is converted by the application).
- is_fallback: the one video shown when nothing else is eligible.
- verify_*: result of the last check that the stored file really exists and is publicly readable.
- last_play_*: the last playback result reported by a visitor's browser (diagnostics only).

Revision ID: 0009
Revises: 0008
"""
import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hero_videos", sa.Column("bucket", sa.String(63), nullable=True))
    op.add_column("hero_videos", sa.Column("sha256", sa.String(64), nullable=True))
    op.add_column("hero_videos", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("hero_videos", sa.Column("delete_error", sa.String(300), nullable=True))
    op.add_column("hero_videos", sa.Column("available_from", sa.DateTime(timezone=True), nullable=True))
    op.add_column("hero_videos", sa.Column("available_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("hero_videos", sa.Column("is_fallback", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("hero_videos", sa.Column("verify_status", sa.String(10), server_default="unknown", nullable=False))
    op.add_column("hero_videos", sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("hero_videos", sa.Column("verify_detail", sa.String(300), nullable=True))
    op.add_column("hero_videos", sa.Column("last_play_ok_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("hero_videos", sa.Column("last_play_error", sa.String(120), nullable=True))
    op.add_column("hero_videos", sa.Column("last_play_error_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint("ck_hero_videos_verify_status", "hero_videos", "verify_status in ('unknown','ok','missing','error')")
    op.create_check_constraint("ck_hero_videos_window", "hero_videos", "available_from IS NULL OR available_until IS NULL OR available_until > available_from")
    op.create_index("uq_hero_videos_sha256_live", "hero_videos", ["sha256"], unique=True, postgresql_where=sa.text("sha256 IS NOT NULL AND deleted_at IS NULL"))
    op.create_index("uq_hero_videos_one_fallback", "hero_videos", ["is_fallback"], unique=True, postgresql_where=sa.text("is_fallback AND deleted_at IS NULL"))
    op.create_index("ix_hero_videos_deleted_at", "hero_videos", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_hero_videos_deleted_at", table_name="hero_videos")
    op.drop_index("uq_hero_videos_one_fallback", table_name="hero_videos")
    op.drop_index("uq_hero_videos_sha256_live", table_name="hero_videos")
    op.drop_constraint("ck_hero_videos_window", "hero_videos", type_="check")
    op.drop_constraint("ck_hero_videos_verify_status", "hero_videos", type_="check")
    for col in ("last_play_error_at", "last_play_error", "last_play_ok_at", "verify_detail", "verified_at", "verify_status", "is_fallback",
                "available_until", "available_from", "delete_error", "deleted_at", "sha256", "bucket"):
        op.drop_column("hero_videos", col)
