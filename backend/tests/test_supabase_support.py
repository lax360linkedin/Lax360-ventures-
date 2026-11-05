"""Supabase readiness: connection arguments, safe failures, row-level security, the exported SQL, and `check-db`.

Nothing here connects to Supabase itself (no credentials exist in this project); it uses the same PostgreSQL test server
and simulates Supabase-specific behaviour (pooler URLs, the `anon` role).
"""

import re

import psycopg
import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine

import app.models  # noqa: F401
from app import cli
from app.db.base import Base
from app.db.session import reset_engine
from app.db.url import classify_error, connect_args, describe_target
from tests.conftest import BACKEND

POOLER_SESSION = "postgresql://postgres.abcdefgh:p%40ss@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
POOLER_TXN = "postgresql://postgres.abcdefgh:p%40ss@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
DIRECT = "postgresql://postgres:p%40ss@db.abcdefgh.supabase.co:5432/postgres"


# ---- connection arguments --------------------------------------------------------------------------
def test_supabase_hosts_get_ssl_and_a_connect_timeout():
    for url in (POOLER_SESSION, DIRECT):
        args = connect_args(url)
        assert args["sslmode"] == "require" and args["connect_timeout"] == 10 and "prepare_threshold" not in args


def test_transaction_pooler_disables_prepared_statements_automatically():
    assert connect_args(POOLER_TXN)["prepare_threshold"] is None
    assert "prepare_threshold" not in connect_args(POOLER_SESSION)
    assert connect_args("postgresql://u:p@localhost:5432/db", disable_prepared_statements=True)["prepare_threshold"] is None
    assert "prepare_threshold" not in connect_args(POOLER_TXN, disable_prepared_statements=False) or connect_args(POOLER_TXN, disable_prepared_statements=False).get("prepare_threshold", 0) == 0


def test_local_databases_are_left_alone_and_explicit_sslmode_wins():
    assert connect_args("postgresql://u:p@localhost:5432/db") == {"connect_timeout": 10}
    assert "sslmode" not in connect_args(POOLER_SESSION + "?sslmode=verify-full")  # already in the URL; passed through by the driver


def test_describe_target_never_contains_the_password():
    text = describe_target(POOLER_SESSION)
    assert text == "postgres.abcdefgh@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" and "p%40ss" not in text and "p@ss" not in text


@pytest.mark.parametrize(
    ("message", "needle"),
    [
        ("FATAL: password authentication failed for user x", "Authentication failed"),
        ("FATAL: Tenant or user not found", "postgres.<project-ref>"),
        ("could not translate host name db.x.supabase.co to address", "Session pooler"),
        ("connection timeout expired", "timed out"),
        ("connection refused", "refused"),
        ("prepared statement _pg3_0 does not exist", "DB_DISABLE_PREPARED_STATEMENTS"),
        ('database "nope" does not exist', "database name"),
        ("something strange", "check-db"),
    ],
)
def test_error_hints_are_actionable_and_do_not_echo_the_driver_message(message, needle):
    hint = classify_error(RuntimeError(message + " host=secret.internal user=bob"))
    assert needle in hint and "secret.internal" not in hint and "bob" not in hint


# ---- failures are safe -----------------------------------------------------------------------------
def test_unreachable_database_gives_a_safe_503_not_a_stack_trace(client, env):
    env(DATABASE_URL="postgresql://appuser:SuperSecretPw@127.0.0.1:1/nodb")
    reset_engine()
    r = client.get("/api/branches")
    assert r.status_code == 503 and r.json()["error"]["code"] == "database_unavailable"
    assert "SuperSecretPw" not in r.text and "127.0.0.1" not in r.text and "Traceback" not in r.text
    ready = client.get("/api/health/ready")
    assert ready.status_code == 503 and ready.json()["database"] == "unreachable"  # only reported "ok" after a real SELECT 1
    assert "SuperSecretPw" not in ready.text


def test_missing_database_url_gives_a_clear_safe_error(client, env):
    env(DATABASE_URL=None)
    reset_engine()
    r = client.get("/api/branches")
    assert r.status_code == 503 and r.json()["error"]["code"] == "not_configured"
    assert "DATABASE_URL" in r.json()["error"]["message"]  # development hint names the variable


def test_check_db_reports_a_real_connection(env, capsys):
    cli.main(["check-db"])
    out = capsys.readouterr().out
    assert "Connected: yes" in out and "Migration revision: 0010" in out and "Tables: all present" in out
    assert "Row-level security: enabled on all app tables" in out
    assert "password" not in out.lower()


def test_check_db_failure_prints_a_hint_and_exits_nonzero(env, capsys):
    env(DATABASE_URL="postgresql://appuser:SuperSecretPw@127.0.0.1:1/nodb")
    reset_engine()
    with pytest.raises(SystemExit) as exit_info:
        cli.main(["check-db"])
    captured = capsys.readouterr()
    assert exit_info.value.code == 2 and "Connected: NO" in captured.err
    assert "SuperSecretPw" not in captured.out + captured.err


