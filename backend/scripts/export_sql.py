"""Write the full schema as one SQL file (backend/sql/supabase_schema.sql), generated from the Alembic migrations.

    python scripts/export_sql.py

Use it when you prefer to paste SQL into the Supabase dashboard (SQL Editor) instead of running `alembic upgrade head`.
The file also creates and fills `alembic_version`, so Alembic stays consistent if you use it later. Run it ONCE on an
empty database; do not mix it with `alembic upgrade head` on the same database.
"""

from __future__ import annotations

import io
from pathlib import Path

from alembic import command
from alembic.config import Config

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "sql" / "supabase_schema.sql"

HEADER = """-- LAX360 Ventures database schema (generated from backend/alembic/versions by scripts/export_sql.py).
-- Run ONCE on an EMPTY database in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It creates 8 tables, seeds the branches Salem / Bangalore / Mumbai, and enables row-level security on every table.
-- Do not run it together with `alembic upgrade head` on the same database. Regenerate after any schema change.

"""


def main() -> None:
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", "postgresql+psycopg://offline/offline")  # never connected to in --sql mode
    buffer = io.StringIO()
    cfg.output_buffer = buffer
    command.upgrade(cfg, "base:head", sql=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(HEADER + buffer.getvalue(), encoding="utf8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(buffer.getvalue().splitlines())} lines)")


if __name__ == "__main__":
    main()
