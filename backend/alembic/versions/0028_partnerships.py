"""Partnership module (Franchise, Authorized Partner, Referral Partner). New tables only: nothing existing is changed.

Tables: pt_menu_items (the Partner With Us menu), pt_applications (public applications; an ENQUIRY, never a partner account), pt_application_events (status history and notes), pt_pages (admin overrides per page),
pt_faqs, pt_policies (versioned, draft/published), pt_settings. RLS is enabled without policies, like the other tables: only the backend's trusted role reads and writes them.

Rollback: `alembic downgrade 0027` drops these tables (applications and content are lost).

Revision ID: 0028
Revises: 0027
"""
import sqlalchemy as sa
from alembic import op

revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None

TABLES = ("pt_applications", "pt_application_events", "pt_pages", "pt_faqs", "pt_policies", "pt_settings", "pt_menu_items")
NOW = sa.text("now()")


def _fk(col, target, name, ondelete="SET NULL", **kw):
    return sa.Column(col, sa.Uuid(), sa.ForeignKey(target, ondelete=ondelete, name=name), **kw)


def upgrade() -> None:
    op.create_table(
        "pt_applications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("reference", sa.String(32), nullable=False),
        sa.Column("category", sa.String(12), nullable=False),
        sa.Column("division", sa.String(20), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="new"),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("country", sa.String(80), nullable=False),
        sa.Column("state", sa.String(80)),
        sa.Column("city", sa.String(80)),
        sa.Column("occupation", sa.String(120)),
        sa.Column("entity_type", sa.String(20)),
        sa.Column("organization", sa.String(160)),
        sa.Column("preferred_location", sa.String(160)),
        sa.Column("answers", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("consultation", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("preferred_branch", sa.String(40)),
        sa.Column("assigned_branch", sa.String(40)),
        _fk("assigned_to", "users.id", "fk_pt_applications_assigned_to_users"),
        sa.Column("consent_processing", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("consent_marketing", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("consent_at", sa.DateTime(timezone=True)),
        sa.Column("source_page", sa.String(160)),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.UniqueConstraint("reference", name="uq_pt_applications_reference"),
        sa.CheckConstraint("category in ('franchise','authorized','referral')", name="ck_pt_applications_category"),
    )
    op.create_index("ix_pt_applications_status_created", "pt_applications", ["status", "created_at"])
    op.create_index("ix_pt_applications_category_division", "pt_applications", ["category", "division"])
    op.create_index("ix_pt_applications_fingerprint", "pt_applications", ["fingerprint", "created_at"])
    op.create_table(
        "pt_application_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("application_id", sa.Uuid(), sa.ForeignKey("pt_applications.id", ondelete="CASCADE", name="fk_pt_application_events_application_id_pt_applications"), nullable=False),
        sa.Column("kind", sa.String(14), nullable=False),
        sa.Column("from_status", sa.String(30)),
        sa.Column("to_status", sa.String(30)),
        sa.Column("note", sa.Text()),
        _fk("author_id", "users.id", "fk_pt_application_events_author_id_users"),
        sa.Column("author_name", sa.String(120), nullable=False, server_default="Applicant"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.CheckConstraint("kind in ('submitted','status','note','assign','consultation','followup')", name="ck_pt_application_events_kind"),
    )
    op.create_index("ix_pt_application_events_app", "pt_application_events", ["application_id", "created_at"])
    op.create_table(
        "pt_pages",
        sa.Column("slug", sa.String(60), primary_key=True),
        sa.Column("published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("content", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("seo_title", sa.String(160)),
        sa.Column("seo_description", sa.String(320)),
        sa.Column("noindex", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("commercial", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        _fk("hero_media_id", "media_assets.id", "fk_pt_pages_hero_media_id_media_assets"),
        sa.Column("hero_alt", sa.String(200)),
        _fk("brochure_media_id", "media_assets.id", "fk_pt_pages_brochure_media_id_media_assets"),
        sa.Column("brochure_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("brochure_version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        _fk("updated_by", "users.id", "fk_pt_pages_updated_by_users"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
    )
    op.create_table(
        "pt_faqs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("scope", sa.String(60), nullable=False, server_default="general"),
        sa.Column("question", sa.String(300), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
    )
    op.create_index("ix_pt_faqs_scope_sort", "pt_faqs", ["scope", "sort_order"])
    op.create_table(
        "pt_policies",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("key", sa.String(30), nullable=False),
        sa.Column("scope", sa.String(60), nullable=False, server_default="general"),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(10), nullable=False, server_default="draft"),
        sa.Column("effective_date", sa.Date()),
        sa.Column("reviewed_by", sa.String(160)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.UniqueConstraint("key", "scope", "version", name="uq_pt_policies_key_scope_version"),
        sa.CheckConstraint("status in ('draft','published','archived')", name="ck_pt_policies_status"),
    )
    op.create_index("ix_pt_policies_key_scope", "pt_policies", ["key", "scope", "status"])
    op.create_table(
        "pt_settings",
        sa.Column("key", sa.String(40), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        _fk("updated_by", "users.id", "fk_pt_settings_updated_by_users"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
    )
    op.create_table(
        "pt_menu_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("category", sa.String(24), nullable=False),
        sa.Column("slug", sa.String(40), nullable=False),
        sa.Column("label", sa.String(60), nullable=False),
        sa.Column("description", sa.String(300)),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("builtin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.UniqueConstraint("category", "slug", name="uq_pt_menu_items_category_slug"),
        sa.CheckConstraint("category in ('franchise','authorized-partner','referral-partner')", name="ck_pt_menu_items_category"),
    )
    op.create_index("ix_pt_menu_items_category_sort", "pt_menu_items", ["category", "sort_order"])
    for name in TABLES:
        op.execute(f'ALTER TABLE public."{name}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for name in ("pt_menu_items", "pt_settings", "pt_policies", "pt_faqs", "pt_pages", "pt_application_events", "pt_applications"):
        op.drop_table(name)
