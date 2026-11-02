"""Operator commands. Run from backend/ with the virtualenv active:

    python -m app.cli create-user --email you@example.com --name "Your Name" --role super_admin
    python -m app.cli create-user --email staff@example.com --name "Staff" --role admin --permissions enquiries,content
    python -m app.cli set-password --email you@example.com
    python -m app.cli provision-admin      (initial super admin from ADMIN_EMAIL/ADMIN_USERNAME/ADMIN_PASSWORD)
    python -m app.cli purge-chats
    python -m app.cli purge-sessions
    python -m app.cli check-db
    python -m app.cli check-config
    python -m app.cli check-ai

Passwords are always typed at a hidden prompt (or read from the LAX360_NEW_PASSWORD environment variable for
non-interactive provisioning); they are never accepted as command-line arguments, so they stay out of shell history.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from sqlalchemy import inspect, select, text

from app.core.config import ConfigError, get_settings
from app.core.security import hash_password
from app.db.session import _factory, get_engine
from app.db.url import classify_error, describe_target
from app.models import User
from app.providers.base import AIServiceError
from app.services import auth_service, chat_service
from app.services.ai_service import build_ai_service


def _password() -> str:
    env = os.environ.get("LAX360_NEW_PASSWORD")
    if env:
        return env
    first = getpass.getpass("Password: ")
    if first != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords do not match.")
    return first


def create_user(args: argparse.Namespace) -> None:
    settings = get_settings()
    with _factory()() as db:
        try:
            user = auth_service.create_user(db, email=args.email, full_name=args.name, password=_password(), role=args.role, settings=settings)
            if args.role == "admin":
                from app.core.permissions import clean_permissions

                user.permissions = clean_permissions([p.strip() for p in args.permissions.split(",") if p.strip()])
        except ValueError as exc:
            raise SystemExit(str(exc)) from None
        db.commit()
        print(f"Created {user.role} {user.email}")


def set_password(args: argparse.Namespace) -> None:
    settings = get_settings()
    password = _password()
    if len(password) < settings.min_password_length:
        raise SystemExit(f"Password must be at least {settings.min_password_length} characters.")
    with _factory()() as db:
        user = db.scalar(select(User).where(User.email == auth_service.normalize_email(args.email)))
        if user is None:
            raise SystemExit("No user with that email.")
        user.password_hash = hash_password(password)
        db.commit()
        print(f"Password updated for {user.email}")


def provision_admin(args: argparse.Namespace) -> None:
    """Create (or, only when asked, update) the initial super admin from ADMIN_EMAIL / ADMIN_USERNAME / ADMIN_PASSWORD."""
    settings = get_settings()
    with _factory()() as db:
        result = auth_service.provision_initial_admin(db, settings, reset_password=args.reset_password, promote=args.promote)
    print(result.message, file=sys.stdout if result.ok else sys.stderr)
    if not result.ok:
        raise SystemExit(2)


def purge_chats(_: argparse.Namespace) -> None:
    with _factory()() as db:
        print(f"Deleted {chat_service.purge_expired(db)} expired conversation(s)")


def purge_sessions(_: argparse.Namespace) -> None:
    with _factory()() as db:
        print(f"Deleted {auth_service.purge_sessions(db)} expired login session(s)")


def check_config(_: argparse.Namespace) -> None:
    """Which required settings are filled in? Prints variable NAMES and SET/EMPTY only, never values. Exit 1 if anything is missing."""
    s = get_settings()
    provider = s.ai_provider
    rows = [
        ("DATABASE_URL", bool(s.database_url)),
        ("AUTH_SECRET (32+ chars)", bool(s.auth_secret and len(s.auth_secret.get_secret_value()) >= 32)),
        (f"{provider.upper()}_API_KEY", bool(getattr(s, f"{provider}_api_key"))),
        (f"{provider.upper()}_MODEL", bool(getattr(s, f"{provider}_model"))),
        ("CORS_ORIGINS / FRONTEND_ORIGIN", bool(s.cors_origin_list)),
    ]
    print(f"APP_ENV={s.app_env}  AI_PROVIDER={provider}")
    for name, ok in rows:
        print(f"  {'SET  ' if ok else 'EMPTY'}  {name}")
    problems = [name for name, ok in rows if not ok]
    if s.is_production:
        try:
            s.validate_for_production()
            print("  OK     production safety checks (secure cookies, https origins, strong secret)")
        except ConfigError as exc:
            print(f"  FAIL   {exc}")
            problems.append("production safety")
    if problems:
        print(f"Missing or unsafe: {', '.join(problems)}", file=sys.stderr)
        raise SystemExit(1)
    print("All required settings are present (this does not test the connections: run check-db and the live provider test).")


AI_HINTS = {
    "provider_auth": "The provider rejected the API key: check the key value, that the API is enabled for its project, and any key restrictions.",
    "provider_rate_limited": "Rate limit reached: wait a minute and retry.",
    "provider_quota_exhausted": "Quota exhausted: check usage/billing limits for the key's project.",
    "provider_bad_request": "The request was rejected: the model id is probably wrong or not available to this key (see the model list above).",
    "provider_timeout": "The provider did not answer in time. The model may be overloaded right now (try again, or set a different model in .env), or raise AI_TIMEOUT_SECONDS.",
    "provider_unavailable": "The provider is unavailable or the model is overloaded ('high demand'): retry later or choose a different model from the list above.",
    "provider_empty_response": "The provider returned no text (safety block or token limit): try again or raise CHAT_MAX_OUTPUT_TOKENS.",
}


def check_ai(_: argparse.Namespace) -> None:
    """One REAL, tiny model call with the configured provider (uses a few tokens of your quota). Prints no keys and no reply text."""
    import asyncio

    settings = get_settings()
    provider, _key, model = settings.require_ai()  # ConfigError names the missing variable
    print(f"Provider: {provider}   Model: {model}")
    service = build_ai_service(settings)
    try:
        if provider == "gemini":
            available = service._get().list_models()
            wanted = model.removeprefix("models/")
            print(f"Model list fetched: {len(available)} text-generation models visible to this key")
            if wanted in available:
                print("Model id found in that list: yes")
            else:
                print("Model id found in that list: NO - pick one of these (first 15):", file=sys.stderr)
                print("  " + ", ".join(available[:15]), file=sys.stderr)
        result = asyncio.run(service.generate(instructions="Reply with one short sentence.", messages=[{"role": "user", "content": "Say hello."}]))
    except AIServiceError as err:
        print(f"Live call: FAILED ({err.code}). {AI_HINTS.get(err.code, 'See the server log.')}", file=sys.stderr)
        raise SystemExit(2) from None
    print(f"Live call: OK  latency={result.latency_ms} ms  tokens in/out={result.input_tokens}/{result.output_tokens}  reply_chars={len(result.text)}")


EXPECTED_TABLES = {"users", "auth_sessions", "branches", "demo_requests", "contact_enquiries", "chat_sessions", "chat_messages", "ai_usage",
                   "enquiry_notes", "site_settings", "content_items", "media_assets", "audit_logs"}


def check_db(_: argparse.Namespace) -> None:
    """Connect for real, then report: target (no password), server, migration revision, tables, row-level security."""
    settings = get_settings()
    print(f"Target: {describe_target(settings.sqlalchemy_url)}")
    try:
        with get_engine().connect() as conn:
            version = conn.execute(text("select version()")).scalar() or ""
            print(f"Connected: yes ({version.split(' on ')[0]})")
            tables = set(inspect(conn).get_table_names())
            missing = sorted(EXPECTED_TABLES - tables)
            revision = conn.execute(text("select version_num from alembic_version")).scalar() if "alembic_version" in tables else None
            print(f"Migration revision: {revision or 'none (run: alembic upgrade head)'}")
            print("Tables: all present" if not missing else f"Tables MISSING: {', '.join(missing)} (run: alembic upgrade head)")
            if tables & EXPECTED_TABLES:
                rows = conn.execute(text("select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'")).all()
                no_rls = sorted(name for name, rls in rows if not rls and name in EXPECTED_TABLES | {"alembic_version"})
                print("Row-level security: enabled on all app tables" if not no_rls else f"Row-level security OFF on: {', '.join(no_rls)} (run: alembic upgrade head)")
    except ConfigError:
        raise
    except Exception as exc:  # noqa: BLE001 - reported as a safe hint, never the raw driver message
        print(f"Connected: NO - {classify_error(exc.orig if getattr(exc, 'orig', None) else exc)}", file=sys.stderr)
        raise SystemExit(2) from None


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    cu = sub.add_parser("create-user", help="create a user (role user or admin)")
    cu.add_argument("--email", required=True)
    cu.add_argument("--name", required=True)
    cu.add_argument("--role", choices=("user", "admin", "super_admin"), default="user")
    cu.add_argument("--permissions", default="", help="for role admin: comma-separated modules (enquiries,demo_requests,content,chatbot,media,settings)")
    cu.set_defaults(func=create_user)
    sp = sub.add_parser("set-password", help="reset a user's password")
    sp.add_argument("--email", required=True)
    sp.set_defaults(func=set_password)
    pa = sub.add_parser("provision-admin", help="create the initial super admin from ADMIN_EMAIL / ADMIN_USERNAME / ADMIN_PASSWORD (never changes an existing account unless asked)")
    pa.add_argument("--reset-password", action="store_true", help="replace the existing super admin's password with ADMIN_PASSWORD")
    pa.add_argument("--promote", action="store_true", help="promote an existing account with the configured email to super admin")
    pa.set_defaults(func=provision_admin)
    pc = sub.add_parser("purge-chats", help="delete expired chat conversations")
    pc.set_defaults(func=purge_chats)
    ps = sub.add_parser("purge-sessions", help="delete expired/revoked login sessions")
    ps.set_defaults(func=purge_sessions)
    ca = sub.add_parser("check-ai", help="one real tiny model call with the configured provider (verifies key + model id)")
    ca.set_defaults(func=check_ai)
    cc = sub.add_parser("check-config", help="list which required settings are set/empty (no values shown)")
    cc.set_defaults(func=check_config)
    cd = sub.add_parser("check-db", help="test the database connection and report schema / row-level security status")
    cd.set_defaults(func=check_db)
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        raise SystemExit(2) from None


if __name__ == "__main__":
    main()
