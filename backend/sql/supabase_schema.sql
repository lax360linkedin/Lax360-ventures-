-- LAX360 Pvt Ltd database schema (generated from backend/alembic/versions by scripts/export_sql.py).
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

INSERT INTO branches (id, slug, name, city, address, sort_order) VALUES ('97b77de4-e469-4810-9879-1c8bd5c1fbd6', 'salem', 'LAX360 Ventures — Salem Branch', 'Salem', 'LAX360 Pvt Ltd
1st Floor, 16, CPS Tower
Advaitha Ashram Rd, Fairlands
Salem, Tamil Nadu 636007', 1);

INSERT INTO branches (id, slug, name, city, address, sort_order) VALUES ('d1ce9ea1-c46c-4f5a-9f98-56087a5ddb66', 'bangalore', 'LAX360 Ventures — Bangalore Branch', 'Bangalore', NULL, 2);

INSERT INTO branches (id, slug, name, city, address, sort_order) VALUES ('d552a73b-daa4-40b0-9618-65cb9f3b3257', 'mumbai', 'LAX360 Ventures — Mumbai Branch', 'Mumbai', NULL, 3);

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

-- Running upgrade 0006 -> 0007

ALTER TABLE hero_videos ADD COLUMN storage VARCHAR(10) DEFAULT 'local' NOT NULL;

ALTER TABLE hero_videos ADD CONSTRAINT ck_hero_videos_ck_hero_videos_storage CHECK (storage in ('local','supabase'));

UPDATE alembic_version SET version_num='0007' WHERE alembic_version.version_num = '0006';

-- Running upgrade 0007 -> 0008

ALTER TABLE media_assets ADD COLUMN storage VARCHAR(10) DEFAULT 'db' NOT NULL;

ALTER TABLE media_assets ADD COLUMN storage_key VARCHAR(120);

ALTER TABLE media_assets ADD COLUMN bucket VARCHAR(63);

ALTER TABLE media_assets ADD COLUMN sha256 VARCHAR(64);

ALTER TABLE media_assets ADD COLUMN kind VARCHAR(12) DEFAULT 'image' NOT NULL;

ALTER TABLE media_assets ALTER COLUMN data DROP NOT NULL;

UPDATE media_assets SET kind = 'document' WHERE content_type = 'application/pdf';

UPDATE media_assets SET kind = 'video' WHERE content_type LIKE 'video/%%';

UPDATE media_assets SET sha256 = encode(sha256(data), 'hex') WHERE data IS NOT NULL AND sha256 IS NULL;

ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_ck_media_assets_storage CHECK (storage in ('db','local','supabase'));

ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_ck_media_assets_kind CHECK (kind in ('image','video','document'));

ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_ck_media_assets_has_file CHECK (data IS NOT NULL OR storage_key IS NOT NULL);

CREATE INDEX ix_media_assets_sha256 ON media_assets (sha256);

CREATE INDEX ix_media_assets_kind ON media_assets (kind);

UPDATE alembic_version SET version_num='0008' WHERE alembic_version.version_num = '0007';

-- Running upgrade 0008 -> 0009

ALTER TABLE hero_videos ADD COLUMN bucket VARCHAR(63);

ALTER TABLE hero_videos ADD COLUMN sha256 VARCHAR(64);

ALTER TABLE hero_videos ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE hero_videos ADD COLUMN delete_error VARCHAR(300);

ALTER TABLE hero_videos ADD COLUMN available_from TIMESTAMP WITH TIME ZONE;

ALTER TABLE hero_videos ADD COLUMN available_until TIMESTAMP WITH TIME ZONE;

ALTER TABLE hero_videos ADD COLUMN is_fallback BOOLEAN DEFAULT 'false' NOT NULL;

ALTER TABLE hero_videos ADD COLUMN verify_status VARCHAR(10) DEFAULT 'unknown' NOT NULL;

ALTER TABLE hero_videos ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE hero_videos ADD COLUMN verify_detail VARCHAR(300);

ALTER TABLE hero_videos ADD COLUMN last_play_ok_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE hero_videos ADD COLUMN last_play_error VARCHAR(120);

ALTER TABLE hero_videos ADD COLUMN last_play_error_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE hero_videos ADD CONSTRAINT ck_hero_videos_ck_hero_videos_verify_status CHECK (verify_status in ('unknown','ok','missing','error'));

ALTER TABLE hero_videos ADD CONSTRAINT ck_hero_videos_ck_hero_videos_window CHECK (available_from IS NULL OR available_until IS NULL OR available_until > available_from);

CREATE UNIQUE INDEX uq_hero_videos_sha256_live ON hero_videos (sha256) WHERE sha256 IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_hero_videos_one_fallback ON hero_videos (is_fallback) WHERE is_fallback AND deleted_at IS NULL;

CREATE INDEX ix_hero_videos_deleted_at ON hero_videos (deleted_at);

UPDATE alembic_version SET version_num='0009' WHERE alembic_version.version_num = '0008';

-- Running upgrade 0009 -> 0010

UPDATE branches SET address='1st Floor, 16, CPS Tower
Advaitha Ashram Road, Fairlands
Salem, Tamil Nadu – 636004', phone='+91 95666 79928' WHERE branches.slug = 'salem';

UPDATE branches SET address='472/7, 20th L Cross Road
AVS Layout, Koramangala
Bengaluru, Karnataka – 560034', phone='+91 95666 79928' WHERE branches.slug = 'bangalore';

UPDATE branches SET address='Level 4, Dynasty Business Park
Andheri–Kurla Road, A-Wing, J. B. Nagar
Andheri East, Mumbai, Maharashtra – 400059', phone='+91 95666 05272' WHERE branches.slug = 'mumbai';

UPDATE alembic_version SET version_num='0010' WHERE alembic_version.version_num = '0009';

-- Running upgrade 0010 -> 0011

UPDATE content_items SET data = replace(data::text, NULL, NULL)::json WHERE kind = 'faq' AND data::text LIKE NULL;

UPDATE content_items SET data = replace(data::text, NULL, NULL)::json WHERE kind = 'faq' AND data::text LIKE NULL;

DELETE FROM content_items WHERE (title ~* '\mcad\M' OR data::text ~* '\mcad\M' OR data::text ~* '(division|group).: ?.(engineering|cad)' OR title ~* '(civil|mechanical) (cad|engineering)') AND kind IN ('service_category','service','project','team_member','article','faq','about_block','about_section');

UPDATE alembic_version SET version_num='0011' WHERE alembic_version.version_num = '0010';

-- Running upgrade 0011 -> 0012

ALTER TABLE contact_enquiries DROP CONSTRAINT ck_contact_enquiries_ck_contact_enquiries_status;

ALTER TABLE contact_enquiries ADD CONSTRAINT ck_contact_enquiries_ck_contact_enquiries_status CHECK (status in ('new','in_progress','contacted','qualified','proposal_sent','negotiation','converted','not_interested','closed'));

CREATE TABLE enquiry_followups (
    id UUID NOT NULL, 
    enquiry_id UUID NOT NULL, 
    author_id UUID, 
    author_name VARCHAR(120) NOT NULL, 
    kind VARCHAR(12) DEFAULT 'call' NOT NULL, 
    summary TEXT NOT NULL, 
    due_on DATE, 
    done BOOLEAN DEFAULT false NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_enquiry_followups PRIMARY KEY (id), 
    CONSTRAINT ck_enquiry_followups_ck_enquiry_followups_kind CHECK (kind in ('call','email','whatsapp','meeting','other')), 
    CONSTRAINT fk_enquiry_followups_enquiry_id_contact_enquiries FOREIGN KEY(enquiry_id) REFERENCES contact_enquiries (id) ON DELETE CASCADE, 
    CONSTRAINT fk_enquiry_followups_author_id_users FOREIGN KEY(author_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_enquiry_followups_enquiry_id_created_at ON enquiry_followups (enquiry_id, created_at);

CREATE INDEX ix_enquiry_followups_due_on ON enquiry_followups (due_on);

ALTER TABLE public."enquiry_followups" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON public.enquiry_followups FROM %%I', r);
    END IF;
  END LOOP;
END $$;;

UPDATE alembic_version SET version_num='0012' WHERE alembic_version.version_num = '0011';

-- Running upgrade 0012 -> 0013

UPDATE branches SET name = replace(name, 'LAX360 Ventures', 'LAX360 Pvt Ltd') WHERE strpos(name, 'LAX360 Ventures') > 0;

UPDATE content_items SET title = replace(title, 'LAX360 Ventures', 'LAX360 Pvt Ltd') WHERE strpos(title, 'LAX360 Ventures') > 0;

UPDATE content_items SET data = replace(data::text, 'LAX360 Ventures', 'LAX360 Pvt Ltd')::json WHERE strpos(data::text, 'LAX360 Ventures') > 0;

UPDATE site_settings SET value = replace(value::text, 'LAX360 Ventures', 'LAX360 Pvt Ltd')::json WHERE strpos(value::text, 'LAX360 Ventures') > 0;

UPDATE content_items SET data = replace(data::text, 'LAX360 Pvt Ltd is a brand of LAX360 Pvt Ltd', 'LAX360 Pvt Ltd')::json WHERE strpos(data::text, 'LAX360 Pvt Ltd is a brand of LAX360 Pvt Ltd') > 0;

UPDATE site_settings SET value = replace(value::text, 'LAX360 Pvt Ltd is a brand of LAX360 Pvt Ltd', 'LAX360 Pvt Ltd')::json WHERE strpos(value::text, 'LAX360 Pvt Ltd is a brand of LAX360 Pvt Ltd') > 0;

UPDATE alembic_version SET version_num='0013' WHERE alembic_version.version_num = '0012';

-- Running upgrade 0013 -> 0014

ALTER TABLE chat_sessions ADD COLUMN guest_key VARCHAR(64);

ALTER TABLE chat_sessions ADD COLUMN ip_hash VARCHAR(64);

CREATE INDEX ix_chat_sessions_guest_key ON chat_sessions (guest_key);

CREATE INDEX ix_chat_sessions_ip_hash_created_at ON chat_sessions (ip_hash, created_at);

ALTER TABLE contact_enquiries ADD COLUMN user_id UUID;

ALTER TABLE contact_enquiries ADD CONSTRAINT fk_contact_enquiries_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX ix_contact_enquiries_user_id ON contact_enquiries (user_id);

UPDATE alembic_version SET version_num='0014' WHERE alembic_version.version_num = '0013';

-- Running upgrade 0014 -> 0015

CREATE TABLE user_profiles (
    user_id UUID NOT NULL, 
    mobile VARCHAR(20), 
    category VARCHAR(15), 
    institution VARCHAR(160), 
    course VARCHAR(120), 
    department VARCHAR(120), 
    study_year VARCHAR(20), 
    company VARCHAR(160), 
    job_role VARCHAR(120), 
    industry VARCHAR(120), 
    experience_years INTEGER, 
    other_details VARCHAR(300), 
    purposes JSON DEFAULT '[]' NOT NULL, 
    purpose_note TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_user_profiles PRIMARY KEY (user_id), 
    CONSTRAINT ck_user_profiles_ck_user_profiles_category CHECK (category in ('student','professional','other')), 
    CONSTRAINT fk_user_profiles_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_user_profiles_category ON user_profiles (category);

CREATE INDEX ix_user_profiles_mobile ON user_profiles (mobile);

ALTER TABLE public."user_profiles" ENABLE ROW LEVEL SECURITY;

UPDATE alembic_version SET version_num='0015' WHERE alembic_version.version_num = '0014';

-- Running upgrade 0015 -> 0016

ALTER TABLE branches ADD COLUMN map_embed_url VARCHAR(1500);

UPDATE branches SET map_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1380.1767868508273!2d78.14095405285593!3d11.673119895912297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x49584e947d17121d%%3A0x4c167403feb05364!2sLax360%%20Pvt%%20ltd!5e0!3m2!1sen!2sin!4v1794821244657!5m2!1sen!2sin' WHERE slug = 'salem' AND map_embed_url IS NULL;

UPDATE alembic_version SET version_num='0016' WHERE alembic_version.version_num = '0015';

-- Running upgrade 0016 -> 0017

ALTER TABLE contact_enquiries ADD COLUMN sheets_synced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE demo_requests ADD COLUMN sheets_synced_at TIMESTAMP WITH TIME ZONE;

UPDATE alembic_version SET version_num='0017' WHERE alembic_version.version_num = '0016';

-- Running upgrade 0017 -> 0018

CREATE TABLE contact_channels (
    id UUID NOT NULL, 
    kind VARCHAR(10) NOT NULL, 
    type VARCHAR(20) NOT NULL, 
    label VARCHAR(120) NOT NULL, 
    value VARCHAR(1000) NOT NULL, 
    note VARCHAR(160), 
    detail TEXT, 
    icon VARCHAR(30), 
    locations JSON DEFAULT '[]' NOT NULL, 
    is_active BOOLEAN DEFAULT true NOT NULL, 
    sort_order INTEGER DEFAULT 0 NOT NULL, 
    dedupe_key VARCHAR(400) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_contact_channels PRIMARY KEY (id), 
    CONSTRAINT uq_contact_channels_dedupe_key UNIQUE (dedupe_key), 
    CONSTRAINT ck_contact_channels_kind CHECK (kind in ('social','contact'))
);

ALTER TABLE public."contact_channels" ENABLE ROW LEVEL SECURITY;

INSERT INTO contact_channels (id, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) VALUES ('1b56a5b2-09b2-553f-a434-265591ba9343', 'social', 'instagram', 'Instagram', 'https://www.instagram.com/lax360pvtltd', NULL, '["header", "footer", "contact", "social_band"]', true, 10, 'social:instagram:instagram.com/lax360pvtltd');

INSERT INTO contact_channels (id, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) VALUES ('f52e8fbb-3e2c-595b-8f4d-2e445042d2ba', 'social', 'linkedin', 'LinkedIn', 'https://www.linkedin.com/company/lax360-pvt-ltd', NULL, '["header", "footer", "contact", "social_band"]', true, 20, 'social:linkedin:linkedin.com/company/lax360-pvt-ltd');

INSERT INTO contact_channels (id, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) VALUES ('59eac3ec-be3d-5fcf-a7d0-3831cadfa66d', 'social', 'x', 'X (Twitter)', 'https://x.com/lax360tech', NULL, '["header", "footer", "contact", "social_band"]', true, 30, 'social:x:x.com/lax360tech');

INSERT INTO contact_channels (id, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) VALUES ('2ac41554-2f65-57db-a206-86e919f34785', 'contact', 'phone', 'Phone', '+91 95666 79928', 'Salem & Bangalore', '["header", "footer", "contact"]', true, 40, 'contact:phone:919566679928');

INSERT INTO contact_channels (id, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) VALUES ('54ca31ae-a46d-5c93-8ce7-ed2805dfb9f8', 'contact', 'email', 'Email', 'admin@lax360.in', NULL, '["header", "footer", "contact"]', true, 50, 'contact:email:admin@lax360.in');

INSERT INTO contact_channels (id, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) VALUES ('41dc71d7-b45c-59a5-b935-c6369fb8ff00', 'contact', 'phone', 'Phone', '+91 95666 05272', 'Mumbai', '["footer", "contact"]', true, 60, 'contact:phone:919566605272');

INSERT INTO contact_channels (id, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) VALUES ('dfa9b8f9-90d6-591e-8420-d59f309f0081', 'contact', 'whatsapp', 'WhatsApp', '+919566679928', NULL, '["header", "footer", "contact"]', true, 70, 'contact:whatsapp:919566679928');

UPDATE alembic_version SET version_num='0018' WHERE alembic_version.version_num = '0017';

-- Running upgrade 0018 -> 0019

ALTER TABLE contact_channels ADD COLUMN owner_type VARCHAR(10) DEFAULT 'global' NOT NULL;

ALTER TABLE contact_channels ADD COLUMN owner_ref VARCHAR(120);

ALTER TABLE contact_channels ADD CONSTRAINT ck_contact_channels_owner CHECK ((owner_type = 'global' AND owner_ref IS NULL) OR (owner_type IN ('branch','partner') AND owner_ref IS NOT NULL));

UPDATE alembic_version SET version_num='0019' WHERE alembic_version.version_num = '0018';

-- Running upgrade 0019 -> 0020

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('9aa37e64-f667-50c8-a02f-d512dd81a980', 'service_carousel_page', 'service-carousel', 'Services & industries carousel settings', '{"enabled": true, "eyebrow": "What we do", "title": "Services &", "title_accent": "Industries", "lead": "Software, AI, marketing and training for the businesses we work with. Swipe or drag to explore.", "scroll": true, "speed": "normal", "pause_on_hover": true}', 'published', 0);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('b183c299-20df-5aa3-87a3-752c8b88272a', 'service_card', 'it-software-development', 'IT & Software Development', '{"tag": "Service", "description": "Websites, web and mobile apps, CRM and ERP, and business systems built around how your team actually works.", "link": "/services/software", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/services/software.webp", "image_alt": "IT & Software Development"}', 'published', 10);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('c2892c84-2ad2-5224-a326-dc2267c21a95', 'service_card', 'digital-marketing', 'Digital Marketing', '{"tag": "Service", "description": "Social media, search and ad campaigns, and content that bring you more of the right customers.", "link": "/services/growth", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/services/marketing.webp", "image_alt": "Digital Marketing"}', 'published', 20);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('cd1c39ad-2216-5887-b0d2-06a3d0b56fab', 'service_card', 'ai-automation', 'AI & Automation', '{"tag": "Service", "description": "Chatbots, AI assistants and automated workflows that take repetitive work off your team.", "link": "/services/ai", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/services/ai.webp", "image_alt": "AI & Automation"}', 'published', 30);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('8a0a06ab-26d8-5311-ae25-1d23f536c64b', 'service_card', 'education-training', 'Education & Training', '{"tag": "Service", "description": "Hands-on courses and workshops in IT and AI for students and working professionals.", "link": "/contact?type=course", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/services/education.webp", "image_alt": "Education & Training"}', 'published', 40);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('7a87be00-a5a2-5ea5-b43e-f5b7858e04cf', 'service_card', 'healthcare', 'Healthcare', '{"tag": "Industry", "description": "Digital tools for clinics and hospitals: patients, appointments, records and communication in one connected system.", "link": "/industries/healthcare-medical", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/industries/healthcare.webp", "image_alt": "Healthcare"}', 'published', 50);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('404cb409-6de8-5fe2-8f9a-4dc7c46fde87', 'service_card', 'finance-business', 'Finance & Business', '{"tag": "Industry", "description": "Payment, financial management and integration platforms built with secure, well-documented APIs.", "link": "/industries/banking-fintech", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/industries/finance.webp", "image_alt": "Finance & Business"}', 'published', 60);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('2a59c9d6-afd3-5b58-bb09-9eae0baf4d35', 'service_card', 'e-commerce', 'E-commerce', '{"tag": "Industry", "description": "Billing, inventory, online stores and customer systems that keep shop floor and web orders in step.", "link": "/industries/retail-ecommerce", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/industries/retail.webp", "image_alt": "E-commerce"}', 'published', 70);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('7912b258-9a70-5634-b56c-5e2c992eff2e', 'service_card', 'mobile-business-apps', 'Mobile & Business Apps', '{"tag": "Service", "description": "Apps for bookings, field teams, billing and inventory, designed for everyday business use.", "link": "/services/mobile", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/services/mobile.webp", "image_alt": "Mobile & Business Apps"}', 'published', 80);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('944a16e8-7f44-5ca8-9ad6-172de7bd554e', 'service_card', 'manufacturing-industrial', 'Manufacturing & Industrial', '{"tag": "Industry", "description": "Production, quality, inventory and maintenance systems that give plants a real-time operational picture.", "link": "/industries/manufacturing-industrial", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/industries/manufacturing.webp", "image_alt": "Manufacturing & Industrial"}', 'published', 90);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('9f4ee60e-96fe-5e6e-8b7b-aa08dce566fb', 'service_card', 'real-estate-property', 'Real Estate & Property', '{"tag": "Industry", "description": "CRM, listing and booking tools that keep every property enquiry and follow-up on track.", "link": "/industries/real-estate-property", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/industries/realestate.webp", "image_alt": "Real Estate & Property"}', 'published', 100);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('19841edd-2dad-572e-a995-203132996fee', 'service_card', 'logistics-transportation', 'Logistics & Transportation', '{"tag": "Industry", "description": "Fleet, delivery, warehouse and field-team tools that give operations real-time visibility.", "link": "/industries/logistics-transportation", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/industries/logistics.webp", "image_alt": "Logistics & Transportation"}', 'published', 110);

INSERT INTO content_items (id, kind, slug, title, data, status, sort_order) VALUES ('35e07342-0809-5653-983a-e2077883f0f4', 'service_card', 'hospitality-tourism', 'Hospitality & Tourism', '{"tag": "Industry", "description": "Hotel, reservation and guest-experience software that keeps bookings and service running smoothly.", "link": "/industries/hospitality-tourism", "link_label": "Explore more", "enabled": true, "builtin_image": "/assets/industries/hospitality.webp", "image_alt": "Hospitality & Tourism"}', 'published', 120);

UPDATE alembic_version SET version_num='0020' WHERE alembic_version.version_num = '0019';

-- Running upgrade 0020 -> 0021

UPDATE alembic_version SET version_num='0021' WHERE alembic_version.version_num = '0020';

-- Running upgrade 0021 -> 0022

UPDATE alembic_version SET version_num='0022' WHERE alembic_version.version_num = '0021';

-- Running upgrade 0022 -> 0023

UPDATE alembic_version SET version_num='0023' WHERE alembic_version.version_num = '0022';

-- Running upgrade 0023 -> 0024

CREATE TABLE translations (
    id UUID NOT NULL, 
    lang VARCHAR(8) NOT NULL, 
    source_hash VARCHAR(64) NOT NULL, 
    source TEXT NOT NULL, 
    value TEXT NOT NULL, 
    updated_by UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_translations PRIMARY KEY (id), 
    CONSTRAINT uq_translations_lang_source_hash UNIQUE (lang, source_hash), 
    CONSTRAINT fk_translations_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE public."translations" ENABLE ROW LEVEL SECURITY;

UPDATE alembic_version SET version_num='0024' WHERE alembic_version.version_num = '0023';

-- Running upgrade 0024 -> 0025

ALTER TABLE branches ALTER COLUMN phone TYPE VARCHAR(80);

UPDATE branches SET phone = '+91 95666 79928, +91 86676 30258' WHERE slug = 'salem' AND phone = '+91 95666 79928';

INSERT INTO contact_channels (id, owner_type, owner_ref, kind, type, label, value, note, locations, is_active, sort_order, dedupe_key) SELECT CAST('3d5f0f0e-5b6e-5a39-9a43-8667630258aa' AS uuid), 'global', NULL, 'contact', 'phone', 'Phone', '+91 86676 30258', 'Salem', CAST('["footer", "contact"]' AS json), true, COALESCE((SELECT MAX(sort_order) FROM contact_channels WHERE owner_type = 'global'), 0) + 10, 'contact:phone:918667630258' WHERE NOT EXISTS (SELECT 1 FROM contact_channels WHERE dedupe_key = 'contact:phone:918667630258');

UPDATE alembic_version SET version_num='0025' WHERE alembic_version.version_num = '0024';

-- Running upgrade 0025 -> 0026

CREATE TABLE pz_profiles (
    id UUID NOT NULL, 
    user_id UUID NOT NULL, 
    nickname VARCHAR(24) NOT NULL, 
    nickname_key VARCHAR(24) NOT NULL, 
    avatar VARCHAR(32) DEFAULT 'star-collector' NOT NULL, 
    preferences JSON DEFAULT '{}' NOT NULL, 
    stats JSON DEFAULT '{}' NOT NULL, 
    games_played INTEGER DEFAULT '0' NOT NULL, 
    verified_points INTEGER DEFAULT '0' NOT NULL, 
    last_played_at TIMESTAMP WITH TIME ZONE, 
    hidden BOOLEAN DEFAULT false NOT NULL, 
    moderation_note VARCHAR(300), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_profiles PRIMARY KEY (id), 
    CONSTRAINT uq_pz_profiles_user_id UNIQUE (user_id), 
    CONSTRAINT uq_pz_profiles_nickname_key UNIQUE (nickname_key), 
    CONSTRAINT fk_pz_profiles_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_pz_profiles_verified_points ON pz_profiles (verified_points);

CREATE TABLE pz_game_sessions (
    id UUID NOT NULL, 
    user_id UUID NOT NULL, 
    game VARCHAR(20) NOT NULL, 
    level_id VARCHAR(40) DEFAULT 'main' NOT NULL, 
    config JSON DEFAULT '{}' NOT NULL, 
    request_key VARCHAR(64), 
    status VARCHAR(12) DEFAULT 'started' NOT NULL, 
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    completed_at TIMESTAMP WITH TIME ZONE, 
    duration_ms INTEGER, 
    client_result JSON, 
    verdict VARCHAR(12), 
    reasons JSON DEFAULT '[]' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_game_sessions PRIMARY KEY (id), 
    CONSTRAINT ck_pz_game_sessions_ck_pz_game_sessions_status CHECK (status in ('started','completed','rejected','expired')), 
    CONSTRAINT uq_pz_game_sessions_request UNIQUE (user_id, request_key), 
    CONSTRAINT fk_pz_game_sessions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_pz_game_sessions_user_game_started ON pz_game_sessions (user_id, game, started_at);

CREATE INDEX ix_pz_game_sessions_status_expires ON pz_game_sessions (status, expires_at);

CREATE TABLE pz_scores (
    id UUID NOT NULL, 
    session_id UUID NOT NULL, 
    user_id UUID NOT NULL, 
    game VARCHAR(20) NOT NULL, 
    level_id VARCHAR(40) DEFAULT 'main' NOT NULL, 
    score INTEGER NOT NULL, 
    points INTEGER NOT NULL, 
    status VARCHAR(10) DEFAULT 'accepted' NOT NULL, 
    flags JSON DEFAULT '[]' NOT NULL, 
    details JSON DEFAULT '{}' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_scores PRIMARY KEY (id), 
    CONSTRAINT ck_pz_scores_ck_pz_scores_status CHECK (status in ('accepted','flagged','hidden')), 
    CONSTRAINT uq_pz_scores_session_id UNIQUE (session_id), 
    CONSTRAINT fk_pz_scores_session_id_pz_game_sessions FOREIGN KEY(session_id) REFERENCES pz_game_sessions (id) ON DELETE CASCADE, 
    CONSTRAINT fk_pz_scores_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_pz_scores_board ON pz_scores (game, level_id, status, created_at);

CREATE INDEX ix_pz_scores_game_score ON pz_scores (game, status, score);

CREATE INDEX ix_pz_scores_user_game ON pz_scores (user_id, game, created_at);

CREATE TABLE pz_progress (
    user_id UUID NOT NULL, 
    game VARCHAR(20) NOT NULL, 
    data JSON DEFAULT '{}' NOT NULL, 
    version INTEGER DEFAULT '1' NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_progress PRIMARY KEY (user_id, game), 
    CONSTRAINT fk_pz_progress_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE pz_achievement_defs (
    code VARCHAR(40) NOT NULL, 
    title VARCHAR(60) NOT NULL, 
    description VARCHAR(200) NOT NULL, 
    game VARCHAR(20), 
    icon VARCHAR(30) DEFAULT 'trophy' NOT NULL, 
    sort_order INTEGER DEFAULT '0' NOT NULL, 
    active BOOLEAN DEFAULT true NOT NULL, 
    CONSTRAINT pk_pz_achievement_defs PRIMARY KEY (code)
);

CREATE TABLE pz_player_achievements (
    user_id UUID NOT NULL, 
    code VARCHAR(40) NOT NULL, 
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    session_id UUID, 
    CONSTRAINT pk_pz_player_achievements PRIMARY KEY (user_id, code), 
    CONSTRAINT fk_pz_player_achievements_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    CONSTRAINT fk_pz_player_achievements_code_pz_achievement_defs FOREIGN KEY(code) REFERENCES pz_achievement_defs (code) ON DELETE CASCADE, 
    CONSTRAINT fk_pz_player_achievements_session_id_pz_game_sessions FOREIGN KEY(session_id) REFERENCES pz_game_sessions (id) ON DELETE SET NULL
);

CREATE TABLE pz_challenges (
    id UUID NOT NULL, 
    challenge_date DATE NOT NULL, 
    code VARCHAR(40) NOT NULL, 
    title VARCHAR(80) NOT NULL, 
    description VARCHAR(200) NOT NULL, 
    metric VARCHAR(30) NOT NULL, 
    game VARCHAR(20), 
    target INTEGER NOT NULL, 
    reward_points INTEGER NOT NULL, 
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    CONSTRAINT pk_pz_challenges PRIMARY KEY (id), 
    CONSTRAINT uq_pz_challenges_day_code UNIQUE (challenge_date, code)
);

CREATE INDEX ix_pz_challenges_date ON pz_challenges (challenge_date);

CREATE TABLE pz_challenge_progress (
    user_id UUID NOT NULL, 
    challenge_id UUID NOT NULL, 
    progress INTEGER DEFAULT '0' NOT NULL, 
    games JSON DEFAULT '[]' NOT NULL, 
    completed_at TIMESTAMP WITH TIME ZONE, 
    claimed_at TIMESTAMP WITH TIME ZONE, 
    reward_points INTEGER, 
    CONSTRAINT pk_pz_challenge_progress PRIMARY KEY (user_id, challenge_id), 
    CONSTRAINT fk_pz_challenge_progress_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    CONSTRAINT fk_pz_challenge_progress_challenge_id_pz_challenges FOREIGN KEY(challenge_id) REFERENCES pz_challenges (id) ON DELETE CASCADE
);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('first-steps', 'First Steps', 'Play your first game in the Play Zone.', NULL, 'footprints', 10);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('all-rounder', 'All-Rounder', 'Play all four games with a signed-in account.', NULL, 'gamepad', 20);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('star-collector', 'Star Collector', 'Collect 100 stars in Catch the Stars.', 'catch-the-stars', 'star', 30);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('cloud-explorer', 'Cloud Explorer', 'Complete Cloud Kingdom in LAXBOT Jump.', 'laxbot-jump', 'cloud', 40);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('sky-climber', 'Sky Climber', 'Complete all five LAXBOT Jump worlds.', 'laxbot-jump', 'mountain', 50);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('crystal-gardener', 'Crystal Gardener', 'Complete the five levels of Crystal Garden in Puzzle Pop.', 'puzzle-pop', 'flower', 60);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('puzzle-master', 'Puzzle Master', 'Complete 10 Puzzle Pop levels.', 'puzzle-pop', 'puzzle', 70);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('bug-squasher', 'Bug Squasher', 'Capture 50 bugs in Bug Hunter.', 'bug-hunter', 'bug', 80);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('cyber-defender', 'Cyber Defender', 'Defeat the Core Corruptor, the final Bug Hunter boss.', 'bug-hunter', 'shield', 90);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('daily-hero', 'Daily Hero', 'Claim your first daily challenge reward.', NULL, 'calendar', 100);

INSERT INTO pz_achievement_defs (code, title, description, game, icon, sort_order) VALUES ('champion', 'Champion', 'Reach 2,500 verified overall points.', NULL, 'trophy', 110);

ALTER TABLE public."pz_profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_game_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_scores" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_progress" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_achievement_defs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_player_achievements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_challenges" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_challenge_progress" ENABLE ROW LEVEL SECURITY;

UPDATE alembic_version SET version_num='0026' WHERE alembic_version.version_num = '0025';

-- Running upgrade 0026 -> 0027

ALTER TABLE pz_profiles ADD COLUMN suspended BOOLEAN DEFAULT 'false' NOT NULL;

ALTER TABLE pz_profiles ADD COLUMN suspended_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE pz_profiles ADD COLUMN suspended_reason VARCHAR(300);

ALTER TABLE pz_achievement_defs ADD COLUMN rule_type VARCHAR(30);

ALTER TABLE pz_achievement_defs ADD COLUMN rule_params JSON DEFAULT '{}' NOT NULL;

ALTER TABLE pz_achievement_defs ADD COLUMN reward_points INTEGER DEFAULT '0' NOT NULL;

ALTER TABLE pz_achievement_defs ADD COLUMN icon_media_id UUID;

ALTER TABLE pz_achievement_defs ADD CONSTRAINT fk_pz_achievement_defs_icon_media_id_media_assets FOREIGN KEY(icon_media_id) REFERENCES media_assets (id) ON DELETE SET NULL;

CREATE TABLE pz_game_configs (
    game VARCHAR(20) NOT NULL, 
    enabled BOOLEAN DEFAULT 'true' NOT NULL, 
    published BOOLEAN DEFAULT 'true' NOT NULL, 
    visibility VARCHAR(10) DEFAULT 'public' NOT NULL, 
    maintenance BOOLEAN DEFAULT 'false' NOT NULL, 
    featured BOOLEAN DEFAULT 'false' NOT NULL, 
    sort_order INTEGER DEFAULT '0' NOT NULL, 
    title VARCHAR(60), 
    short_description VARCHAR(200), 
    instructions TEXT, 
    thumbnail_media_id UUID, 
    banner_media_id UUID, 
    disabled_levels JSON DEFAULT '[]' NOT NULL, 
    params JSON DEFAULT '{}' NOT NULL, 
    config_version INTEGER DEFAULT '1' NOT NULL, 
    updated_by UUID, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_game_configs PRIMARY KEY (game), 
    CONSTRAINT fk_pz_game_configs_thumbnail_media_id_media_assets FOREIGN KEY(thumbnail_media_id) REFERENCES media_assets (id) ON DELETE SET NULL, 
    CONSTRAINT fk_pz_game_configs_banner_media_id_media_assets FOREIGN KEY(banner_media_id) REFERENCES media_assets (id) ON DELETE SET NULL, 
    CONSTRAINT fk_pz_game_configs_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE pz_game_config_versions (
    id UUID NOT NULL, 
    game VARCHAR(20) NOT NULL, 
    version INTEGER NOT NULL, 
    params JSON DEFAULT '{}' NOT NULL, 
    changed_by UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_game_config_versions PRIMARY KEY (id), 
    CONSTRAINT uq_pz_game_config_versions_game_version UNIQUE (game, version), 
    CONSTRAINT fk_pz_game_config_versions_changed_by_users FOREIGN KEY(changed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE pz_settings (
    key VARCHAR(40) NOT NULL, 
    value JSON DEFAULT '{}' NOT NULL, 
    updated_by UUID, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_settings PRIMARY KEY (key), 
    CONSTRAINT fk_pz_settings_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE pz_moderation_events (
    id UUID NOT NULL, 
    target_type VARCHAR(10) NOT NULL, 
    target_id UUID NOT NULL, 
    user_id UUID, 
    action VARCHAR(20) NOT NULL, 
    reason VARCHAR(300) NOT NULL, 
    admin_id UUID, 
    admin_email VARCHAR(200) NOT NULL, 
    detail JSON, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_moderation_events PRIMARY KEY (id), 
    CONSTRAINT ck_pz_moderation_events_ck_pz_moderation_events_target_type CHECK (target_type in ('score','player')), 
    CONSTRAINT fk_pz_moderation_events_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL, 
    CONSTRAINT fk_pz_moderation_events_admin_id_users FOREIGN KEY(admin_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_pz_moderation_events_target ON pz_moderation_events (target_type, target_id, created_at);

CREATE INDEX ix_pz_moderation_events_user ON pz_moderation_events (user_id, created_at);

CREATE TABLE pz_challenge_templates (
    id UUID NOT NULL, 
    code VARCHAR(40) NOT NULL, 
    title VARCHAR(80) NOT NULL, 
    description VARCHAR(200) NOT NULL, 
    metric VARCHAR(30) NOT NULL, 
    game VARCHAR(20), 
    targets JSON DEFAULT '[]' NOT NULL, 
    reward_points INTEGER DEFAULT '20' NOT NULL, 
    active BOOLEAN DEFAULT 'true' NOT NULL, 
    starts_on DATE, 
    ends_on DATE, 
    artwork_media_id UUID, 
    sort_order INTEGER DEFAULT '0' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_challenge_templates PRIMARY KEY (id), 
    CONSTRAINT uq_pz_challenge_templates_code UNIQUE (code), 
    CONSTRAINT fk_pz_challenge_templates_artwork_media_id_media_assets FOREIGN KEY(artwork_media_id) REFERENCES media_assets (id) ON DELETE SET NULL
);

CREATE TABLE pz_media_links (
    id UUID NOT NULL, 
    media_id UUID NOT NULL, 
    purpose VARCHAR(20) NOT NULL, 
    game VARCHAR(20), 
    label VARCHAR(100), 
    created_by UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pz_media_links PRIMARY KEY (id), 
    CONSTRAINT uq_pz_media_links_media_id UNIQUE (media_id), 
    CONSTRAINT ck_pz_media_links_ck_pz_media_links_purpose CHECK (purpose in ('game_thumbnail','game_banner','world_preview','achievement_icon','challenge_art','promo')), 
    CONSTRAINT fk_pz_media_links_media_id_media_assets FOREIGN KEY(media_id) REFERENCES media_assets (id) ON DELETE CASCADE, 
    CONSTRAINT fk_pz_media_links_created_by_users FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_pz_media_links_purpose ON pz_media_links (purpose);

CREATE INDEX ix_pz_game_sessions_started_at ON pz_game_sessions (started_at);

CREATE INDEX ix_pz_scores_created_at ON pz_scores (created_at);

CREATE INDEX ix_pz_profiles_created_at ON pz_profiles (created_at);

CREATE INDEX ix_pz_player_achievements_earned_at ON pz_player_achievements (earned_at);

INSERT INTO pz_challenge_templates (id, code, title, description, metric, game, targets, reward_points, sort_order) VALUES ('ce7b5f14-0db9-4dee-af51-dbf030d84631', 'stars', 'Collect {n} stars', 'Collect {n} stars in Catch the Stars (verified rounds only).', 'stars_collected', 'catch-the-stars', '[20, 25, 30, 20, 25, 30, 35]', 20, 10);

INSERT INTO pz_challenge_templates (id, code, title, description, metric, game, targets, reward_points, sort_order) VALUES ('7f2b920a-1d1d-46b2-b3f8-fce6ad0278a2', 'platform', 'Finish {n} platform level{s}', 'Complete {n} LAXBOT Jump level{s} (verified runs only).', 'platform_levels', 'laxbot-jump', '[1, 1, 1, 1, 1, 2, 2]', 20, 20);

INSERT INTO pz_challenge_templates (id, code, title, description, metric, game, targets, reward_points, sort_order) VALUES ('58dd8f02-9c99-416c-a0cd-2d57b522d800', 'puzzle', 'Win {n} puzzle level{s}', 'Win {n} Puzzle Pop level{s} (verified replays only).', 'puzzle_levels', 'puzzle-pop', '[1, 1, 1, 1, 1, 2, 2]', 20, 30);

INSERT INTO pz_challenge_templates (id, code, title, description, metric, game, targets, reward_points, sort_order) VALUES ('563cfd43-1e4f-42df-b382-52b5e656932b', 'bugs', 'Capture {n} bugs', 'Capture {n} bugs in Bug Hunter (verified runs only).', 'bugs_captured', 'bug-hunter', '[15, 12, 15, 18, 15, 20, 20]', 20, 40);

INSERT INTO pz_challenge_templates (id, code, title, description, metric, game, targets, reward_points, sort_order) VALUES ('3cd31541-b3f3-4a49-821d-92890bf9e145', 'two-games', 'Play {n} different games', 'Finish a verified round in {n} different Play Zone games today.', 'distinct_games', NULL, '[2, 2, 2, 2, 2, 3, 3]', 30, 50);

ALTER TABLE public."pz_game_configs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_game_config_versions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_moderation_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_challenge_templates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pz_media_links" ENABLE ROW LEVEL SECURITY;

UPDATE alembic_version SET version_num='0027' WHERE alembic_version.version_num = '0026';

-- Running upgrade 0027 -> 0028

CREATE TABLE pt_applications (
    id UUID NOT NULL, 
    reference VARCHAR(32) NOT NULL, 
    category VARCHAR(12) NOT NULL, 
    division VARCHAR(20) NOT NULL, 
    status VARCHAR(30) DEFAULT 'new' NOT NULL, 
    full_name VARCHAR(120) NOT NULL, 
    email VARCHAR(254) NOT NULL, 
    phone VARCHAR(20) NOT NULL, 
    country VARCHAR(80) NOT NULL, 
    state VARCHAR(80), 
    city VARCHAR(80), 
    occupation VARCHAR(120), 
    entity_type VARCHAR(20), 
    organization VARCHAR(160), 
    preferred_location VARCHAR(160), 
    answers JSON DEFAULT '{}' NOT NULL, 
    consultation JSON DEFAULT '{}' NOT NULL, 
    preferred_branch VARCHAR(40), 
    assigned_branch VARCHAR(40), 
    assigned_to UUID, 
    consent_processing BOOLEAN DEFAULT 'false' NOT NULL, 
    consent_marketing BOOLEAN DEFAULT 'false' NOT NULL, 
    consent_at TIMESTAMP WITH TIME ZONE, 
    source_page VARCHAR(160), 
    fingerprint VARCHAR(64) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pt_applications PRIMARY KEY (id), 
    CONSTRAINT uq_pt_applications_reference UNIQUE (reference), 
    CONSTRAINT ck_pt_applications_ck_pt_applications_category CHECK (category in ('franchise','authorized','referral')), 
    CONSTRAINT fk_pt_applications_assigned_to_users FOREIGN KEY(assigned_to) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_pt_applications_status_created ON pt_applications (status, created_at);

CREATE INDEX ix_pt_applications_category_division ON pt_applications (category, division);

CREATE INDEX ix_pt_applications_fingerprint ON pt_applications (fingerprint, created_at);

CREATE TABLE pt_application_events (
    id UUID NOT NULL, 
    application_id UUID NOT NULL, 
    kind VARCHAR(14) NOT NULL, 
    from_status VARCHAR(30), 
    to_status VARCHAR(30), 
    note TEXT, 
    author_id UUID, 
    author_name VARCHAR(120) DEFAULT 'Applicant' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pt_application_events PRIMARY KEY (id), 
    CONSTRAINT ck_pt_application_events_ck_pt_application_events_kind CHECK (kind in ('submitted','status','note','assign','consultation','followup')), 
    CONSTRAINT fk_pt_application_events_application_id_pt_applications FOREIGN KEY(application_id) REFERENCES pt_applications (id) ON DELETE CASCADE, 
    CONSTRAINT fk_pt_application_events_author_id_users FOREIGN KEY(author_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_pt_application_events_app ON pt_application_events (application_id, created_at);

CREATE TABLE pt_pages (
    slug VARCHAR(60) NOT NULL, 
    published BOOLEAN DEFAULT 'true' NOT NULL, 
    content JSON DEFAULT '{}' NOT NULL, 
    seo_title VARCHAR(160), 
    seo_description VARCHAR(320), 
    noindex BOOLEAN DEFAULT 'false' NOT NULL, 
    commercial JSON DEFAULT '{}' NOT NULL, 
    hero_media_id UUID, 
    hero_alt VARCHAR(200), 
    brochure_media_id UUID, 
    brochure_published BOOLEAN DEFAULT 'false' NOT NULL, 
    brochure_version INTEGER DEFAULT '0' NOT NULL, 
    version INTEGER DEFAULT '1' NOT NULL, 
    updated_by UUID, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pt_pages PRIMARY KEY (slug), 
    CONSTRAINT fk_pt_pages_hero_media_id_media_assets FOREIGN KEY(hero_media_id) REFERENCES media_assets (id) ON DELETE SET NULL, 
    CONSTRAINT fk_pt_pages_brochure_media_id_media_assets FOREIGN KEY(brochure_media_id) REFERENCES media_assets (id) ON DELETE SET NULL, 
    CONSTRAINT fk_pt_pages_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE pt_faqs (
    id UUID NOT NULL, 
    scope VARCHAR(60) DEFAULT 'general' NOT NULL, 
    question VARCHAR(300) NOT NULL, 
    answer TEXT NOT NULL, 
    sort_order INTEGER DEFAULT '0' NOT NULL, 
    published BOOLEAN DEFAULT 'true' NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pt_faqs PRIMARY KEY (id)
);

CREATE INDEX ix_pt_faqs_scope_sort ON pt_faqs (scope, sort_order);

CREATE TABLE pt_policies (
    id UUID NOT NULL, 
    key VARCHAR(30) NOT NULL, 
    scope VARCHAR(60) DEFAULT 'general' NOT NULL, 
    title VARCHAR(160) NOT NULL, 
    body TEXT NOT NULL, 
    version INTEGER DEFAULT '1' NOT NULL, 
    status VARCHAR(10) DEFAULT 'draft' NOT NULL, 
    effective_date DATE, 
    reviewed_by VARCHAR(160), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pt_policies PRIMARY KEY (id), 
    CONSTRAINT uq_pt_policies_key_scope_version UNIQUE (key, scope, version), 
    CONSTRAINT ck_pt_policies_ck_pt_policies_status CHECK (status in ('draft','published','archived'))
);

CREATE INDEX ix_pt_policies_key_scope ON pt_policies (key, scope, status);

CREATE TABLE pt_settings (
    key VARCHAR(40) NOT NULL, 
    value JSON DEFAULT '{}' NOT NULL, 
    updated_by UUID, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pt_settings PRIMARY KEY (key), 
    CONSTRAINT fk_pt_settings_updated_by_users FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE pt_menu_items (
    id UUID NOT NULL, 
    category VARCHAR(24) NOT NULL, 
    slug VARCHAR(40) NOT NULL, 
    label VARCHAR(60) NOT NULL, 
    description VARCHAR(300), 
    sort_order INTEGER DEFAULT '0' NOT NULL, 
    enabled BOOLEAN DEFAULT 'true' NOT NULL, 
    builtin BOOLEAN DEFAULT 'false' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_pt_menu_items PRIMARY KEY (id), 
    CONSTRAINT uq_pt_menu_items_category_slug UNIQUE (category, slug), 
    CONSTRAINT ck_pt_menu_items_ck_pt_menu_items_category CHECK (category in ('franchise','authorized-partner','referral-partner'))
);

CREATE INDEX ix_pt_menu_items_category_sort ON pt_menu_items (category, sort_order);

ALTER TABLE public."pt_applications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pt_application_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pt_pages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pt_faqs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pt_policies" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pt_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pt_menu_items" ENABLE ROW LEVEL SECURITY;

UPDATE alembic_version SET version_num='0028' WHERE alembic_version.version_num = '0027';

-- Running upgrade 0028 -> 0029

ALTER TABLE pt_applications ALTER COLUMN division TYPE VARCHAR(40);

ALTER TABLE pt_applications ADD COLUMN divisions JSON DEFAULT '[]' NOT NULL;

ALTER TABLE pt_applications ADD COLUMN all_divisions BOOLEAN DEFAULT 'false' NOT NULL;

ALTER TABLE pt_applications ADD COLUMN other_interest VARCHAR(300);

update pt_applications set divisions = json_build_array(division);

UPDATE alembic_version SET version_num='0029' WHERE alembic_version.version_num = '0028';

-- Running upgrade 0029 -> 0030

CREATE TABLE sheet_sync (
    id UUID NOT NULL, 
    record_kind VARCHAR(12) NOT NULL, 
    record_id UUID NOT NULL, 
    category VARCHAR(30) NOT NULL, 
    tab VARCHAR(120) NOT NULL, 
    status VARCHAR(10) DEFAULT 'pending' NOT NULL, 
    attempts INTEGER DEFAULT '0' NOT NULL, 
    last_error VARCHAR(300), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    synced_at TIMESTAMP WITH TIME ZONE, 
    CONSTRAINT pk_sheet_sync PRIMARY KEY (id), 
    CONSTRAINT uq_sheet_sync_record_category UNIQUE (record_kind, record_id, category)
);

CREATE INDEX ix_sheet_sync_status ON sheet_sync (status, updated_at);

ALTER TABLE public."sheet_sync" ENABLE ROW LEVEL SECURITY;

ALTER TABLE pt_applications ADD COLUMN sheets_synced_at TIMESTAMP WITH TIME ZONE;

UPDATE alembic_version SET version_num='0030' WHERE alembic_version.version_num = '0029';

COMMIT;

