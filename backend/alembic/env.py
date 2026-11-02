from __future__ import annotations

from alembic import context
from sqlalchemy import create_engine, pool

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.core.config import get_settings
from app.db.base import Base
from app.db.url import connect_args

config = context.config
target_metadata = Base.metadata


def _url() -> str:
    # An explicit URL (tests, scripts) wins; otherwise DATABASE_URL from the environment / backend/.env.
    return config.get_main_option("sqlalchemy.url") or get_settings().sqlalchemy_url


def run_migrations_offline() -> None:
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = _url()
    settings = get_settings()
    engine = create_engine(url, poolclass=pool.NullPool, connect_args=connect_args(url, connect_timeout=settings.db_connect_timeout_seconds, disable_prepared_statements=settings.db_disable_prepared_statements))
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
