"""Registration details of website customers (new table; nothing existing is changed).

One row per customer: mobile number, category (student / working professional / other), the category's details, and why they visit. Accounts created before this have no row.
Row-level security is enabled like every other table (the backend connects as the owner; the public Supabase API gets no access).

Revision ID: 0015
Revises: 0014
"""
import sqlalchemy as sa
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("mobile", sa.String(20)),
        sa.Column("category", sa.String(15)),
        sa.Column("institution", sa.String(160)),
        sa.Column("course", sa.String(120)),
        sa.Column("department", sa.String(120)),
        sa.Column("study_year", sa.String(20)),
        sa.Column("company", sa.String(160)),
        sa.Column("job_role", sa.String(120)),
        sa.Column("industry", sa.String(120)),
        sa.Column("experience_years", sa.Integer()),
        sa.Column("other_details", sa.String(300)),
        sa.Column("purposes", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("purpose_note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("category in ('student','professional','other')", name="ck_user_profiles_category"),
    )
    op.create_index("ix_user_profiles_category", "user_profiles", ["category"])
    op.create_index("ix_user_profiles_mobile", "user_profiles", ["mobile"])
    op.execute('ALTER TABLE public."user_profiles" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    op.drop_table("user_profiles")
