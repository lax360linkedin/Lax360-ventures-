"""Test harness.

Tests run against a REAL PostgreSQL database created from the Alembic migrations (so the migration itself is
exercised). By default a throwaway local server is started with the ``pgserver`` package under backend/.pgtest.
To use your own server instead, set TEST_DATABASE_URL — the database name must contain "test" because the suite
truncates tables. OpenAI is always faked here; no test makes a network call or needs a real key.
"""

from __future__ import annotations

import logging
import os
import re
import tempfile
import types
from pathlib import Path

import pytest

# Configure the environment BEFORE the app modules are imported, and never read a developer's backend/.env.
logging.raiseExceptions = False  # pgserver logs from an atexit hook after pytest has closed its streams
ORIGINAL_ENV = dict(os.environ)  # kept so the opt-in live OpenAI test can read credentials you exported
for _k in list(os.environ):
    if _k.startswith(("ADMIN_", "SUPABASE_", "MEDIA_", "HERO_", "OPENAI_", "GEMINI_", "AI_", "CHAT_", "COOKIE_", "SESSION_", "LOGIN_", "CONTACT_", "DEMO_")) or _k in ("DATABASE_URL", "AUTH_SECRET", "APP_ENV", "DOCS_ENABLED"):
        del os.environ[_k]
os.environ.update({"MEDIA_DIR": tempfile.mkdtemp(prefix="lax360_media_test_"), "APP_ENV": "test", "AUTH_SECRET": "test-secret-" + "x" * 40, "COOKIE_SECURE": "false", "CORS_ORIGINS": "http://localhost:5173"})

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from app.core.config import Settings, get_settings  # noqa: E402

Settings.model_config["env_file"] = None

BACKEND = Path(__file__).resolve().parents[1]
TABLES = "users, auth_sessions, demo_requests, contact_enquiries, chat_sessions, chat_messages, ai_usage, enquiry_notes, site_settings, content_items, media_assets, audit_logs, hero_video_config, hero_videos"
PASSWORD = "correct-horse-battery"


def _swap_db(uri: str, name: str) -> str:
    return re.sub(r"/[^/?]*(\?.*)?$", rf"/{name}\1", uri)


@pytest.fixture(scope="session")
def database_url():
    explicit = os.environ.get("TEST_DATABASE_URL")
    if explicit:
        name = explicit.rsplit("/", 1)[-1].split("?")[0]
        if "test" not in name:
            pytest.exit("TEST_DATABASE_URL must point at a database whose name contains 'test' (the suite truncates tables).", returncode=2)
        url = explicit
    else:
        import pgserver
        import psycopg

        # Keep the throwaway server's files OUT of OneDrive/synced folders (file sync makes PostgreSQL start very slowly).
        base = Path(os.environ.get("LAX360_PGTEST_DIR") or Path(tempfile.gettempdir()) / "lax360_pgtest")
        base.mkdir(parents=True, exist_ok=True)
        from pgserver.postgres_server import PostgresServer

        data_dir = (base / "data").resolve()
        admin_uri = None
        for attempt in range(48):
            try:
                server = pgserver.get_server(data_dir, cleanup_mode="stop")
                admin_uri = server.get_uri()  # raises while pgserver's 10s start-up wait has timed out
                break
            except Exception:  # noqa: BLE001
                import time

                # pgserver caches the half-started handle; drop it so the next attempt re-attaches to the now-running server.
                PostgresServer._instances.pop(data_dir, None)
                time.sleep(5)
        if admin_uri is None:
            pytest.exit("Could not start the throwaway PostgreSQL (or set TEST_DATABASE_URL to your own test database).", returncode=2)
        with psycopg.connect(admin_uri, autocommit=True) as c:
            c.execute("DROP DATABASE IF EXISTS lax360_test")  # throwaway server only
            c.execute("CREATE DATABASE lax360_test")
        url = _swap_db(admin_uri, "lax360_test")
    sa_url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", sa_url)
    command.upgrade(cfg, "head")
    return url


def apply_env(monkeypatch: pytest.MonkeyPatch, **values: str | None) -> None:
    for key, value in values.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)
    get_settings.cache_clear()


@pytest.fixture
def env(monkeypatch, database_url):
    """Change settings for one test: env(OPENAI_API_KEY='…')."""
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()

    def setter(**values):
        apply_env(monkeypatch, **values)

    yield setter
    get_settings.cache_clear()


@pytest.fixture
def engine(database_url):
    eng = create_engine(database_url.replace("postgresql://", "postgresql+psycopg://", 1))
    with eng.begin() as conn:
        conn.execute(text(f"TRUNCATE {TABLES} CASCADE"))
    yield eng
    eng.dispose()


@pytest.fixture
def app(env, engine):
    from app.core.rate_limit import limiter
    from app.db.session import reset_engine
    from app.main import create_app

    limiter.reset()
    reset_engine()
    application = create_app()
    yield application
    application.dependency_overrides.clear()
    reset_engine()


@pytest.fixture
def client(app):
    with TestClient(app, base_url="http://localhost", raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def db(engine):
    from sqlalchemy.orm import Session

    with Session(engine, expire_on_commit=False) as session:
        yield session


def make_user(db, email="ada@example.com", name="Ada Lovelace", password=PASSWORD, role="user", active=True, permissions=None):
    from app.models import User
    from app.services import auth_service

    user = auth_service.create_user(db, email=email, full_name=name, password=password, role=role, settings=get_settings())
    user.is_active = active
    if role == "admin":  # tests default to an admin who holds every module; pass permissions=[...] to limit
        from app.core.permissions import MODULES, clean_permissions

        user.permissions = list(MODULES) if permissions is None else clean_permissions(permissions)
    db.commit()
    return user


def login(client, email="ada@example.com", password=PASSWORD):
    """Log in through the real endpoint; returns the CSRF headers for later state-changing requests."""
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    if r.status_code == 403 and r.json()["error"]["code"] == "use_admin_login":  # staff sign in through the separate company-admin door
        r = client.post("/api/admin/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"X-CSRF-Token": r.json()["csrf_token"]}


def branch_id(client, city="Salem"):
    return next(b["id"] for b in client.get("/api/branches").json() if b["city"] == city)


# ---- OpenAI fakes -----------------------------------------------------------------------------
class FakeResponses:
    def __init__(self, behaviour):
        self.behaviour = behaviour
        self.calls: list[dict] = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        result = self.behaviour(kwargs) if callable(self.behaviour) else self.behaviour
        if isinstance(result, Exception):
            raise result
        return result


def fake_response(text="Hello from the fake model.", in_tokens=120, out_tokens=30):
    return types.SimpleNamespace(
        id="resp_test_1", output_text=text, status="completed",
        usage=types.SimpleNamespace(input_tokens=in_tokens, output_tokens=out_tokens), _request_id="req_test_1",
    )


@pytest.fixture
def ai(app, env):
    """Select OpenAI with a fake (async) client so tests can inspect/steer the provider call. No network, no key."""
    from app.api.deps import get_ai_service
    from app.providers.openai_provider import OpenAIProvider
    from app.services.ai_service import AIService

    env(AI_PROVIDER="openai", OPENAI_API_KEY="sk-test-fake-0000000000000000", OPENAI_MODEL="test-model-id")
    holder = types.SimpleNamespace(responses=FakeResponses(fake_response()))
    app.dependency_overrides[get_ai_service] = lambda: AIService(get_settings(), OpenAIProvider(get_settings(), client_factory=lambda s: holder))
    return holder
