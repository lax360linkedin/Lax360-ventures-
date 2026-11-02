"""The migration, not just the models, is what production runs: check it end to end on PostgreSQL."""

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.autogenerate import compare_metadata
from sqlalchemy import create_engine, inspect

from app.db.base import Base
import app.models  # noqa: F401
from tests.conftest import BACKEND


def test_migrated_schema_matches_the_models_and_has_the_expected_constraints(database_url):
    engine = create_engine(database_url.replace("postgresql://", "postgresql+psycopg://", 1))
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn, opts={"compare_type": True}), Base.metadata)
        assert diff == [], f"models and migration differ: {diff}"
        insp = inspect(conn)
        assert {"users", "auth_sessions", "branches", "demo_requests", "contact_enquiries", "chat_sessions", "chat_messages", "ai_usage"} <= set(insp.get_table_names())
        assert any(u["column_names"] == ["email"] for u in insp.get_unique_constraints("users"))
        assert any(fk["referred_table"] == "branches" for fk in insp.get_foreign_keys("demo_requests"))
        assert any(i["name"] == "ix_demo_requests_user_id_created_at" for i in insp.get_indexes("demo_requests"))
    engine.dispose()


def test_downgrade_and_upgrade_roundtrip_on_a_scratch_database(database_url):
    """Runs on its own scratch database so it never touches the shared test schema."""
    import psycopg

    base = database_url.rsplit("/", 1)[0]
    with psycopg.connect(database_url, autocommit=True) as c:
        c.execute("DROP DATABASE IF EXISTS lax360_test_roundtrip")
        c.execute("CREATE DATABASE lax360_test_roundtrip")
    url = (base + "/lax360_test_roundtrip").replace("postgresql://", "postgresql+psycopg://", 1)
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    engine = create_engine(url)
    with engine.connect() as conn:
        assert len(conn.exec_driver_sql("select 1 from branches").fetchall()) == 3
    engine.dispose()
    with psycopg.connect(database_url, autocommit=True) as c:
        c.execute("DROP DATABASE lax360_test_roundtrip")
