"""SUPABASE_URL repair, clear storage error messages, retries and the self-healing of a stale 'error' status (no network and no database needed)."""

from __future__ import annotations

import httpx
import pytest

from app.core.config import Settings, normalize_supabase_url
from app.services import hero_video_service as hv


def settings(url: str) -> Settings:
    return Settings(SUPABASE_URL=url, SUPABASE_SERVICE_ROLE_KEY="k" * 20, AUTH_SECRET="x" * 40, _env_file=None)


@pytest.mark.parametrize("raw", [
    "https://abc.supabase.co", "abc.supabase.co", "//abc.supabase.co", "https:/abc.supabase.co", "https//abc.supabase.co", "​https://abc.supabase.co",
    "'https://ABC.supabase.co/storage/v1/'", "  https://abc.supabase.co/rest/v1 ", "SUPABASE_URL=https://abc.supabase.co", "https://abc.supabase.co\n",
])
def test_pasted_supabase_urls_are_rebuilt_to_a_valid_https_address(raw):
    assert normalize_supabase_url(raw) == "https://abc.supabase.co"
    assert hv.url_problem(settings(raw)) is None


def test_self_hosted_http_address_is_kept():
    assert normalize_supabase_url("http://localhost:54321") == "http://localhost:54321"


def _storage(monkeypatch, handler):
    monkeypatch.setattr(hv, "_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(hv.time, "sleep", lambda *_: None)


def test_transient_network_errors_are_retried_and_the_check_then_succeeds(monkeypatch):
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        if calls["n"] <= 2:
            raise httpx.ConnectError("boom")
        return httpx.Response(206, headers={"content-range": "bytes 0-0/1000"}, content=b"x")

    _storage(monkeypatch, handler)
    assert hv.verify_remote(settings("https://abc.supabase.co"), "videos/a.mp4", 1000, "lax360-videos")[0] == "ok"
    assert calls["n"] == 4  # two failures, then the storage check and the public check


def test_unsupported_protocol_is_explained_and_not_retried(monkeypatch):
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        raise httpx.UnsupportedProtocol("Request URL is missing an 'http://' or 'https://' protocol.")

    _storage(monkeypatch, handler)
    status, detail = hv.verify_remote(settings("https://abc.supabase.co"), "videos/a.mp4", 1000, "lax360-videos")
    assert status == "error" and "SUPABASE_URL" in detail and "UnsupportedProtocol" in detail
    assert calls["n"] == 1


def test_a_successful_visitor_playback_clears_a_stale_error(monkeypatch):
    class Video:
        id = "v"; verify_status = "error"; verify_detail = "old"; verified_at = None; last_play_ok_at = None; last_play_error = "x"; last_play_error_at = None

    video = Video()

    class Res:
        current = type("S", (), {"video": video})()
        next = None

    monkeypatch.setattr(hv, "resolve", lambda db, s: Res)
    assert hv.record_playback(None, settings("https://abc.supabase.co"), "v", True, None) is False
    assert video.verify_status == "ok" and video.last_play_error is None
