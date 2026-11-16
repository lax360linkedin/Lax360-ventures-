"""Google Sheets sync marker (one nullable column on two tables, nothing else changes).

`sheets_synced_at` is set when a submission has been appended to the Google Spreadsheet. NULL means "not (yet) in the sheet": the sync retries those rows, so a failed append is never
lost, and a row that is already in the sheet is never appended twice. Existing rows stay NULL; the sync only looks at recent submissions unless asked otherwise.

Revision ID: 0017
Revises: 0016
"""
import sqlalchemy as sa
from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("contact_enquiries", "demo_requests"):
        op.add_column(table, sa.Column("sheets_synced_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    for table in ("contact_enquiries", "demo_requests"):
        op.drop_column(table, "sheets_synced_at")
