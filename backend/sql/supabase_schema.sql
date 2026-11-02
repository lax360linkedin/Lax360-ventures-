-- LAX360 Ventures database schema (generated from backend/alembic/versions by scripts/export_sql.py).
-- Run ONCE on an EMPTY database in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It creates 8 tables, seeds the branches Salem / Bangalore / Mumbai, and enables row-level security on every table.
-- Do not run it together with `alembic upgrade head` on the same database. Regenerate after any schema change.

BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 0001

CREATE TABLE users (
    id UUID NOT NULL, 
    full_name VARCHAR(120) NOT NULL, 
    email VARCHAR(254) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(20) DEFAULT 'user' NOT NULL, 
    is_active BOOLEAN DEFAULT 'true' NOT NULL, 
    last_login_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_users PRIMARY KEY (id), 
    CONSTRAINT uq_users_email UNIQUE (email), 
    CONSTRAINT ck_users_ck_users_role CHECK (role in ('user','admin'))
);

CREATE TABLE auth_sessions (
    id UUID NOT NULL, 
    user_id UUID NOT NULL, 
    token_hash VARCHAR(64) NOT NULL, 
    csrf_token VARCHAR(64) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    revoked_at TIMESTAMP WITH TIME ZONE, 
    CONSTRAINT pk_auth_sessions PRIMARY KEY (id), 
    CONSTRAINT fk_auth_sessions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    CONSTRAINT uq_auth_sessions_token_hash UNIQUE (token_hash)
);

CREATE INDEX ix_auth_sessions_user_id_expires_at ON auth_sessions (user_id, expires_at);

CREATE TABLE branches (
    id UUID NOT NULL, 
    slug VARCHAR(40) NOT NULL, 
    name VARCHAR(160) NOT NULL, 
    city VARCHAR(80) NOT NULL, 
    address TEXT, 
    phone VARCHAR(32), 
    is_active BOOLEAN DEFAULT 'true' NOT NULL, 
    sort_order INTEGER DEFAULT '0' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_branches PRIMARY KEY (id), 
    CONSTRAINT uq_branches_slug UNIQUE (slug), 
    CONSTRAINT uq_branches_city UNIQUE (city)
);

CREATE TABLE demo_requests (
    id UUID NOT NULL, 
    user_id UUID, 
    name VARCHAR(120) NOT NULL, 
    email VARCHAR(254) NOT NULL, 
    company VARCHAR(160), 
    preferred_date DATE, 
    interest VARCHAR(80), 
    branch_id UUID, 
    message TEXT, 
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, 
    fingerprint VARCHAR(64) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_demo_requests PRIMARY KEY (id), 
    CONSTRAINT fk_demo_requests_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL, 
    CONSTRAINT fk_demo_requests_branch_id_branches FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE SET NULL, 
    CONSTRAINT ck_demo_requests_ck_demo_requests_status CHECK (status in ('pending','contacted','confirmed','cancelled'))
);

CREATE INDEX ix_demo_requests_user_id_created_at ON demo_requests (user_id, created_at);

CREATE INDEX ix_demo_requests_status_created_at ON demo_requests (status, created_at);

CREATE INDEX ix_demo_requests_fingerprint ON demo_requests (fingerprint);

CREATE TABLE contact_enquiries (
    id UUID NOT NULL, 
    name VARCHAR(120) NOT NULL, 
    email VARCHAR(254) NOT NULL, 
    phone VARCHAR(32), 
    company VARCHAR(160), 
    enquiry_type VARCHAR(30) NOT NULL, 
    subject VARCHAR(160) NOT NULL, 
    message TEXT NOT NULL, 
    extra JSON, 
    branch_id UUID, 
    consented BOOLEAN DEFAULT 'false' NOT NULL, 
    source VARCHAR(30), 
    status VARCHAR(20) DEFAULT 'new' NOT NULL, 
    fingerprint VARCHAR(64) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_contact_enquiries PRIMARY KEY (id), 
    CONSTRAINT fk_contact_enquiries_branch_id_branches FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE SET NULL, 
    CONSTRAINT ck_contact_enquiries_ck_contact_enquiries_status CHECK (status in ('new','read','replied','closed','spam'))
);

