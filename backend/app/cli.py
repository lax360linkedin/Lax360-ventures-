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
    python -m app.cli storage-selftest                          (real Supabase check for PICTURE uploads: settings, bucket, upload, read-back, public address, delete one temporary image)
    python -m app.cli hero-videos-selftest [--create-bucket]    (real Supabase check: bucket, upload, public read, delete a temporary test video)
    python -m app.cli hero-videos-migrate [--apply]             (copy videos held on the server disk to Supabase Storage; never deletes anything)
    python -m app.cli seed-network [--remove]                   (load the Our Network starter content; designations start unverified; --remove deletes only those)
    python -m app.cli seed-service-demo [--remove]               (load FICTIONAL demo clients and testimonials for every service page; labelled Sample; --remove deletes only those)
    python -m app.cli seed-industries [--remove]               (load the 20-industry content into the CMS so it can be edited; --remove deletes only those)
    python -m app.cli seed-products [--remove]                  (load the LAX360 product portfolio into the CMS, all as Coming soon, so it can be edited; --remove deletes only those)
    python -m app.cli seed-faqs [--remove]                      (load the home page FAQ questions and categories into the CMS so they can be edited; --remove deletes only those)
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


def storage_selftest(args: argparse.Namespace) -> None:
    """Prove that PICTURE uploads (carousel, team and founder photos, testimonials, client logos, welcome cards, every other website image) reach permanent storage with the REAL
    project: settings, bucket, upload, read-back, public address, delete. One tiny temporary image is stored and removed. Secrets are never printed. Exit code 1 on any failure."""
    import os
    import tempfile
    from pathlib import Path

    import httpx

    from app.services import object_storage as store

    settings = get_settings()
    failed: list[str] = []

    def step(name: str, ok: bool, detail: str = "") -> bool:
        print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f": {detail}" if detail else ""))
        if not ok:
            failed.append(name)
        return ok

    print(f"Environment: APP_ENV={settings.app_env}; Render detected: {'yes' if os.environ.get('RENDER') else 'no (local run)'}")
    missing = store.missing_settings(settings)
    step("SUPABASE_URL is set", "SUPABASE_URL" not in missing, "missing" if "SUPABASE_URL" in missing else "")
    step("SUPABASE_SERVICE_ROLE_KEY is set", "SUPABASE_SERVICE_ROLE_KEY" not in missing, "missing" if "SUPABASE_SERVICE_ROLE_KEY" in missing else "")
    info = store.durability(settings)
    step("Pictures would be stored permanently (not on this server's disk)", info["backend"] == "supabase" and info["durable"], info.get("warning") or "")
    print(f"Picture bucket (SUPABASE_MEDIA_BUCKET): {settings.media_bucket}   Video bucket (SUPABASE_VIDEO_BUCKET): {settings.hero_video_bucket}   (they share the credentials only)")
    if info["backend"] != "supabase":
        print("RESULT: not configured: nothing was uploaded.")
        raise SystemExit(1)
    png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc0f01f0005000100a1d1ba7f0000000049454e44ae426082")
    key = store.new_key("selftest", ".png")
    tmp = Path(tempfile.gettempdir()) / key.replace("/", "-")
    tmp.write_bytes(png)
    stored = False
    try:
        try:
            store.put(settings, settings.media_bucket, tmp, key, "image/png", "supabase")
            stored = True
            step("Upload a test picture (the bucket is created public if it does not exist)", True, f"{len(png)} bytes")
        except Exception as exc:  # noqa: BLE001 - report, never a traceback that could carry secrets
            step("Upload a test picture", False, getattr(exc, "message", None) or type(exc).__name__)
            raise SystemExit(1) from None
        step("The backend can read it back from storage", store.exists(settings, settings.media_bucket, key, "supabase"))
        pub = httpx.get(store.public_url(settings, settings.media_bucket, key), timeout=20)
        step("Visitors can fetch it from the public address", pub.status_code == 200 and pub.content[:4] == b"\x89PNG", f"HTTP {pub.status_code}")
        step("Delete the test picture", store.delete(settings, settings.media_bucket, key, "supabase"))
        stored = False
        step("It is gone after deletion", not store.exists(settings, settings.media_bucket, key, "supabase"))
    finally:
        tmp.unlink(missing_ok=True)
        if stored:
            store.delete(settings, settings.media_bucket, key, "supabase")
    print("RESULT: " + ("ALL CHECKS PASSED: pictures are stored permanently in Supabase Storage." if not failed else f"{len(failed)} check(s) failed."))
    if failed:
        raise SystemExit(1)


