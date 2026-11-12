"""The public response cache: built once, compressed, dropped the moment anything is saved, and served stale (then refreshed) instead of making a visitor wait."""

import gzip
import json
import time

from app.core import pubcache
from tests.admin_helpers import staff


class FakeRequest:
    def __init__(self, accept="gzip"):
        self.headers = {"accept-encoding": accept}


class FakeSession:
    closed = False

    def close(self):
        self.closed = True


def counter(payload):
    calls = []

    def build(db):
        calls.append(db)
        return payload

    return build, calls


def test_built_once_then_served_from_the_cache():
    pubcache._store.clear()
    build, calls = counter({"a": 1})
    for _ in range(3):
        r = pubcache.cached_json(FakeRequest(), True, "t1", build, {"Cache-Control": "x"}, FakeSession())
    assert len(calls) == 1 and json.loads(r.body) == {"a": 1}
    pubcache.cached_json(FakeRequest(), False, "t1", build, {}, FakeSession())  # disabled (tests): always builds
    assert len(calls) == 2


def test_large_bodies_are_gzipped_only_for_clients_that_accept_it():
    pubcache._store.clear()
    big = {"items": ["lorem ipsum " * 20] * 50}
    build, _ = counter(big)
    packed = pubcache.cached_json(FakeRequest("gzip, br"), True, "t2", build, {}, FakeSession())
    plain = pubcache.cached_json(FakeRequest(""), True, "t2", build, {}, FakeSession())
    assert packed.headers["content-encoding"] == "gzip" and json.loads(gzip.decompress(packed.body)) == big and len(packed.body) < len(plain.body) / 3
    assert "content-encoding" not in plain.headers and json.loads(plain.body) == big and packed.headers["vary"] == "Accept-Encoding"


def test_bump_drops_every_entry():
    pubcache._store.clear()
    build, calls = counter({"v": 1})
    pubcache.cached_json(FakeRequest(), True, "t3", build, {}, FakeSession())
    pubcache.bump()
    pubcache.cached_json(FakeRequest(), True, "t3", build, {}, FakeSession())
    assert len(calls) == 2


def test_an_expired_entry_is_served_at_once_and_refreshed_in_the_background(monkeypatch):
    pubcache._store.clear()
    state = {"n": 0}

    def build(db):
        state["n"] += 1
        return {"n": state["n"]}

    sessions = []

    def factory():
        s = FakeSession()
        sessions.append(s)
        return s

    first = pubcache.cached_json(FakeRequest(""), True, "t4", build, {}, FakeSession(), factory)
    assert json.loads(first.body) == {"n": 1}
    body, packed = pubcache._store["t4"][2]
    pubcache._store["t4"] = (time.monotonic() - pubcache.TTL_SECONDS - 1, pubcache._version, (body, packed))  # just expired
    stale = pubcache.cached_json(FakeRequest(""), True, "t4", build, {}, FakeSession(), factory)
    assert json.loads(stale.body) == {"n": 1}  # no waiting: the previous answer
    for _ in range(100):
        if state["n"] == 2 and not pubcache._refreshing:
            break
        time.sleep(0.02)
    assert state["n"] == 2 and sessions and sessions[0].closed
    assert json.loads(pubcache.cached_json(FakeRequest(""), True, "t4", build, {}, FakeSession(), factory).body) == {"n": 2}  # the refreshed one
    pubcache._store["t4"] = (time.monotonic() - pubcache.STALE_SECONDS - 1, pubcache._version, pubcache._store["t4"][2])  # too old to serve
    old = pubcache.cached_json(FakeRequest(""), True, "t4", build, {}, FakeSession(), factory)
    assert json.loads(old.body) == {"n": 3}  # rebuilt in the foreground


def test_saving_content_drops_the_cache(app, db):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    before = pubcache._version
    r = admin.post("/api/admin/content/welcome_card", json={"title": "Cache probe", "data": {"theme": "ai", "headline": "H", "description": "D"}, "status": "published", "sort_order": 1}, headers=csrf)
    assert r.status_code == 201, r.text
    assert pubcache._version > before  # the commit bumped the version: nothing cached before it can be served now
    mid = pubcache._version
    admin.get("/api/admin/content/welcome_card")  # a read never drops it
    assert pubcache._version == mid
