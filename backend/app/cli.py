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
    python -m app.cli hero-videos-report [--verify] [--json]    (read-only recovery report of homepage videos and their stored files)
    python -m app.cli hero-videos-migrate [--apply]             (copy videos held on the server disk to Supabase Storage; never deletes anything)
    python -m app.cli seed-sample-testimonials [--remove]       (add / remove the six fictional placeholder testimonials; never touches real ones)
    python -m app.cli seed-sample-clients [--remove]            (add / remove the six placeholder "Our Clients" entries; never touches real clients)

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


def _hero_rows(db):
    from app.models import HeroVideo

    return list(db.scalars(select(HeroVideo).order_by(HeroVideo.position, HeroVideo.created_at)))


def hero_videos_report(args: argparse.Namespace) -> None:
    """Recovery report. Read-only unless --verify, which only records each file's check result. Nothing is ever deleted or repaired automatically."""
    import json

    from app.services import hero_video_service as svc

    settings = get_settings()
    out = []
    with _factory()() as db:
        for v in _hero_rows(db):
            if args.verify:
                svc.verify_video(settings, v)
            else:
                status, detail = svc.verify_object(settings, v)
                if detail == "error":
                    detail = "The file on disk has a different size than the upload."
                live = (status, detail)
            status, detail = (v.verify_status, v.verify_detail) if args.verify else live
            out.append({"id": str(v.id), "title": v.title, "original_name": v.original_name, "storage": v.storage, "bucket": v.bucket or (settings.hero_video_bucket if v.storage == "supabase" else None),
                        "object": v.storage_key, "mime": v.content_type, "size_bytes": v.size_bytes, "sha256": v.sha256, "active": v.is_active, "fallback": v.is_fallback,
                        "pending_deletion": v.deleted_at is not None, "position": v.position, "uploaded_at": v.created_at.isoformat(),
                        "available_from": v.available_from.isoformat() if v.available_from else None, "available_until": v.available_until.isoformat() if v.available_until else None,
                        "file_check": status, "detail": detail})
        if args.verify:
            db.commit()
        else:
            db.rollback()
    if args.json:
        print(json.dumps(out, indent=2))
        return
    if not out:
        print("No homepage videos recorded.")
    for r in out:
        flag = {"ok": "OK     ", "missing": "MISSING", "error": "PROBLEM", "unknown": "UNKNOWN"}.get(r["file_check"], r["file_check"])
        print(f"[{flag}] {r['title']}  ({r['storage']}, {r['size_bytes']} bytes, {'active' if r['active'] else 'inactive'}{', PENDING DELETION' if r['pending_deletion'] else ''})")
        print(f"          {r['detail']}")
    bad = [r for r in out if r["file_check"] != "ok"]
    local = [r for r in out if r["storage"] == "local"]
    print(f"\n{len(out)} video(s): {len(out) - len(bad)} verified, {len(bad)} need attention, {len(local)} held only on the server disk (temporary: run hero-videos-migrate while the file is still there).")
    print("No records or files were deleted or changed by this report.")


def hero_videos_migrate(args: argparse.Namespace) -> None:
    """Copy videos that live on the server's own disk into Supabase Storage. The upload is verified before the record is repointed, and the local file is
    left in place. Without --apply it only lists what it would do."""
    from app.services import hero_video_service as svc

    settings = get_settings()
    if settings.video_storage != "supabase":
        raise SystemExit("Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Nothing to migrate to.")
    moved = skipped = 0
    with _factory()() as db:
        for v in _hero_rows(db):
            if v.storage != "local" or v.deleted_at is not None:
                continue
            path = svc.file_path(settings, v.storage_key)
            if not path.is_file():
                print(f"SKIP  {v.title}: the file is no longer on this server's disk (re-upload it from the admin panel).")
                skipped += 1
                continue
            if not args.apply:
                print(f"WOULD COPY  {v.title} ({v.size_bytes} bytes)")
                continue
            digest = svc.file_sha256(path)
            key = f"{__import__('uuid').uuid4().hex}{path.suffix}"
            svc._upload_object(settings, path, key, v.content_type)
            status, detail = svc.verify_remote(settings, key, v.size_bytes)
            if status != "ok":
                svc._delete_object(settings, key)
                print(f"FAIL  {v.title}: {detail} (the record was left unchanged)")
                skipped += 1
                continue
            v.storage, v.storage_key, v.bucket, v.sha256 = "supabase", key, settings.hero_video_bucket, v.sha256 or digest
            v.verify_status, v.verified_at, v.verify_detail = "ok", svc.now_utc(), "Copied to Supabase Storage and verified."
            db.commit()
            print(f"MOVED {v.title}")
            moved += 1
    print(f"Done: {moved} copied, {skipped} skipped. Local files were not deleted.")


SAMPLE_CLIENTS = [  # fictional companies with placeholder artwork shipped in frontend/public/assets/clients/ (flagged is_sample)
    ("sample-aurelia-textiles", "Aurelia Textiles", "/assets/clients/sample-1.svg"),
    ("sample-vertex-logistics", "Vertex Logistics", "/assets/clients/sample-2.svg"),
    ("sample-nimbus-health", "Nimbus Health", "/assets/clients/sample-3.svg"),
    ("sample-harbor-pine-foods", "Harbor & Pine Foods", "/assets/clients/sample-4.svg"),
    ("sample-kestrel-engineering", "Kestrel Engineering", "/assets/clients/sample-5.svg"),
    ("sample-brightwave-retail", "Brightwave Retail", "/assets/clients/sample-6.svg"),
]