def hero_videos_selftest(args: argparse.Namespace) -> None:
    """Prove the Supabase video storage works with the REAL project: configuration, bucket, upload, public read, delete. Uses one tiny temporary object
    (selftest-<random>.mp4) that is removed again. Secrets are never printed. Exit code 1 when anything fails."""
    import os
    import uuid
    from pathlib import Path
    import tempfile

    import httpx

    from app.services import hero_video_service as svc

    settings = get_settings()
    key_set = bool(settings.supabase_service_role_key)
    url_ok = (settings.supabase_url or "").startswith("https://")
    results: list[tuple[str, bool, str]] = []

    def step(name: str, ok: bool, detail: str = "") -> bool:
        results.append((name, ok, detail))
        print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f": {detail}" if detail else ""))
        return ok

    print(f"Render environment detected: {'yes' if os.environ.get('RENDER') else 'no (local run)'}")
    step("SUPABASE_URL is set (https://<project-ref>.supabase.co)", url_ok, "" if url_ok else "missing, or not an https address")
    step("SUPABASE_SERVICE_ROLE_KEY is set", key_set, "" if key_set else "missing")
    print(f"Bucket name in use (SUPABASE_VIDEO_BUCKET): {settings.hero_video_bucket}")
    if not (url_ok and key_set):
        print("Supabase is not configured in this environment's .env / environment variables, so videos would go to the server disk. Nothing was tested.")
        raise SystemExit(1)
    health = svc._probe_storage(settings)
    if health["status"] == "bucket_missing" and args.create_bucket:
        with svc._client() as http:
            r = http.post(f"{svc._storage_base(settings)}/bucket", json={"id": settings.hero_video_bucket, "name": settings.hero_video_bucket, "public": True,
                                                                         "file_size_limit": settings.hero_video_max_bytes,
                                                                         "allowed_mime_types": ["video/mp4", "video/webm", "image/jpeg", "image/png", "image/webp"]}, headers=svc._storage_headers(settings, "application/json"))
        print(f"Bucket creation requested: HTTP {r.status_code}")
        health = svc._probe_storage(settings)
    if not step("Bucket exists, the key is accepted and the bucket is public", health["status"] == "ok", health["detail"]):
        raise SystemExit(1)
    key = f"selftest-{uuid.uuid4().hex}.mp4"
    payload = bytes([0, 0, 0, 24]) + b"ftypmp42" + bytes(4) + b"mp42isom" + b"LAX360 storage self-test " * 40
    tmp = Path(tempfile.gettempdir()) / key
    tmp.write_bytes(payload)
    try:
        try:
            svc._upload_object(settings, tmp, key, "video/mp4")
            step("Upload a test video through the backend", True, f"{len(payload)} bytes")
        except Exception as exc:  # noqa: BLE001 - report any failure, never a traceback with secrets
            step("Upload a test video through the backend", False, getattr(exc, "message", None) or type(exc).__name__)
            raise SystemExit(1) from None
        status, detail = svc.verify_remote(settings, key, len(payload))
        step("Backend can read it back and it is publicly playable (size matches)", status == "ok", detail)
        with svc._client() as http:
            pub = http.get(svc.public_url(settings, key), headers={"Range": "bytes=0-31"})
        step("Anyone can fetch it from the public address (what visitors use)", pub.status_code in (200, 206) and pub.content[4:8] == b"ftyp", f"HTTP {pub.status_code}")
        step("Delete the test video", svc._delete_object(settings, key))
        gone, _ = svc.verify_remote(settings, key, None)
        step("It is gone after deletion", gone == "missing")
    finally:
        tmp.unlink(missing_ok=True)
        if not any(n.startswith("Delete") and ok for n, ok, _ in results):
            svc._delete_object(settings, key)
    with _factory()() as db:
        videos = [v for v in _hero_rows(db) if v.deleted_at is None]
        local = [(v.title, svc.is_available(settings, v)) for v in videos if v.storage == "local"]
        db.rollback()
    print(f"Homepage videos recorded: {len(videos)}; stored in Supabase: {len(videos) - len(local)}; only on the server disk (must be uploaded again): {len(local)}")
    for title, on_disk in local:
        print(f"  - {title}: {'file still on this disk (run hero-videos-migrate --apply here, or use Replace file in the admin)' if on_disk else 'file already lost: use Replace file in the admin and choose the video again'}")
    failed = [n for n, ok, _ in results if not ok]
    print("RESULT: " + ("ALL CHECKS PASSED: Supabase video storage works with this project." if not failed else f"{len(failed)} check(s) failed."))
    if failed:
        raise SystemExit(1)


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


