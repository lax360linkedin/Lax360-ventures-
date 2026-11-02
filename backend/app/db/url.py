"""Database URL helpers: Supabase-aware connection arguments and safe, credential-free diagnostics."""

from __future__ import annotations

from sqlalchemy.engine import make_url


def _is_supabase(host: str) -> bool:
    return host.endswith(".supabase.co") or host.endswith(".supabase.com")


def connect_args(url: str, *, connect_timeout: int = 10, disable_prepared_statements: bool | None = None) -> dict:
    """Driver arguments for psycopg 3.

    - ``connect_timeout``: fail fast instead of hanging when the host is unreachable.
    - Supabase hosts always get ``sslmode=require`` unless the URL already sets an sslmode.
    - ``prepare_threshold=None`` turns off server-side prepared statements. Supabase's *transaction* pooler (port 6543) does
      not support them; it is applied automatically for port 6543 and can be forced with DB_DISABLE_PREPARED_STATEMENTS.
    """
    parsed = make_url(url)
    args: dict = {"connect_timeout": connect_timeout}
    if _is_supabase(parsed.host or "") and "sslmode" not in parsed.query:
        args["sslmode"] = "require"
    if disable_prepared_statements is True or (disable_prepared_statements is None and parsed.port == 6543):
        args["prepare_threshold"] = None
    return args


def describe_target(url: str) -> str:
    """'user@host:port/database' with the password removed (safe to print or log)."""
    p = make_url(url)
    return f"{p.username or '?'}@{p.host or '?'}:{p.port or 5432}/{p.database or '?'}"


def classify_error(exc: BaseException) -> str:
    """A short, actionable hint for a connection failure. Never includes the raw driver message (it can contain host/user)."""
    text = f"{type(exc).__name__} {exc}".lower()
    if "tenant or user not found" in text:
        return ("The Supabase pooler does not recognise the user. With the pooler the username must be postgres.<project-ref> "
                "(copy it from Connect > Session pooler), and the host must be the region host shown there.")
    if "password authentication failed" in text or "authentication failed" in text:
        return "Authentication failed: check the username and the database password (special characters in the password must be URL-encoded)."
    if "prepared statement" in text:
        return "The connection pooler rejected a prepared statement: use port 5432 (session pooler / direct) or set DB_DISABLE_PREPARED_STATEMENTS=true."
    if "could not translate host name" in text or "name or service not known" in text or "getaddrinfo" in text or "nodename nor servname" in text:
        return ("The database host name could not be resolved. Check DATABASE_URL for typos. Supabase's direct host (db.<ref>.supabase.co) "
                "is IPv6-only on some plans/networks: use the Session pooler host from the Connect panel instead.")
    if "timeout" in text or "timed out" in text:
        return "The connection timed out: check your internet/firewall, and that the host and port are correct (5432 for session pooler/direct)."
    if "connection refused" in text or "could not connect" in text:
        return "The server refused the connection: check the host and port, and that the database is running and reachable from this network."
    if "ssl" in text:
        return "SSL negotiation failed: Supabase requires SSL; keep sslmode=require in DATABASE_URL."
    if "database" in text and "does not exist" in text:
        return "The database name in DATABASE_URL does not exist (Supabase's default is 'postgres')."
    return f"Could not connect to the database ({type(exc).__name__}). Run `python -m app.cli check-db` and check the server log."
