"""Initial schema: users, sessions, branches, demo requests, contact enquiries, chat, AI usage.

Seeds the three confirmed branches (Salem, Bangalore, Mumbai). Only Salem has an address on file in the
project (copied from the website data; still marked "to confirm" there). No other address or phone is invented.

Revision ID: 0001
Revises:
"""
import uuid

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

NOW = sa.text("now()")


def _ts(name: str, **kw) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), server_default=NOW, nullable=False, **kw)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), server_default="user", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("role in ('user','admin')", name="ck_users_role"),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("csrf_token", sa.String(64), nullable=False),
        _ts("created_at"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_auth_sessions"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_auth_sessions_user_id_users", ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
    )
    op.create_index("ix_auth_sessions_user_id_expires_at", "auth_sessions", ["user_id", "expires_at"])

    branches = op.create_table(
        "branches",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(40), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("city", sa.String(80), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_branches"),
        sa.UniqueConstraint("slug", name="uq_branches_slug"),
        sa.UniqueConstraint("city", name="uq_branches_city"),
    )

    op.create_table(
        "demo_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("company", sa.String(160), nullable=True),
        sa.Column("preferred_date", sa.Date(), nullable=True),
        sa.Column("interest", sa.String(80), nullable=True),
        sa.Column("branch_id", sa.Uuid(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_demo_requests"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_demo_requests_user_id_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], name="fk_demo_requests_branch_id_branches", ondelete="SET NULL"),
        sa.CheckConstraint("status in ('pending','contacted','confirmed','cancelled')", name="ck_demo_requests_status"),
    )
    op.create_index("ix_demo_requests_user_id_created_at", "demo_requests", ["user_id", "created_at"])
    op.create_index("ix_demo_requests_status_created_at", "demo_requests", ["status", "created_at"])
    op.create_index("ix_demo_requests_fingerprint", "demo_requests", ["fingerprint"])

    op.create_table(
        "contact_enquiries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("company", sa.String(160), nullable=True),
        sa.Column("enquiry_type", sa.String(30), nullable=False),
        sa.Column("subject", sa.String(160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("extra", sa.JSON(), nullable=True),
        sa.Column("branch_id", sa.Uuid(), nullable=True),
        sa.Column("consented", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("source", sa.String(30), nullable=True),
        sa.Column("status", sa.String(20), server_default="new", nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_contact_enquiries"),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], name="fk_contact_enquiries_branch_id_branches", ondelete="SET NULL"),
        sa.CheckConstraint("status in ('new','read','replied','closed','spam')", name="ck_contact_enquiries_status"),
    )
    op.create_index("ix_contact_enquiries_status_created_at", "contact_enquiries", ["status", "created_at"])
    op.create_index("ix_contact_enquiries_fingerprint", "contact_enquiries", ["fingerprint"])

    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("message_count", sa.Integer(), server_default="0", nullable=False),
        _ts("created_at"),
        _ts("last_active_at"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_chat_sessions"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_chat_sessions_user_id_users", ondelete="SET NULL"),
    )
    op.create_index("ix_chat_sessions_expires_at", "chat_sessions", ["expires_at"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provider_response_id", sa.String(80), nullable=True),
        _ts("created_at"),
        sa.PrimaryKeyConstraint("id", name="pk_chat_messages"),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], name="fk_chat_messages_session_id_chat_sessions", ondelete="CASCADE"),
        sa.CheckConstraint("role in ('user','assistant')", name="ck_chat_messages_role"),
        sa.CheckConstraint("status in ('received','completed','failed')", name="ck_chat_messages_status"),
    )
    op.create_index("ix_chat_messages_session_id_created_at", "chat_messages", ["session_id", "created_at"])

    op.create_table(
        "ai_usage",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("provider_request_id", sa.String(80), nullable=True),
        _ts("created_at"),
        sa.PrimaryKeyConstraint("id", name="pk_ai_usage"),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], name="fk_ai_usage_session_id_chat_sessions", ondelete="SET NULL"),
    )
    op.create_index("ix_ai_usage_created_at", "ai_usage", ["created_at"])

    # Confirmed branches. Address only for Salem (already present in the project); the others stay NULL.
    op.bulk_insert(
        branches,
        [
            {"id": uuid.uuid4(), "slug": "salem", "name": "LAX360 Ventures — Salem Branch", "city": "Salem", "sort_order": 1,
             "address": "LAX360 Pvt Ltd\n1st Floor, 16, CPS Tower\nAdvaitha Ashram Rd, Fairlands\nSalem, Tamil Nadu 636007"},
            {"id": uuid.uuid4(), "slug": "bangalore", "name": "LAX360 Ventures — Bangalore Branch", "city": "Bangalore", "sort_order": 2, "address": None},
            {"id": uuid.uuid4(), "slug": "mumbai", "name": "LAX360 Ventures — Mumbai Branch", "city": "Mumbai", "sort_order": 3, "address": None},
        ],
    )


def downgrade() -> None:
    for table in ("ai_usage", "chat_messages", "chat_sessions", "contact_enquiries", "demo_requests", "branches", "auth_sessions", "users"):
        op.drop_table(table)