# ---- row-level security ----------------------------------------------------------------------------
def test_rls_is_enabled_on_every_table(database_url):
    with psycopg.connect(database_url) as conn:
        rows = conn.execute(
            "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'"
        ).fetchall()
    assert len(rows) >= 14 and all(rls for _, rls in rows), [name for name, rls in rows if not rls]


def scratch_database(database_url, name):
    with psycopg.connect(database_url, autocommit=True) as c:
        c.execute(f"DROP DATABASE IF EXISTS {name}")
        c.execute(f"CREATE DATABASE {name}")
    return re.sub(r"/[^/?]*(\?.*)?$", rf"/{name}\1", database_url)


def test_supabase_api_roles_lose_access_after_migration(database_url):
    """Simulates Supabase: an `anon` role that is granted access to new tables by default (as Supabase does)."""
    url = scratch_database(database_url, "lax360_test_rls")
    try:
        with psycopg.connect(url, autocommit=True) as c:
            c.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$")
            c.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon")
            c.execute("GRANT USAGE ON SCHEMA public TO anon")
    except psycopg.errors.InsufficientPrivilege:
        pytest.skip("this test database user cannot create roles")
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url.replace("postgresql://", "postgresql+psycopg://", 1))
    command.upgrade(cfg, "0001")
    with psycopg.connect(url) as c:  # before 0002 the API role can read everything
        c.execute("SET ROLE anon")
        assert c.execute("select count(*) from branches").fetchone()[0] == 3
    command.upgrade(cfg, "head")
    with psycopg.connect(url) as c:
        c.execute("SET ROLE anon")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            c.execute("select * from users")
    with psycopg.connect(url) as c:  # the owner (the backend) is unaffected by RLS
        assert c.execute("select count(*) from branches").fetchone()[0] == 3
    with psycopg.connect(url, autocommit=True) as c:
        c.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon")
        c.execute("DROP OWNED BY anon")
    with psycopg.connect(database_url, autocommit=True) as c:
        c.execute("DROP DATABASE lax360_test_rls")
        c.execute("DROP ROLE IF EXISTS anon")


# ---- the SQL file for the Supabase SQL editor ------------------------------------------------------
def test_exported_sql_builds_the_same_schema_as_the_migrations(database_url):
    sql = (BACKEND / "sql" / "supabase_schema.sql").read_text(encoding="utf8")
    url = scratch_database(database_url, "lax360_test_sqlfile")
    with psycopg.connect(url, autocommit=True) as c:
        c.execute(sql)
        assert c.execute("select version_num from alembic_version").fetchone()[0] == "0010"
        assert c.execute("select count(*) from branches").fetchone()[0] == 3
        assert c.execute("select bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'").fetchone()[0]
    engine = create_engine(url.replace("postgresql://", "postgresql+psycopg://", 1))
    with engine.connect() as conn:
        assert compare_metadata(MigrationContext.configure(conn, opts={"compare_type": True}), Base.metadata) == []
    engine.dispose()
    with psycopg.connect(database_url, autocommit=True) as c:
        c.execute("DROP DATABASE lax360_test_sqlfile")


def test_the_exported_sql_file_is_up_to_date():
    """Fails if someone changes a migration without re-running `python scripts/export_sql.py`."""
    import io

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", "postgresql+psycopg://offline/offline")
    buffer = io.StringIO()
    cfg.output_buffer = buffer
    command.upgrade(cfg, "base:head", sql=True)

    def normalise(text):  # branch ids are random per generation
        return re.sub(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "<uuid>", text)

    on_disk = (BACKEND / "sql" / "supabase_schema.sql").read_text(encoding="utf8")
    assert normalise(buffer.getvalue()) in normalise(on_disk), "backend/sql/supabase_schema.sql is stale: run `python scripts/export_sql.py`"


def test_missing_tables_give_a_clear_503_not_a_generic_500(client, app, monkeypatch):
    import psycopg.errors
    from sqlalchemy.exc import ProgrammingError

    from app.api.routes import branches

    def boom(*a, **k):
        raise ProgrammingError("select * from branches", {}, psycopg.errors.UndefinedTable("relation \"branches\" does not exist"))

    monkeypatch.setattr(branches, "list_branches", boom)
    r = client.get("/api/branches")
    assert r.status_code == 503 and r.json()["error"]["code"] == "database_not_ready"
    assert "alembic upgrade head" in r.json()["error"]["message"]  # development hint
    assert "relation" not in r.text  # driver message is not leaked


def test_readiness_reports_schema_status(client):
    body = client.get("/api/health/ready").json()
    assert body["database"] == "ok" and body["schema"] == "ok"