def seed_sample_clients(args: argparse.Namespace) -> None:
    """Add (or with --remove, delete) the six placeholder clients. Idempotent; only touches rows whose slug starts with "sample-"."""
    from app.models import ContentItem

    get_settings()
    with _factory()() as db:
        existing = {i.slug: i for i in db.scalars(select(ContentItem).where(ContentItem.kind == "client", ContentItem.slug.like("sample-%")))}
        if args.remove:
            for item in existing.values():
                db.delete(item)
            db.commit()
            print(f"Removed {len(existing)} sample client(s). Real clients were not touched.")
            return
        added = 0
        for n, (slug, name, logo) in enumerate(SAMPLE_CLIENTS, start=1):
            if slug in existing:
                continue
            db.add(ContentItem(kind="client", slug=slug, title=name, data={"logo_url": logo, "is_sample": True}, status="published", sort_order=n * 10))
            added += 1
        db.commit()
        print(f"Added {added} sample client(s) ({len(SAMPLE_CLIENTS) - added} already present). They are placeholders: edit or delete them in the admin panel (Website content > Clients).")


SAMPLE_TESTIMONIALS = [  # fictional people and organisations; every entry is flagged is_sample and shown with a "Sample" label on the website
    ("Meera Nair", "client", "Operations Head", "Aurelia Textiles (sample)",
     "LAX360 took our scattered order and billing sheets and turned them into one simple system. They listened first, suggested only what we needed, and delivered on the date they promised."),
    ("Arvind Kumar", "client", "Customer Support Lead", "Vertex Logistics (sample)",
     "The AI assistant answers our routine delivery questions from approved information and hands over to a person when needed. Our team now spends its time on the cases that really need them."),
    ("Sana Iqbal", "client", "Marketing Manager", "Brightwave Retail (sample)",
     "Their digital marketing plan was clear and honest about what to expect. Reporting was easy to follow, and the website and campaigns finally worked together."),
    ("Rohan Menon", "client", "Project Engineer", "Kestrel Engineering (sample)",
     "We send sketches and markups and get back neat 2D drawings and 3D models. The team is careful with details and quick to clarify anything unclear."),
    ("Karthik R.", "student", "B.E. Computer Science student", "Sample Institute of Technology",
     "The AI tools and prompt engineering workshop was practical from the first hour. We built a small project ourselves instead of only listening to theory."),
    ("Divya S.", "student", "Final-year B.Sc. student", "Sample College of Arts & Science",
     "I joined the Python with AI course with little experience. The trainers explained each step patiently and the hands-on sessions gave me real confidence."),
]


def seed_sample_testimonials(args: argparse.Namespace) -> None:
    """Add (or with --remove, delete) the six fictional placeholder testimonials. Idempotent; only touches rows whose slug starts with "sample-"."""
    from app.models import ContentItem

    get_settings()
    with _factory()() as db:
        existing = {i.slug: i for i in db.scalars(select(ContentItem).where(ContentItem.kind == "testimonial", ContentItem.slug.like("sample-%")))}
        if args.remove:
            for item in existing.values():
                db.delete(item)
            db.commit()
            print(f"Removed {len(existing)} sample testimonial(s). Real testimonials were not touched.")
            return
        added = 0
        for n, (name, kind, role, org, quote) in enumerate(SAMPLE_TESTIMONIALS, start=1):
            slug = f"sample-testimonial-{n}"
            if slug in existing:
                continue
            db.add(ContentItem(kind="testimonial", slug=slug, title=name, data={"person_type": kind, "role": role, "organization": org, "quote": quote, "is_sample": True}, status="published", sort_order=n * 10))
            added += 1
        db.commit()
        print(f"Added {added} sample testimonial(s) ({len(SAMPLE_TESTIMONIALS) - added} already present). They are fictional placeholders: edit or delete them in the admin panel (Website content > Testimonials).")


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
    hr = sub.add_parser("hero-videos-report", help="read-only report of homepage videos and whether each stored file exists")
    hr.add_argument("--verify", action="store_true", help="also record the check result on each video")
    hr.add_argument("--json", action="store_true", help="machine-readable output (also usable as a metadata backup)")
    hr.set_defaults(func=hero_videos_report)
    hm = sub.add_parser("hero-videos-migrate", help="copy videos held on the server disk to Supabase Storage (verified; never deletes)")
    hm.add_argument("--apply", action="store_true", help="actually copy (default is a dry run)")
    hm.set_defaults(func=hero_videos_migrate)
    sc = sub.add_parser("seed-sample-clients", help="add (or --remove) six placeholder 'Our Clients' entries for the home page")
    sc.add_argument("--remove", action="store_true", help="delete the sample clients instead of adding them")
    sc.set_defaults(func=seed_sample_clients)
    st = sub.add_parser("seed-sample-testimonials", help="add (or --remove) six fictional placeholder testimonials for the home page")
    st.add_argument("--remove", action="store_true", help="delete the sample testimonials instead of adding them")
    st.set_defaults(func=seed_sample_testimonials)
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        raise SystemExit(2) from None


if __name__ == "__main__":
    main()
