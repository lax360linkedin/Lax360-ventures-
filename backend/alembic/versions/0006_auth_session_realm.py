"""Separate public-website sessions from company-admin sessions: `auth_sessions.realm` ('public' | 'admin').

Only adds a column with a default; no user, role or password is touched. Existing sessions become 'public' sessions, which
staff accounts can no longer use on the public site (they sign in again through the admin login).

Revision ID: 0006
Revises: 0005
"""
import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("auth_sessions", sa.Column("realm", sa.String(10), server_default="public", nullable=False))
    op.create_check_constraint("ck_auth_sessions_realm", "auth_sessions", "realm in ('public','admin')")


def downgrade() -> None:
    op.drop_constraint("ck_auth_sessions_realm", "auth_sessions", type_="check")
    op.drop_column("auth_sessions", "realm")
