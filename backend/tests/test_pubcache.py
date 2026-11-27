"""The public response cache: one build for simultaneous visitors, and a rebuild right after a save (so nobody waits for the database)."""

import json
import threading
import time
from types import SimpleNamespace

from app.core import pubcache


class FakeDb:
    def close(self):
        pass


def request():
    return SimpleNamespace(headers={})


def test_simultaneous_visitors_share_one_build():
    pubcache._store.clear(); pubcache._builders.clear()
    calls = []

    def build(db):
        calls.append(1)
        time.sleep(0.3)
        return {"n": len(calls)}

    out = []
    threads = [threading.Thread(target=lambda: out.append(pubcache.cached_json(request(), True, "t-single", build, {}, FakeDb(), FakeDb).body)) for _ in range(6)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert len(calls) == 1 and len({bytes(b) for b in out}) == 1  # six visitors, one database build, identical answers


def test_a_save_rebuilds_the_response_in_the_background():
    pubcache._store.clear(); pubcache._builders.clear()
    state = {"v": 1}
    build = lambda db: {"v": state["v"]}  # noqa: E731
    assert json.loads(pubcache.cached_json(request(), True, "t-bump", build, {}, FakeDb(), FakeDb).body) == {"v": 1}
    state["v"] = 2
    pubcache.bump()  # what a commit of content does
    time.sleep(1.0)
    hit = pubcache.get("t-bump")  # already rebuilt: the next visitor is served from memory
    assert hit is not None and json.loads(hit[0]) == {"v": 2}
