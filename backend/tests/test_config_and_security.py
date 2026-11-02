import pytest
from fastapi.testclient import TestClient

from app.core.config import ConfigError, Settings
from tests.conftest import PASSWORD, make_user


def prod(**over):
    base = dict(app_env="production", auth_secret="s" * 40, database_url="postgresql://u:p@h/db", cors_origins="https://www.example.com", frontend_origin="https://www.example.com", cookie_secure=None, _env_file=None)
    base.update(over)
    return Settings(**base)


def test_production_config_validation_rejects_weak_settings():
    prod().validate_for_production()
    with pytest.raises(ConfigError, match="AUTH_SECRET"):
        prod(auth_secret="short").validate_for_production()
    with pytest.raises(ConfigError, match="AUTH_SECRET"):
        prod(auth_secret=None).validate_for_production()
    with pytest.raises(ConfigError, match="COOKIE_SECURE"):
        prod(cookie_secure=False).validate_for_production()
    with pytest.raises(ConfigError, match="https"):
        prod(cors_origins="http://www.example.com", frontend_origin="http://www.example.com").validate_for_production()
    with pytest.raises(ConfigError, match="DATABASE_URL"):
        prod(database_url=None).validate_for_production()


def test_settings_defaults_are_safe_and_secrets_are_never_printed():
    s = Settings(_env_file=None, openai_api_key="sk-live-should-never-print", auth_secret="a" * 40)
    assert s.docs_on and not s.cookie_secure_on and s.openai_model is None
    assert "sk-live-should-never-print" not in repr(s) and "a" * 40 not in repr(s)
    assert prod().docs_on is False and prod().cookie_secure_on is True


def test_missing_database_url_is_a_clear_safe_error():
    with pytest.raises(ConfigError, match="DATABASE_URL"):
        Settings(_env_file=None, database_url=None).sqlalchemy_url  # noqa: B018


def test_blank_env_values_are_treated_as_unset():
    s = Settings(_env_file=None, openai_api_key="  ", openai_model="", cookie_secure="")
    assert s.openai_api_key is None and s.openai_model is None and not s.ai_configured


def test_docs_follow_the_environment(env, monkeypatch):
    from app.main import create_app

    assert create_app().docs_url == "/api/docs"
    env(APP_ENV="production")
    assert create_app().docs_url is None and create_app().openapi_url is None


def test_secure_cookie_flag_when_configured(env, client, db):
    make_user(db)
    env(COOKIE_SECURE="true", COOKIE_SAMESITE="strict")
    r = client.post("/api/auth/login", json={"email": "ada@example.com", "password": PASSWORD})
    cookie = r.headers["set-cookie"].lower()
    assert "secure" in cookie and "samesite=strict" in cookie and "httponly" in cookie


def test_cors_allows_only_configured_origins(client):
    ok = client.options("/api/contact", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-csrf-token"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert ok.headers.get("access-control-allow-credentials") == "true"
    bad = client.options("/api/contact", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in bad.headers


def test_wildcard_cors_is_refused(env):
    from app.main import create_app

    env(CORS_ORIGINS="*")
    with pytest.raises(ConfigError):
        create_app()


def test_security_headers_and_no_store(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["x-frame-options"] == "DENY"
    assert r.headers["cache-control"] == "no-store"


def test_unknown_routes_use_the_error_envelope(client):
    r = client.get("/api/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_sql_injection_strings_are_just_data(client, db):
    from sqlalchemy import select

    from app.models import ContactEnquiry, User

    make_user(db)
    evil = "Robert'); DROP TABLE users;--"
    r = client.post("/api/contact", json={"name": evil, "email": "bob@example.com", "message": "x" * 20 + evil, "consent": True})
    assert r.status_code == 201
    assert db.scalar(select(ContactEnquiry.name)) == evil
    assert db.scalar(select(User.email)) == "ada@example.com"  # users table still exists and is intact
    login = client.post("/api/auth/login", json={"email": "ada@example.com' OR '1'='1", "password": "x"})
    assert login.status_code == 401  # treated as a plain (unknown) identifier, never as SQL