def seed_faqs(args: argparse.Namespace) -> None:
    """Load the home page FAQ (frontend/src/data/faqs.json) into the CMS as categories and questions, so administrators can edit, reorder and unpublish them.
    Idempotent: rows are identified by slug (category slugs as written; questions "seed-faq-NN"). --remove deletes only those rows."""
    import json
    from pathlib import Path

    from app.models import ContentItem

    src = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "faqs.json"
    data = json.loads(src.read_text(encoding="utf8"))
    get_settings()
    with _factory()() as db:
        cat_slugs = {c["slug"] for c in data["categories"]}
        q_slugs = {f"seed-faq-{n:02d}" for n in range(1, len(data["items"]) + 1)}
        existing = {(i.kind, i.slug): i for i in db.scalars(select(ContentItem).where(ContentItem.kind.in_(["faq_category", "faq"])))}
        if args.remove:
            gone = [i for (kind, slug), i in existing.items() if (kind == "faq_category" and slug in cat_slugs) or (kind == "faq" and slug in q_slugs)]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} seeded FAQ row(s). Questions you added yourself were not touched.")
            return
        added = 0
        for n, cat in enumerate(data["categories"], start=1):
            if ("faq_category", cat["slug"]) not in existing:
                db.add(ContentItem(kind="faq_category", slug=cat["slug"], title=cat["title"], data={"description": cat.get("description", "")}, status="published", sort_order=n * 10))
                added += 1
        for n, item in enumerate(data["items"], start=1):
            slug = f"seed-faq-{n:02d}"
            if ("faq", slug) not in existing:
                db.add(ContentItem(kind="faq", slug=slug, title=item["q"], data={"group": "home_only", "category": item["category"], "answer": item["a"]}, status="published", sort_order=n * 10))
                added += 1
        db.commit()
        print(f"Added {added} FAQ row(s) ({len(data['categories']) + len(data['items']) - added} already present). Edit them in the admin panel (Website content > FAQ entries / FAQ categories).")


def seed_products(args: argparse.Namespace) -> None:
    """Load the built-in LAX360 product portfolio (frontend/src/data/products.json) into the CMS so administrators can edit, reorder, publish and delete it.
    Every product starts as "Coming soon" (change the status in the admin panel as each one is actually built and released). Idempotent: rows are
    identified by slug and existing rows are never overwritten. --remove deletes only the seeded rows that still have their original slug."""
    import json
    from pathlib import Path

    from app.models import ContentItem

    src = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "products.json"
    products = json.loads(src.read_text(encoding="utf8"))
    get_settings()
    join = lambda items: chr(10).join(items)
    with _factory()() as db:
        existing = {i.slug: i for i in db.scalars(select(ContentItem).where(ContentItem.kind == "product"))}
        if args.remove:
            gone = [existing[p["slug"]] for p in products if p["slug"] in existing]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} seeded product(s). Products you added yourself were not touched.")
            return
        added = 0
        for n, p in enumerate(products, start=1):
            if p["slug"] in existing:
                continue
            data = {
                "category": p["category"], "status": p["status"], "summary": p["summary"], "overview": (chr(10) * 2).join(p["overview"]),
                "problems": join(p["problems"]), "features": join(p["features"]), "benefits": join(p["benefits"]), "use_cases": join(p["useCases"]),
                "users": join(p["users"]), "industries": join(p["industries"]), "cta_label": "Enquire about this product",
            }
            db.add(ContentItem(kind="product", slug=p["slug"], title=p["name"], data=data, status="published", sort_order=n * 10))
            added += 1
        db.commit()
        print(f"Added {added} product(s) ({len(products) - added} already present). Edit them in the admin panel (Website content > Products): set each product's status, add logos and screenshots.")


