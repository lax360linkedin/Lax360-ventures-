"""Engine and session management. The engine is created lazily, so importing the app never needs a database."""

from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.url import connect_args


@lru_cache
def get_engine() -> Engine:
    s = get_settings()
    url = s.sqlalchemy_url
    return create_engine(
        url, pool_size=s.db_pool_size, max_overflow=s.db_max_overflow, pool_pre_ping=True, pool_recycle=s.db_pool_recycle_seconds,
        connect_args=connect_args(url, connect_timeout=s.db_connect_timeout_seconds, disable_prepared_statements=s.db_disable_prepared_statements),
    )


@lru_cache
def _factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


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
