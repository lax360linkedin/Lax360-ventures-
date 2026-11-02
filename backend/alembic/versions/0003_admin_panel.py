"""Admin panel: super_admin role + per-admin permissions, enquiry workflow, notes, settings, CMS content, media, audit log.

- users: role may now be 'super_admin'; new `permissions` list (modules an 'admin' may use).
- contact_enquiries: statuses become new / in_progress / contacted / converted / closed (old values are mapped);
  adds `assigned_to` and `archived_at`.
- New tables: enquiry_notes, site_settings, content_items, media_assets, audit_logs.
- audit_logs is append-only: a trigger rejects UPDATE and DELETE (the only allowed change is the foreign key being
  nulled when a user row is deleted).
- Row-level security is enabled on every new table and Supabase's API roles are revoked, like migration 0002.

Revision ID: 0003
Revises: 0002
"""
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

NEW_TABLES = ("enquiry_notes", "site_settings", "content_items", "media_assets", "audit_logs")
NOW = sa.text("now()")

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

AUDIT_FUNCTION = """
CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Allowed: ON DELETE SET NULL on admin_id when a user row is removed (nothing else may change).
  IF TG_OP = 'UPDATE' AND NEW.admin_id IS NULL AND (to_jsonb(NEW) - 'admin_id') = (to_jsonb(OLD) - 'admin_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only';
END
$$;
"""


def _ts(name):
    return sa.Column(name, sa.DateTime(timezone=True), server_default=NOW, nullable=False)


def upgrade() -> None:
    # --- users
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint("ck_users_role", "users", "role in ('user','admin','super_admin')")
    op.add_column("users", sa.Column("permissions", sa.JSON(), server_default=sa.text("'[]'"), nullable=False))

    # --- enquiries
    op.execute("UPDATE contact_enquiries SET status = 'in_progress' WHERE status = 'read'")
    op.execute("UPDATE contact_enquiries SET status = 'contacted' WHERE status = 'replied'")
    op.execute("UPDATE contact_enquiries SET status = 'closed' WHERE status = 'spam'")
    op.drop_constraint("ck_contact_enquiries_status", "contact_enquiries", type_="check")
    op.create_check_constraint("ck_contact_enquiries_status", "contact_enquiries", "status in ('new','in_progress','contacted','converted','closed')")
    op.add_column("contact_enquiries", sa.Column("assigned_to", sa.Uuid(), nullable=True))
    op.add_column("contact_enquiries", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_contact_enquiries_assigned_to_users", "contact_enquiries", "users", ["assigned_to"], ["id"], ondelete="SET NULL")

    # --- new tables
    op.create_table(
        "enquiry_notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("enquiry_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=True),
        sa.Column("author_name", sa.String(120), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        _ts("created_at"),
        sa.PrimaryKeyConstraint("id", name="pk_enquiry_notes"),
        sa.ForeignKeyConstraint(["enquiry_id"], ["contact_enquiries.id"], name="fk_enquiry_notes_enquiry_id_contact_enquiries", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], name="fk_enquiry_notes_author_id_users", ondelete="SET NULL"),
    )
    op.create_index("ix_enquiry_notes_enquiry_id_created_at", "enquiry_notes", ["enquiry_id", "created_at"])

    op.create_table(
        "site_settings",
        sa.Column("key", sa.String(60), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("is_public", sa.Boolean(), server_default="false", nullable=False),
        _ts("updated_at"),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("key", name="pk_site_settings"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name="fk_site_settings_updated_by_users", ondelete="SET NULL"),
    )

    op.create_table(
        "content_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("slug", sa.String(120), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_content_items"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name="fk_content_items_updated_by_users", ondelete="SET NULL"),
        sa.UniqueConstraint("kind", "slug", name="uq_content_items_kind_slug"),
        sa.CheckConstraint("status in ('draft','published')", name="ck_content_items_status"),
    )
    op.create_index("ix_content_items_kind_status_sort", "content_items", ["kind", "status", "sort_order"])

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("filename", sa.String(200), nullable=False),
        sa.Column("content_type", sa.String(60), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("alt_text", sa.String(200), nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("uploaded_by", sa.Uuid(), nullable=True),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_media_assets"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], name="fk_media_assets_uploaded_by_users", ondelete="SET NULL"),
    )
    op.create_index("ix_media_assets_created_at", "media_assets", ["created_at"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=True),
        sa.Column("admin_email", sa.String(254), nullable=False),
        sa.Column("action", sa.String(60), nullable=False),
        sa.Column("resource_type", sa.String(40), nullable=True),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("detail", sa.JSON(), nullable=True),
        _ts("created_at"),
        sa.PrimaryKeyConstraint("id", name="pk_audit_logs"),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], name="fk_audit_logs_admin_id_users", ondelete="SET NULL"),
        sa.CheckConstraint("status in ('success','failure')", name="ck_audit_logs_status"),
    )
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index("ix_audit_logs_admin_id_created_at", "audit_logs", ["admin_id", "created_at"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])

    # --- audit log is append-only
    op.execute(AUDIT_FUNCTION)
    op.execute("CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only()")

    # --- row-level security (same stance as 0002: backend = owner, API roles locked out)
    for table in NEW_TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
    op.execute(REVOKE_API_ROLES)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs")
    op.execute("DROP FUNCTION IF EXISTS audit_logs_append_only()")
    for table in ("audit_logs", "media_assets", "content_items", "site_settings", "enquiry_notes"):
        op.drop_table(table)
    op.drop_constraint("fk_contact_enquiries_assigned_to_users", "contact_enquiries", type_="foreignkey")
    op.drop_column("contact_enquiries", "archived_at")
    op.drop_column("contact_enquiries", "assigned_to")
    op.execute("UPDATE contact_enquiries SET status = 'read' WHERE status = 'in_progress'")
    op.execute("UPDATE contact_enquiries SET status = 'replied' WHERE status IN ('contacted','converted')")
    op.drop_constraint("ck_contact_enquiries_status", "contact_enquiries", type_="check")
    op.create_check_constraint("ck_contact_enquiries_status", "contact_enquiries", "status in ('new','read','replied','closed','spam')")
    op.drop_column("users", "permissions")
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'super_admin'")
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint("ck_users_role", "users", "role in ('user','admin')")
