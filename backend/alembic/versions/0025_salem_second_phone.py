"""A second phone number for the Salem branch (+91 86676 30258), next to the existing one.

A branch's `phone` can now hold several numbers separated by commas (the column is widened from 32 to 80 characters). Salem keeps +91 95666 79928 and gains +91 86676 30258; the number is only
added when Salem still has the original number (a phone an administrator has already changed is left alone). The same number is also added to the website's contact list (footer and Contact
page, labelled "Salem") when it is not there yet. Nothing is removed or replaced.

Revision ID: 0025
Revises: 0024
"""
import sqlalchemy as sa
from alembic import op

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None

OLD, NEW = "+91 95666 79928", "+91 86676 30258"
CHANNEL_ID = "3d5f0f0e-5b6e-5a39-9a43-8667630258aa"


def upgrade() -> None:
    op.alter_column("branches", "phone", existing_type=sa.String(32), type_=sa.String(80), existing_nullable=True)
    op.execute(f"UPDATE branches SET phone = '{OLD}, {NEW}' WHERE slug = 'salem' AND phone = '{OLD}'")
    op.execute(
        "INSERT INTO contact_channels (id, owner_type, owner_ref, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) "
        f"SELECT CAST('{CHANNEL_ID}' AS uuid), 'global', NULL, 'contact', 'phone', 'Phone', '{NEW}', 'Salem', CAST('[\"footer\", \"contact\"]' AS json), true, "
        "COALESCE((SELECT MAX(sort_order) FROM contact_channels WHERE owner_type = 'global'), 0) + 10, 'contact:phone:918667630258' "
        "WHERE NOT EXISTS (SELECT 1 FROM contact_channels WHERE dedupe_key = 'contact:phone:918667630258')"
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM contact_channels WHERE id = CAST('{CHANNEL_ID}' AS uuid)")
    op.execute(f"UPDATE branches SET phone = '{OLD}' WHERE slug = 'salem' AND phone = '{OLD}, {NEW}'")
    op.execute("UPDATE branches SET phone = substr(phone, 1, 32) WHERE phone IS NOT NULL AND length(phone) > 32")
    op.alter_column("branches", "phone", existing_type=sa.String(80), type_=sa.String(32), existing_nullable=True)
