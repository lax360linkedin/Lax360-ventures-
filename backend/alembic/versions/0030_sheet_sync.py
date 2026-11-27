"""Google Sheets copy log (sheet_sync) and a sync mark on partnership applications.

New table `sheet_sync` (one row per record and worksheet category: status, attempts, last error) and `pt_applications.sheets_synced_at`. Nothing existing is changed or rewritten.

Rollback: `alembic downgrade 0029` drops the log table and the new column (the spreadsheet itself is untouched).

Revision ID: 0030
Revises: 0029
"""
import sqlalchemy as sa
from alembic import op

revision = "0030"
down_revision = "0029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sheet_sync",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("record_kind", sa.String(12), nullable=False),
        sa.Column("record_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("tab", sa.String(120), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.String(300)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("synced_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("record_kind", "record_id", "category", name="uq_sheet_sync_record_category"),
    )
    op.create_index("ix_sheet_sync_status", "sheet_sync", ["status", "updated_at"])
    op.execute('ALTER TABLE public."sheet_sync" ENABLE ROW LEVEL SECURITY')
    with op.batch_alter_table("pt_applications") as t:
        t.add_column(sa.Column("sheets_synced_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    with op.batch_alter_table("pt_applications") as t:
        t.drop_column("sheets_synced_at")
    op.drop_table("sheet_sync")
