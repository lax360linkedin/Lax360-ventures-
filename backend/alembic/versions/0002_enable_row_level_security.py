"""Enable row-level security (RLS) on every table; revoke Supabase's public-API roles if they exist.

Why: on Supabase, tables in the `public` schema can be reached through Supabase's own HTTP API with the public "anon" key.
This application never uses that API: the FastAPI backend connects straight to PostgreSQL as the database owner, which is
not subject to RLS. Enabling RLS with NO policies makes the tables invisible to the API roles while the backend keeps
working. On plain PostgreSQL (no `anon`/`authenticated` roles) the revoke step is skipped and RLS is a harmless extra.

Never add `FORCE ROW LEVEL SECURITY` to these tables: it would apply RLS to the owner and block the backend.
New tables created by future migrations must enable RLS the same way (see backend/README.md).

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TABLES = (
    "users", "auth_sessions", "branches", "demo_requests", "contact_enquiries",
    "chat_sessions", "chat_messages", "ai_usage", "alembic_version",
)

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


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
    op.execute(REVOKE_API_ROLES)


def downgrade() -> None:
    # Row-level security is turned back off; privileges revoked from API roles are NOT restored automatically.
    for table in TABLES:
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