def seed_industries(args: argparse.Namespace) -> None:
    """Load the 20-industry platform content (frontend/src/data/industries.json) into the CMS so administrators can edit, reorder, feature, unpublish and
    delete it. Idempotent: rows are identified by slug and existing rows are never overwritten. --remove deletes only the seeded rows (by slug)."""
    import json
    from pathlib import Path

    from app.models import ContentItem

    src = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "industries.json"
    industries = json.loads(src.read_text(encoding="utf8"))
    get_settings()
    nl = chr(10)
    with _factory()() as db:
        existing = {i.slug: i for i in db.scalars(select(ContentItem).where(ContentItem.kind == "industry"))}
        if args.remove:
            gone = [existing[p["slug"]] for p in industries if p["slug"] in existing]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} seeded industr(ies). Industries you added yourself were not touched.")
            return
        added = 0
        for n, p in enumerate(industries, start=1):
            if p["slug"] in existing:
                continue
            data = {
                "group": p["group"], "featured": bool(p.get("featured")), "summary": p["summary"], "description": p["overview"], "challenges": nl.join(p["challenges"]),
                "problem_solution": nl.join(f"{a} => {b}" for a, b in p["pairs"]), "solutions": nl.join(p["solutions"]), "ai_opportunities": nl.join(f"{a}: {b}" for a, b in p["ai"]),
                "use_cases": nl.join(p["useCases"]), "benefits": nl.join(p["benefits"]), "services": nl.join(p["services"]), "products": nl.join(p["products"]),
                "insight_categories": nl.join(p["insightCategories"]),
            }
            db.add(ContentItem(kind="industry", slug=p["slug"], title=p["name"], data=data, status="published", sort_order=n * 10))
            added += 1
        db.commit()
        print(f"Added {added} industr(ies) ({len(industries) - added} already present). Edit them in the admin panel (Website content > Industries): add card and hero images, adjust text.")


def seed_network(args: argparse.Namespace) -> None:
    """Load the Our Network starter content (frontend/src/data/network.json) into the CMS: CADPOINT Academy, Fatcat Wealthy, Zoho, OpenAI, Marg ERP and HexBis
    (with their software products). Partnership designations start as "pending verification" and are not shown publicly until an administrator verifies them. Idempotent by slug; existing rows are
    never overwritten. --remove deletes only the seeded rows."""
    import json
    from pathlib import Path

    from app.models import ContentItem

    src = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "network.json"
    data = json.loads(src.read_text(encoding="utf8"))
    get_settings()
    nl = chr(10)
    with _factory()() as db:
        existing = {(i.kind, i.slug): i for i in db.scalars(select(ContentItem).where(ContentItem.kind.in_(["network_partner", "software_product"])))}
        if args.remove:
            gone = [existing[k] for k in [("network_partner", c["slug"]) for c in data["companies"]] + [("software_product", p["slug"]) for p in data["software"]] if k in existing]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} seeded network row(s). Entries you added yourself were not touched.")
            return
        added = 0
        for n, c in enumerate(data["companies"], start=1):
            if ("network_partner", c["slug"]) in existing:
                continue
            body = {k: v for k, v in c.items() if k not in ("slug", "name", "status", "products", "featured")}
            body["products"] = nl.join(c["products"])
            body["featured"] = bool(c.get("featured"))
            db.add(ContentItem(kind="network_partner", slug=c["slug"], title=c["name"], data={k: v for k, v in body.items() if v not in ("", None)}, status=c["status"], sort_order=n * 10))
            added += 1
        for n, p in enumerate(data["software"], start=1):
            if ("software_product", p["slug"]) in existing:
                continue
            body = {k: v for k, v in p.items() if k not in ("slug", "name", "status") and v}
            db.add(ContentItem(kind="software_product", slug=p["slug"], title=p["name"], data=body, status=p["status"], sort_order=n * 10))
            added += 1
        db.commit()
        print(f"Added {added} network row(s). Review them in the admin panel (Website content > Network): verify each partner's designation, add official logos you are permitted to use, and adjust the text.")


