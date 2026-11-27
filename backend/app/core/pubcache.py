"""A tiny in-process cache for the public, read-only responses (site settings, the content bundle, the homepage video).

Why: the database can be far from the server (a managed Postgres in another region costs ~200 ms per round trip), and every visitor used to trigger the same dozens of
queries. A response is now built once and reused for a few seconds. It is dropped the moment anything it is built from is saved (any commit that touches content, settings,
media, branches or the homepage videos bumps the version), so an administrator's change still shows at once; the short TTL only covers writes made by another process.
Disabled in tests (they reset the database underneath it).
"""

from __future__ import annotations

import gzip
import json
import threading
import time
from typing import Callable

from fastapi import Request
from fastapi.responses import Response
from sqlalchemy import event
from sqlalchemy.orm import Session

TTL_SECONDS = 15.0
STALE_SECONDS = 300.0  # an expired entry is still served (and refreshed in the background) for this long
KEEP_WARM_SECONDS = 12.0  # while the server runs, entries are rebuilt in the background before they go stale, so no visitor waits for the (remote) database
_WATCHED = {"ContentItem", "SiteSetting", "MediaAsset", "Branch", "ContactChannel", "HeroVideo", "HeroVideoConfig", "PartnershipPage", "PartnershipFaq", "PartnershipPolicy", "PartnershipSetting", "PartnershipMenuItem"}
_lock = threading.Lock()
_store: dict[str, tuple[float, int, object]] = {}
_version = 0


def bump() -> None:
    global _version
    with _lock:
        _version += 1
    _rebuild_all_soon()  # an administrator's save: rebuild the public responses right away, before the next visitor asks


def get(key: str, *, max_age: float = TTL_SECONDS):
    """The cached value if it is younger than `max_age` seconds and nothing it is built from was saved since."""
    hit = _store.get(key)
    if hit and hit[1] == _version and time.monotonic() - hit[0] < max_age:
        return hit[2]
    return None


def put(key: str, value: object) -> None:
    _store[key] = (time.monotonic(), _version, value)


_refreshing: set[str] = set()
_builders: dict[str, tuple[Callable[[Session], object], Callable[[], Session]]] = {}  # key -> how to rebuild it (registered by cached_json)
_key_locks: dict[str, threading.Lock] = {}  # one build per key at a time: simultaneous visitors share it instead of each querying the database
_warm_started = False


def _rebuild(key: str) -> None:
    b = _builders.get(key)
    if b is None:
        return
    db = b[1]()
    try:
        with _key_locks.setdefault(key, threading.Lock()):
            put(key, _pack(b[0](db)))
    except Exception:  # noqa: BLE001 - the next request rebuilds it in the foreground
        pass
    finally:
        db.close()


def _rebuild_all_soon() -> None:
    if not _builders:
        return

    def run() -> None:
        time.sleep(0.4)  # the save is committing: let it finish so the rebuild sees it
        for key in list(_builders):
            _rebuild(key)

    threading.Thread(target=run, name="pubcache-rebuild", daemon=True).start()


def _keep_warm() -> None:
    while True:
        time.sleep(KEEP_WARM_SECONDS)
        for key in list(_builders):
            hit = _store.get(key)
            if hit is None or hit[1] != _version or time.monotonic() - hit[0] > TTL_SECONDS * 0.6:
                _rebuild(key)


def _start_warm() -> None:
    global _warm_started
    with _lock:
        if _warm_started:
            return
        _warm_started = True
    threading.Thread(target=_keep_warm, name="pubcache-warm", daemon=True).start()


def _refresh_in_background(key: str, build: Callable[[Session], object], session_factory: Callable[[], Session]) -> None:
    """Rebuild an entry that has just expired WITHOUT making a visitor wait for it (the next visitor gets the fresh one)."""
    with _lock:
        if key in _refreshing:
            return
        _refreshing.add(key)

    def run() -> None:
        db = session_factory()
        try:
            put(key, _pack(build(db)))
        except Exception:  # noqa: BLE001 - a failed refresh just leaves the old entry to expire; the next request rebuilds it in the foreground
            pass
        finally:
            db.close()
            with _lock:
                _refreshing.discard(key)

    threading.Thread(target=run, name=f"pubcache-{key}", daemon=True).start()


@event.listens_for(Session, "after_flush")
def _note_writes(session: Session, _ctx) -> None:
    if any(type(o).__name__ in _WATCHED for o in (*session.new, *session.dirty, *session.deleted)):
        session.info["pubcache_dirty"] = True


@event.listens_for(Session, "after_commit")
def _drop_on_commit(session: Session) -> None:
    if session.info.pop("pubcache_dirty", None):
        bump()


@event.listens_for(Session, "after_rollback")
def _forget_on_rollback(session: Session) -> None:
    session.info.pop("pubcache_dirty", None)


def _pack(payload: object) -> tuple[bytes, bytes | None]:
    body = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")
    return body, (gzip.compress(body, 5) if len(body) > 1024 else None)


def cached_json(request: Request, enabled: bool, key: str, build: Callable[[Session], object], headers: dict[str, str], db: Session,
                session_factory: Callable[[], Session] | None = None) -> Response:
    """JSON response built once per `TTL_SECONDS` (until something is saved), compressed with gzip for clients that accept it (the content bundle is ~100 KB).
    When an entry has just expired (and nothing was saved since) the previous one is still served instantly while a fresh one is built in the background:
    visitors never wait for the database except the very first one after a quiet minute or a save."""
    if enabled and session_factory is not None and key not in _builders:
        _builders[key] = (build, session_factory)
        _start_warm()
    entry = get(key) if enabled else None
    if entry is None and enabled and session_factory is not None:
        stale = get(key, max_age=STALE_SECONDS)
        if stale is not None:
            _refresh_in_background(key, build, session_factory)
            entry = stale
    if entry is None:
        with _key_locks.setdefault(key, threading.Lock()):  # simultaneous visitors wait for ONE build instead of all querying the database
            entry = get(key) if enabled else None
            if entry is None:
                entry = _pack(build(db))
                if enabled:
                    put(key, entry)
    body, packed = entry
    use_gzip = packed is not None and "gzip" in request.headers.get("accept-encoding", "")
    out = {**headers, "Vary": "Accept-Encoding"}
    if use_gzip:
        out["Content-Encoding"] = "gzip"
    return Response(content=packed if use_gzip else body, media_type="application/json", headers=out)
