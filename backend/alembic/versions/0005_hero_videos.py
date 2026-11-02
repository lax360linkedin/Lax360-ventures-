"""Homepage background videos (metadata + persistent schedule). The video files themselves are stored on disk, not in the database.

Revision ID: 0005
Revises: 0004
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

NEW_TABLES = ("hero_videos", "hero_video_config")
REVOKE_API_ROLES = """
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
    END IF;
  END LOOP;
END
$$;
"""


def _ts(name):
    return sa.Column(name, sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False)


def upgrade() -> None:
    op.create_table(
        "hero_videos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("original_name", sa.String(200), nullable=False),
        sa.Column("storage_key", sa.String(80), nullable=False),
        sa.Column("poster_key", sa.String(80), nullable=True),
        sa.Column("content_type", sa.String(30), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("uploaded_by", sa.Uuid(), nullable=True),
        _ts("created_at"),
        _ts("updated_at"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], name="fk_hero_videos_uploaded_by_users", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_hero_videos"),
        sa.UniqueConstraint("storage_key", name="uq_hero_videos_storage_key"),
    )
    op.create_index("ix_hero_videos_position", "hero_videos", ["position"])
    op.create_table(
        "hero_video_config",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_days", sa.Integer(), server_default="3", nullable=False),
        sa.Column("repeat", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("anchor_video_id", sa.Uuid(), nullable=True),
        sa.Column("anchor_start", sa.DateTime(timezone=True), nullable=True),
        _ts("updated_at"),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        sa.CheckConstraint("id = 1", name="ck_hero_video_config_single_row"),
        sa.CheckConstraint("slot_days between 1 and 30", name="ck_hero_video_config_slot_days"),
        sa.ForeignKeyConstraint(["anchor_video_id"], ["hero_videos.id"], name="fk_hero_video_config_anchor_video_id_hero_videos", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name="fk_hero_video_config_updated_by_users", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_hero_video_config"),
    )
    for table in NEW_TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
    op.execute(REVOKE_API_ROLES)


def downgrade() -> None:
    op.drop_table("hero_video_config")
    op.drop_index("ix_hero_videos_position", table_name="hero_videos")
    op.drop_table("hero_videos")