def seed_service_demo(args: argparse.Namespace) -> None:
    """Load FICTIONAL demonstration clients and testimonials assigned to the individual service pages (flagged "sample", placeholder logos, no photos).
    The home page's own rows are never touched. Idempotent by slug; existing rows are not overwritten. --remove deletes only the rows this command added."""
    from app import seed_service_demo as data
    from app.models import ContentItem

    get_settings()
    with _factory()() as db:
        existing = {(i.kind, i.slug): i for i in db.scalars(select(ContentItem).where(ContentItem.kind.in_(["client", "testimonial"]), ContentItem.slug.like(data.PREFIX + "%")))}
        if args.remove:
            for item in existing.values():
                db.delete(item)
            db.commit()
            print(f"Removed {len(existing)} service-page demonstration row(s). Home page rows and real entries were not touched.")
            return
        added = 0
        for kind, rows in (("client", data.client_rows()), ("testimonial", data.testimonial_rows())):
            for r in rows:
                if (kind, r["slug"]) in existing:
                    continue
                db.add(ContentItem(kind=kind, slug=r["slug"], title=r["title"], data=r["data"], status="published", sort_order=r["sort_order"]))
                added += 1
        db.commit()
        print(f"Added {added} row(s). These are FICTIONAL demonstration clients and testimonials for the service pages (labelled 'Sample'). Replace or delete them in the admin panel (Website content > Clients / Testimonials).")


def seed_websites(args: argparse.Namespace) -> None:
    """Load the website portfolio ("Explore Our Websites": 21 entries from app/seed_websites.py) into the CMS so it can be managed in the admin panel.
    Idempotent by slug; existing entries are never overwritten. --remove deletes only the entries this command added."""
    from app import seed_websites as data
    from app.models import ContentItem

    get_settings()
    rows = data.rows()
    with _factory()() as db:
        existing = {i.slug: i for i in db.scalars(select(ContentItem).where(ContentItem.kind == "website"))}
        if args.remove:
            gone = [existing[r["slug"]] for r in rows if r["slug"] in existing]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} website portfolio entr{'y' if len(gone) == 1 else 'ies'}. Entries you added yourself were not touched.")
            return
        added = 0
        for r in rows:
            if r["slug"] in existing:
                continue
            db.add(ContentItem(kind="website", slug=r["slug"], title=r["title"], data=r["data"], status="published", sort_order=r["sort_order"]))
            added += 1
        db.commit()
        print(f"Added {added} website entr{'y' if added == 1 else 'ies'} ({len(rows) - added} already present). Review them in the admin panel (Website portfolio): add the live address for the entries that have none yet.")


def seed_welcome(args: argparse.Namespace) -> None:
    """Load the 7-card Welcome Experience (settings + cards from app/seed_welcome.py) into the CMS so it is managed in the admin panel.
    Idempotent by slug; existing items are never overwritten. --remove deletes only the items this command added."""
    from app import seed_welcome as data
    from app.models import ContentItem

    get_settings()
    wanted = [("welcome_page", data.SETTINGS["slug"], data.SETTINGS["title"], data.SETTINGS["data"], 0)] + [("welcome_card", r["slug"], r["title"], r["data"], r["sort_order"]) for r in data.card_rows()]
    with _factory()() as db:
        existing = {(i.kind, i.slug): i for i in db.scalars(select(ContentItem).where(ContentItem.kind.in_(("welcome_page", "welcome_card"))))}
        if args.remove:
            gone = [existing[(k, s)] for k, s, *_ in wanted if (k, s) in existing]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} welcome experience item(s). Cards you added yourself were not touched.")
            return
        added = 0
        for kind, slug, title, payload, order in wanted:
            if (kind, slug) in existing:
                continue
            db.add(ContentItem(kind=kind, slug=slug, title=title, data=payload, status="published", sort_order=order))
            added += 1
        db.commit()
        print(f"Added {added} welcome experience item(s) ({len(wanted) - added} already present). Manage them in the admin panel (Welcome Experience).")


