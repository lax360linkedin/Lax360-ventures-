"""Homepage videos: remember where each video's files live (`storage`: 'local' server disk or 'supabase' Storage).

Existing rows are 'local' (that is where they were saved), so nothing changes for them.

Revision ID: 0007
Revises: 0006
"""
import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hero_videos", sa.Column("storage", sa.String(10), server_default="local", nullable=False))
    op.create_check_constraint("ck_hero_videos_storage", "hero_videos", "storage in ('local','supabase')")


def downgrade() -> None:
    op.drop_constraint("ck_hero_videos_storage", "hero_videos", type_="check")
    op.drop_column("hero_videos", "storage")
