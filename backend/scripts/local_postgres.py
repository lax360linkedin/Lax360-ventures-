"""Development helper: start a throwaway local PostgreSQL (no system install needed) and print its DATABASE_URL.

    python scripts/local_postgres.py start     # starts the server, creates the database, prints the URL
    python scripts/local_postgres.py stop

Data lives in backend/.pgdev (git-ignored). This is for local development only — use a managed or properly
administered PostgreSQL for production.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pgserver
import psycopg

# Outside the project folder on purpose: OneDrive/synced folders make PostgreSQL extremely slow.
DATA = Path(os.environ.get("LAX360_PGDEV_DIR") or Path(tempfile.gettempdir()) / "lax360_pgdev") / "data"
DB = "lax360_dev"


def main() -> None:
    DATA.parent.mkdir(parents=True, exist_ok=True)
    action = sys.argv[1] if len(sys.argv) > 1 else "start"
    server = pgserver.get_server(DATA, cleanup_mode=None)  # keep running after this script exits
    if action == "stop":
        server.cleanup()
        print("stopped")
        return
    admin = server.get_uri()
    with psycopg.connect(admin, autocommit=True) as conn:
        if not conn.execute("select 1 from pg_database where datname = %s", (DB,)).fetchone():
            conn.execute(f'create database "{DB}"')
    print(admin.rsplit("/", 1)[0] + f"/{DB}")


if __name__ == "__main__":
    main()