def seed_carousel(args: argparse.Namespace) -> None:
    """Load the image carousel settings and its temporary sample pictures (app/seed_carousel.py) so the section can be previewed. Idempotent by slug; nothing is overwritten.
    --remove deletes the sample pictures (and the settings only if you never changed them). Pictures you uploaded yourself are never touched."""
    from app import seed_carousel as data
    from app.models import ContentItem

    get_settings()
    wanted = [("carousel_page", data.SETTINGS["slug"], data.SETTINGS["title"], data.SETTINGS["data"], 0)] + [("carousel_image", r["slug"], r["title"], r["data"], r["sort_order"]) for r in data.image_rows()]
    with _factory()() as db:
        existing = {(i.kind, i.slug): i for i in db.scalars(select(ContentItem).where(ContentItem.kind.in_(("carousel_page", "carousel_image"))))}
        if args.remove:
            gone = [existing[(k, s)] for k, s, *_ in wanted if k == "carousel_image" and (k, s) in existing and (existing[(k, s)].data or {}).get("sample")]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} sample picture(s). Pictures you added yourself were not touched.")
            return
        added = 0
        for kind, slug, title, payload, order in wanted:
            if (kind, slug) in existing:
                continue
            db.add(ContentItem(kind=kind, slug=slug, title=title, data=payload, status="published", sort_order=order))
            added += 1
        db.commit()
        print(f"Added {added} image carousel item(s) ({len(wanted) - added} already present). Manage them in the admin panel (Image carousel).")


def seed_team_samples(args: argparse.Namespace) -> None:
    """Load TEMPORARY sample team profiles (one founder, five employees; fictional, labelled "Sample profile") so the Our Team page can be previewed. Idempotent by slug.
    --remove deletes the profiles marked as samples; real profiles are never touched."""
    from app import seed_team_samples as data
    from app.models import ContentItem

    get_settings()
    with _factory()() as db:
        existing = {i.slug: i for i in db.scalars(select(ContentItem).where(ContentItem.kind == "team_member"))}
        if args.remove:
            gone = [i for i in existing.values() if (i.data or {}).get("sample")]
            for item in gone:
                db.delete(item)
            db.commit()
            print(f"Removed {len(gone)} sample team profile(s). Profiles you added yourself were not touched.")
            return
        added = 0
        for r in data.rows():
            if r["slug"] in existing:
                continue
            db.add(ContentItem(kind="team_member", slug=r["slug"], title=r["title"], data=r["data"], status="published", sort_order=r["sort_order"]))
            added += 1
        db.commit()
        print(f"Added {added} sample team profile(s) ({len(data.PEOPLE) - added} already present). They are fictional: replace them in the admin panel (Team) and remove the samples.")


