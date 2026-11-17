"""Branch-wise and partner-wise social links and contact details.

`contact_channels` gets an owner: `global` (the LAX360 list, every existing row), `branch` (owner_ref = the branch slug) or `partner` (owner_ref = the partner slug). Existing rows stay global
and unchanged; each branch and partner gets its own, independent list.

Revision ID: 0019
Revises: 0018
"""
import sqlalchemy as sa
from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contact_channels", sa.Column("owner_type", sa.String(10), nullable=False, server_default="global"))
    op.add_column("contact_channels", sa.Column("owner_ref", sa.String(120), nullable=True))
    op.create_check_constraint("owner", "contact_channels", "(owner_type = 'global' AND owner_ref IS NULL) OR (owner_type IN ('branch','partner') AND owner_ref IS NOT NULL)")


def downgrade() -> None:
    op.drop_constraint("owner", "contact_channels", type_="check")
    op.drop_column("contact_channels", "owner_ref")
    op.drop_column("contact_channels", "owner_type")