CREATE INDEX ix_contact_enquiries_status_created_at ON contact_enquiries (status, created_at);

CREATE INDEX ix_contact_enquiries_fingerprint ON contact_enquiries (fingerprint);

CREATE TABLE chat_sessions (
    id UUID NOT NULL, 
    user_id UUID, 
    token_hash VARCHAR(64) NOT NULL, 
    message_count INTEGER DEFAULT '0' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    CONSTRAINT pk_chat_sessions PRIMARY KEY (id), 
    CONSTRAINT fk_chat_sessions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_chat_sessions_expires_at ON chat_sessions (expires_at);

CREATE TABLE chat_messages (
    id UUID NOT NULL, 
    session_id UUID NOT NULL, 
    role VARCHAR(20) NOT NULL, 
    content TEXT NOT NULL, 
    status VARCHAR(20) NOT NULL, 
    provider_response_id VARCHAR(80), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_chat_messages PRIMARY KEY (id), 
    CONSTRAINT fk_chat_messages_session_id_chat_sessions FOREIGN KEY(session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE, 
    CONSTRAINT ck_chat_messages_ck_chat_messages_role CHECK (role in ('user','assistant')), 
    CONSTRAINT ck_chat_messages_ck_chat_messages_status CHECK (status in ('received','completed','failed'))
);

CREATE INDEX ix_chat_messages_session_id_created_at ON chat_messages (session_id, created_at);

CREATE TABLE ai_usage (
    id UUID NOT NULL, 
    session_id UUID, 
    status VARCHAR(30) NOT NULL, 
    model VARCHAR(100), 
    latency_ms INTEGER, 
    input_tokens INTEGER, 
    output_tokens INTEGER, 
    provider_request_id VARCHAR(80), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_ai_usage PRIMARY KEY (id), 
    CONSTRAINT fk_ai_usage_session_id_chat_sessions FOREIGN KEY(session_id) REFERENCES chat_sessions (id) ON DELETE SET NULL
);

CREATE INDEX ix_ai_usage_created_at ON ai_usage (created_at);

INSERT INTO branches (id, slug, name, city, address, sort_order) VALUES ('3512f082-f46e-45d4-893b-b0534c671938', 'salem', 'LAX360 Ventures — Salem Branch', 'Salem', 'LAX360 Pvt Ltd
1st Floor, 16, CPS Tower
Advaitha Ashram Rd, Fairlands
Salem, Tamil Nadu 636007', 1);

INSERT INTO branches (id, slug, name, city, address, sort_order) VALUES ('4b27bac8-5900-4940-b655-a68a05923bdd', 'bangalore', 'LAX360 Ventures — Bangalore Branch', 'Bangalore', NULL, 2);

INSERT INTO branches (id, slug, name, city, address, sort_order) VALUES ('7f81ed48-37dd-4468-81b2-c28312f2b270', 'mumbai', 'LAX360 Ventures — Mumbai Branch', 'Mumbai', NULL, 3);

INSERT INTO alembic_version (version_num) VALUES ('0001') RETURNING alembic_version.version_num;

-- Running upgrade 0001 -> 0002

ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."auth_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."branches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."demo_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contact_enquiries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."chat_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."chat_messages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."ai_usage" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."alembic_version" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %%I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %%I', r);
    END IF;
  END LOOP;
END
$$;;

UPDATE alembic_version SET version_num='0002' WHERE alembic_version.version_num = '0001';

-- Running upgrade 0002 -> 0003

ALTER TABLE users DROP CONSTRAINT ck_users_ck_users_role;

ALTER TABLE users ADD CONSTRAINT ck_users_ck_users_role CHECK (role in ('user','admin','super_admin'));

ALTER TABLE users ADD COLUMN permissions JSON DEFAULT '[]' NOT NULL;

UPDATE contact_enquiries SET status = 'in_progress' WHERE status = 'read';

UPDATE contact_enquiries SET status = 'contacted' WHERE status = 'replied';

UPDATE contact_enquiries SET status = 'closed' WHERE status = 'spam';

ALTER TABLE contact_enquiries DROP CONSTRAINT ck_contact_enquiries_ck_contact_enquiries_status;

ALTER TABLE contact_enquiries ADD CONSTRAINT ck_contact_enquiries_ck_contact_enquiries_status CHECK (status in ('new','in_progress','contacted','converted','closed'));

ALTER TABLE contact_enquiries ADD COLUMN assigned_to UUID;

ALTER TABLE contact_enquiries ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE contact_enquiries ADD CONSTRAINT fk_contact_enquiries_assigned_to_users FOREIGN KEY(assigned_to) REFERENCES users (id) ON DELETE SET NULL;

CREATE TABLE enquiry_notes (
    id UUID NOT NULL, 
    enquiry_id UUID NOT NULL, 
    author_id UUID, 
    author_name VARCHAR(120) NOT NULL, 
    body TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_enquiry_notes PRIMARY KEY (id), 
    CONSTRAINT fk_enquiry_notes_enquiry_id_contact_enquiries FOREIGN KEY(enquiry_id) REFERENCES contact_enquiries (id) ON DELETE CASCADE, 
    CONSTRAINT fk_enquiry_notes_author_id_users FOREIGN KEY(author_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_enquiry_notes_enquiry_id_created_at ON enquiry_notes (enquiry_id, created_at);

CREATE TABLE site_settings (
    key VARCHAR(60) NOT NULL, 
    value JSON NOT NULL, 
    is_public BOOLEAN DEFAULT 'false' NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_by UUID, 
    CONSTRAINT pk_site_settings PRIMARY KEY (key), 
    CONSTRAINT fk_site_settings_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE content_items (
    id UUID NOT NULL, 
    kind VARCHAR(30) NOT NULL, 
    slug VARCHAR(120), 
    title VARCHAR(200) NOT NULL, 
    data JSON NOT NULL, 
    status VARCHAR(20) DEFAULT 'draft' NOT NULL, 
    sort_order INTEGER DEFAULT '0' NOT NULL, 
    updated_by UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_content_items PRIMARY KEY (id), 
    CONSTRAINT fk_content_items_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL, 
    CONSTRAINT uq_content_items_kind_slug UNIQUE (kind, slug), 
    CONSTRAINT ck_content_items_ck_content_items_status CHECK (status in ('draft','published'))
);

CREATE INDEX ix_content_items_kind_status_sort ON content_items (kind, status, sort_order);

CREATE TABLE media_assets (
    id UUID NOT NULL, 
    filename VARCHAR(200) NOT NULL, 
    content_type VARCHAR(60) NOT NULL, 
    size_bytes INTEGER NOT NULL, 
    alt_text VARCHAR(200), 
    is_public BOOLEAN DEFAULT 'false' NOT NULL, 
    uploaded_by UUID, 
    data BYTEA NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_media_assets PRIMARY KEY (id), 
    CONSTRAINT fk_media_assets_uploaded_by_users FOREIGN KEY(uploaded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_media_assets_created_at ON media_assets (created_at);

CREATE TABLE audit_logs (
    id UUID NOT NULL, 
    admin_id UUID, 
    admin_email VARCHAR(254) NOT NULL, 
    action VARCHAR(60) NOT NULL, 
    resource_type VARCHAR(40), 
    resource_id VARCHAR(64), 
    status VARCHAR(10) NOT NULL, 
    detail JSON, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_audit_logs PRIMARY KEY (id), 
    CONSTRAINT fk_audit_logs_admin_id_users FOREIGN KEY(admin_id) REFERENCES users (id) ON DELETE SET NULL, 
    CONSTRAINT ck_audit_logs_ck_audit_logs_status CHECK (status in ('success','failure'))
);

CREATE INDEX ix_audit_logs_created_at ON audit_logs (created_at);

CREATE INDEX ix_audit_logs_admin_id_created_at ON audit_logs (admin_id, created_at);

CREATE INDEX ix_audit_logs_action ON audit_logs (action);

CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Allowed: ON DELETE SET NULL on admin_id when a user row is removed (nothing else may change).
  IF TG_OP = 'UPDATE' AND NEW.admin_id IS NULL AND (to_jsonb(NEW) - 'admin_id') = (to_jsonb(OLD) - 'admin_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only';
END
$$;;

CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

ALTER TABLE public."enquiry_notes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."site_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."content_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."media_assets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %%I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %%I', r);
    END IF;
  END LOOP;
END
$$;;

UPDATE alembic_version SET version_num='0003' WHERE alembic_version.version_num = '0002';

-- Running upgrade 0003 -> 0004

ALTER TABLE users ADD COLUMN username VARCHAR(60);

ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username);

UPDATE alembic_version SET version_num='0004' WHERE alembic_version.version_num = '0003';

-- Running upgrade 0004 -> 0005

CREATE TABLE hero_videos (
    id UUID NOT NULL, 
    title VARCHAR(120) NOT NULL, 
    original_name VARCHAR(200) NOT NULL, 
    storage_key VARCHAR(80) NOT NULL, 
    poster_key VARCHAR(80), 
    content_type VARCHAR(30) NOT NULL, 
    size_bytes INTEGER NOT NULL, 
    duration_seconds FLOAT, 
    is_active BOOLEAN DEFAULT 'true' NOT NULL, 
    position INTEGER DEFAULT '0' NOT NULL, 
    uploaded_by UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_hero_videos PRIMARY KEY (id), 
    CONSTRAINT fk_hero_videos_uploaded_by_users FOREIGN KEY(uploaded_by) REFERENCES users (id) ON DELETE SET NULL, 
    CONSTRAINT uq_hero_videos_storage_key UNIQUE (storage_key)
);

CREATE INDEX ix_hero_videos_position ON hero_videos (position);

CREATE TABLE hero_video_config (
    id SERIAL NOT NULL, 
    start_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    slot_days INTEGER DEFAULT '3' NOT NULL, 
    repeat BOOLEAN DEFAULT 'true' NOT NULL, 
    anchor_video_id UUID, 
    anchor_start TIMESTAMP WITH TIME ZONE, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_by UUID, 
    CONSTRAINT pk_hero_video_config PRIMARY KEY (id), 
    CONSTRAINT ck_hero_video_config_ck_hero_video_config_single_row CHECK (id = 1), 
    CONSTRAINT ck_hero_video_config_ck_hero_video_config_slot_days CHECK (slot_days between 1 and 30), 
    CONSTRAINT fk_hero_video_config_anchor_video_id_hero_videos FOREIGN KEY(anchor_video_id) REFERENCES hero_videos (id) ON DELETE SET NULL, 
    CONSTRAINT fk_hero_video_config_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE public."hero_videos" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."hero_video_config" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %%I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %%I', r);
    END IF;
  END LOOP;
END
$$;;

UPDATE alembic_version SET version_num='0005' WHERE alembic_version.version_num = '0004';

-- Running upgrade 0005 -> 0006

ALTER TABLE auth_sessions ADD COLUMN realm VARCHAR(10) DEFAULT 'public' NOT NULL;

ALTER TABLE auth_sessions ADD CONSTRAINT ck_auth_sessions_ck_auth_sessions_realm CHECK (realm in ('public','admin'));

UPDATE alembic_version SET version_num='0006' WHERE alembic_version.version_num = '0005';

COMMIT;