def purge_enquiries(args: argparse.Namespace) -> None:
    """Data retention: delete enquiries (with their notes, follow-ups and attached documents) that are older than --days AND finished
    (converted, not interested or closed), or archived. Active leads are never touched. --dry-run only counts."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import or_

    from app.models import ContactEnquiry
    from app.services import enquiry_admin_service as svc

    if args.days < 30:
        raise SystemExit("Refusing to purge enquiries newer than 30 days.")
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
    get_settings()
    with _factory()() as db:
        rows = list(db.scalars(select(ContactEnquiry).where(ContactEnquiry.created_at < cutoff, or_(ContactEnquiry.status.in_(("converted", "not_interested", "closed")), ContactEnquiry.archived_at.is_not(None)))))
        if args.dry_run:
            print(f"{len(rows)} finished or archived enquiry(ies) older than {args.days} days would be deleted. Nothing was changed.")
            return
        for r in rows:
            svc.delete_attachments(db, r)
            db.delete(r)
        db.commit()
        print(f"Deleted {len(rows)} enquiry(ies) older than {args.days} days, with their notes, follow-ups and attached documents.")


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
    sst = sub.add_parser("storage-selftest", help="test the real permanent PICTURE storage: settings, bucket, upload, read-back, public address, delete (one temporary image; secrets never printed)")
    sst.set_defaults(func=storage_selftest)
    hst = sub.add_parser("hero-videos-selftest", help="test the real Supabase video storage: config, bucket, upload, public read, delete (one temporary object; secrets never printed)")
    hst.add_argument("--create-bucket", action="store_true", help="create the public bucket if it does not exist")
    hst.set_defaults(func=hero_videos_selftest)
    sprod = sub.add_parser("seed-products", help="load the LAX360 product portfolio into the CMS (all as Coming soon), or --remove those rows")
    sprod.add_argument("--remove", action="store_true")
    sprod.set_defaults(func=seed_products)
    sind = sub.add_parser("seed-industries", help="load the 20-industry content into the CMS, or --remove those rows")
    sind.add_argument("--remove", action="store_true")
    sind.set_defaults(func=seed_industries)
    snet = sub.add_parser("seed-network", help="load the Our Network starter companies (CADPOINT, Fatcat Wealthy, Zoho, OpenAI, Marg ERP, HexBis; designations pending verification), or --remove them")
    snet.add_argument("--remove", action="store_true")
    snet.set_defaults(func=seed_network)
    ssd = sub.add_parser("seed-service-demo", help="load FICTIONAL demonstration clients and testimonials for every individual service page (labelled 'Sample'), or --remove them")
    ssd.add_argument("--remove", action="store_true")
    ssd.set_defaults(func=seed_service_demo)
    sw = sub.add_parser("seed-websites", help="load the website portfolio (Explore Our Websites: 21 entries) into the CMS, or --remove them")
    sw.add_argument("--remove", action="store_true")
    sw.set_defaults(func=seed_websites)
    sw2 = sub.add_parser("seed-welcome", help="load the 7-card Welcome Experience (settings + cards) into the CMS, or --remove them")
    sw2.add_argument("--remove", action="store_true")
    sw2.set_defaults(func=seed_welcome)
    sca = sub.add_parser("seed-carousel", help="load the image carousel settings and its temporary sample pictures, or --remove the samples")
    sca.add_argument("--remove", action="store_true")
    sca.set_defaults(func=seed_carousel)
    sts = sub.add_parser("seed-team-samples", help="load temporary FICTIONAL sample team profiles (a founder and five employees, labelled Sample profile), or --remove them")
    sts.add_argument("--remove", action="store_true")
    sts.set_defaults(func=seed_team_samples)
    pe = sub.add_parser("purge-enquiries", help="data retention: delete finished (converted / not interested / closed) or archived enquiries older than --days, with their documents")
    pe.add_argument("--days", type=int, required=True, help="minimum age in days (at least 30)")
    pe.add_argument("--dry-run", action="store_true", help="only count what would be deleted")
    pe.set_defaults(func=purge_enquiries)
    sc = sub.add_parser("seed-sample-clients", help="add (or --remove) six placeholder 'Our Clients' entries for the home page")
    sc.add_argument("--remove", action="store_true", help="delete the sample clients instead of adding them")
    sc.set_defaults(func=seed_sample_clients)
    st = sub.add_parser("seed-sample-testimonials", help="add (or --remove) six fictional placeholder testimonials for the home page")
    st.add_argument("--remove", action="store_true", help="delete the sample testimonials instead of adding them")
    st.set_defaults(func=seed_sample_testimonials)
    sf = sub.add_parser("seed-faqs", help="load the home page FAQ categories and questions into the CMS (or --remove them)")
    sf.add_argument("--remove", action="store_true", help="delete the seeded FAQ rows instead of adding them")
    sf.set_defaults(func=seed_faqs)
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        raise SystemExit(2) from None


if __name__ == "__main__":
    main()
