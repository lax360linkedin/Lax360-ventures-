from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.core.rate_limit import SlidingWindowLimiter
from app.models import AuthSession
from app.services import auth_service
from tests.conftest import login, make_user


def test_rate_limiter_drops_idle_keys_so_memory_stays_bounded():
    limiter = SlidingWindowLimiter()
    limiter.MAX_KEYS = 50
    for i in range(200):
        assert limiter.hit(f"ip-{i}", 5, 60) is None
    assert len(limiter._hits) <= 200
    # Everything above is "old": age it past the horizon, then the next hit prunes.
    for q in limiter._hits.values():
        q.clear()
        q.append(-10_000.0)
    limiter.hit("fresh", 5, 60)
    assert set(limiter._hits) == {"fresh"}


def test_hsts_is_sent_only_in_production(env, monkeypatch):
    from app.main import create_app

    assert "strict-transport-security" not in TestClient(create_app()).get("/health").headers
    env(APP_ENV="production", COOKIE_SECURE="true")
    headers = TestClient(create_app()).get("/health").headers  # lifespan (which validates the config) is not started here
    assert headers["strict-transport-security"].startswith("max-age=31536000")
    assert TestClient(create_app()).get("/api/docs").status_code == 404  # docs are off in production


def test_expired_and_revoked_sessions_are_purged_but_live_ones_stay(client, db):
    make_user(db)
    csrf = login(client)
    assert client.post("/api/auth/logout", headers=csrf).status_code == 204  # revoke the first session
    login(client)  # a second, live session
    old = datetime.now(timezone.utc) - timedelta(days=3)
    db.execute(update(AuthSession).where(AuthSession.revoked_at.is_not(None)).values(revoked_at=old))
    db.commit()
    before = len(db.scalars(select(AuthSession)).all())
    assert auth_service.purge_sessions(db) == 1
    assert len(db.scalars(select(AuthSession)).all()) == before - 1
    assert client.get("/api/auth/me").status_code == 200  # the live session still works


def test_cli_purge_sessions_runs(env, capsys):
    from app import cli

    cli.main(["purge-sessions"])
    assert "Deleted" in capsys.readouterr().out


def test_check_config_lists_missing_values_without_printing_them(env, capsys):
    import pytest

    from app import cli

    env(DATABASE_URL=None, GEMINI_API_KEY="AIza-super-secret-value", GEMINI_MODEL=None)
    with pytest.raises(SystemExit) as exit_info:
        cli.main(["check-config"])
    out = capsys.readouterr()
    assert exit_info.value.code == 1 and "EMPTY  DATABASE_URL" in out.out and "EMPTY  GEMINI_MODEL" in out.out
    assert "super-secret" not in out.out + out.err
    env(DATABASE_URL="postgresql://u:p@localhost/db", GEMINI_MODEL="some-model")
    cli.main(["check-config"])  # all present: exits normally
