"""Engine and session management. The engine is created lazily, so importing the app never needs a database."""

from __future__ import annotations

import time
from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, event, exc
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.url import connect_args
from app.core import pubcache  # noqa: F401  (registers the commit hooks that keep the public response cache fresh)

IDLE_PING_SECONDS = 20  # a pooled connection that has been idle longer than this is checked (one SELECT 1) before use; a busy one is not


@lru_cache
def get_engine() -> Engine:
    s = get_settings()
    url = s.sqlalchemy_url
    # pool_pre_ping would spend one full database round trip on EVERY request (about 200 ms to a managed database in another region). Stale connections are
    # still detected, but only for connections that sat idle (see _install_idle_ping), so a busy site pays nothing.
    engine = create_engine(
        url, pool_size=s.db_pool_size, max_overflow=s.db_max_overflow, pool_pre_ping=False, pool_recycle=s.db_pool_recycle_seconds,
        connect_args=connect_args(url, connect_timeout=s.db_connect_timeout_seconds, disable_prepared_statements=s.db_disable_prepared_statements),
    )
    _install_idle_ping(engine)
    return engine


def _install_idle_ping(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _fresh(_dbapi, record):
        record.info["last_used"] = time.monotonic()

    @event.listens_for(engine, "checkout")
    def _ping_if_idle(dbapi_conn, record, _proxy):
        if time.monotonic() - record.info.get("last_used", 0.0) > IDLE_PING_SECONDS:
            try:
                cur = dbapi_conn.cursor()
                cur.execute("SELECT 1")
                cur.close()
                dbapi_conn.rollback()
            except Exception as err:  # the server dropped the idle connection: let the pool open a new one transparently
                raise exc.DisconnectionError() from err
        record.info["last_used"] = time.monotonic()

    @event.listens_for(engine, "checkin")
    def _used(_dbapi, record):
        record.info["last_used"] = time.monotonic()


@lru_cache
def _factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


@lru_cache
def _read_factory() -> sessionmaker[Session]:
    # AUTOCOMMIT: a read-only request needs no BEGIN and no ROLLBACK, i.e. two fewer database round trips than a normal session. Same connection pool.
    return sessionmaker(bind=get_engine().execution_options(isolation_level="AUTOCOMMIT"), expire_on_commit=False)


def get_read_db() -> Iterator[Session]:
    """Request-scoped session for READ-ONLY public endpoints (nothing written through it is ever kept in a transaction: use get_db for anything that writes)."""
    db = _read_factory()()
    try:
        yield db
    finally:
        db.close()


def get_db() -> Iterator[Session]:
    """Request-scoped session. Services commit explicitly; anything uncommitted is rolled back on error."""
    db = _factory()()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def reset_engine() -> None:
    """Drop the cached engine/factory (used by tests and after settings change)."""
    if get_engine.cache_info().currsize:
        get_engine().dispose()
    get_engine.cache_clear()
    _factory.cache_clear()
    _read_factory.cache_clear()
