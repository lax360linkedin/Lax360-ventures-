import openai
import pytest
from sqlalchemy import select

from app.models import AuditLog, MediaAsset
from tests.admin_helpers import PNG, staff
from tests.conftest import fake_response

KEY = "sk-test-fake-0000000000000000"


# ---- chatbot management ------------------------------------------------------------------------------
def say(client, message="What do you do?", **extra):
    return client.post("/api/chat", json={"message": message, **extra})


def test_disabling_the_chatbot_stops_chat_and_is_visible_to_the_website(app, db, client, ai):
    admin, csrf, _ = staff(app, db, permissions=["chatbot"])
    assert say(client).status_code == 200
    admin.put("/api/admin/chatbot/settings", json={"values": {"chatbot_enabled": False}}, headers=csrf)
    r = say(client)
    assert r.status_code == 503 and r.json()["error"]["code"] == "chat_disabled"
    assert len(ai.responses.calls) == 1  # the provider was not called while disabled
    assert client.get("/api/public/site").json()["settings"]["chatbot_enabled"] is False
    admin.put("/api/admin/chatbot/settings", json={"values": {"chatbot_enabled": True}}, headers=csrf)
    assert say(client).status_code == 200


def test_admin_written_business_information_reaches_the_assistant_prompt(app, db, client, ai):
    admin, csrf, _ = staff(app, db, permissions=["chatbot"])
    admin.put("/api/admin/chatbot/settings", json={"values": {"chatbot_instructions": "Our Salem office is closed on Sundays."}}, headers=csrf)
    say(client)
    prompt = ai.responses.calls[0]["instructions"]
    assert "Our Salem office is closed on Sundays." in prompt and "ADDITIONAL BUSINESS INFORMATION" in prompt
    assert "LAX360 Ventures AI Assistant" in prompt  # the built-in safety rules are still there


def test_custom_fallback_message_replaces_the_default_when_the_provider_fails(app, db, client, ai):
    admin, csrf, _ = staff(app, db, permissions=["chatbot"])
    admin.put("/api/admin/chatbot/settings", json={"values": {"chatbot_fallback": "We are busy: please WhatsApp us."}}, headers=csrf)
    ai.responses.behaviour = openai.APIConnectionError(request=__import__("httpx").Request("POST", "https://x"))
    r = say(client)
    assert r.status_code == 503 and r.json()["error"]["message"] == "We are busy: please WhatsApp us."


def test_conversation_history_search_filters_and_viewing_is_audited(app, db, client, ai):
    first = say(client, "I need a CRM for my pharmacy chain").json()
    say(client, "What are your training courses?")
    admin, csrf, _ = staff(app, db, permissions=["chatbot"])
    data = admin.get("/api/admin/chatbot/conversations").json()
    assert data["total"] == 2 and {"preview", "messages", "visitor", "failed"} <= set(data["items"][0])
    assert [c["preview"] for c in admin.get("/api/admin/chatbot/conversations?q=pharmacy").json()["items"]] == ["I need a CRM for my pharmacy chain"]
    assert admin.get("/api/admin/chatbot/conversations?q=zzzz-nothing").json()["total"] == 0
    detail = admin.get(f"/api/admin/chatbot/conversations/{first['conversation_id']}").json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant"] and "pharmacy" in detail["messages"][0]["content"]
    assert db.scalar(select(AuditLog.id).where(AuditLog.action == "chatbot.view_conversation")) is not None  # visitor messages are personal data
    assert admin.get("/api/admin/chatbot/conversations/00000000-0000-0000-0000-000000000000").status_code == 404


def test_failed_requests_are_reviewable_without_secrets(app, db, client, ai):
    ai.responses.behaviour = openai.AuthenticationError(f"Incorrect API key provided: {KEY}", response=__import__("httpx").Response(401, request=__import__("httpx").Request("POST", "https://x")), body=None)
    say(client, "hello there")
    ai.responses.behaviour = fake_response("Hi!")
    say(client, "hello again")
    admin, csrf, _ = staff(app, db, permissions=["chatbot"])
    usage = admin.get("/api/admin/chatbot/usage?days=7").json()
    assert usage["requests"] == 2 and usage["ok"] == 1 and usage["errors"] == 1
    assert [f["status"] for f in usage["failures"]] == ["provider_auth"]
    assert admin.get("/api/admin/chatbot/conversations?status=failed").json()["total"] == 1
    everything = str(usage) + admin.get("/api/admin/chatbot/settings").text + admin.get("/api/admin/chatbot/conversations").text
    assert KEY not in everything and "api_key" not in everything.lower().replace("_api_key", "")


def test_provider_panel_shows_status_but_never_keys(app, db, ai):
    admin, _, _ = staff(app, db, permissions=["chatbot"])
    body = admin.get("/api/admin/chatbot/settings").json()
    p = body["provider"]
    assert p["active"] == "openai" and p["configured"] is True and p["available"] == {"gemini": False, "openai": True}
    assert KEY not in str(body) and "set in the server environment" in p["note"]


# ---- system status -----------------------------------------------------------------------------------
def test_system_status_only_says_connected_after_a_real_check(app, db, client, env, monkeypatch):
    from app.providers.base import AIProvider, AIResult
    from app.services import system_service
    from app.services.ai_service import AIService

    boss, csrf, _ = staff(app, db, role="super_admin")
    items = {i["key"]: i for i in boss.get("/api/admin/system").json()["items"]}
    assert items["backend"]["status"] == "connected" and items["database"]["status"] == "connected"
    assert items["ai"]["status"] == "configuration_missing"  # nothing configured in the test environment
    assert items["email"]["status"] == "not_implemented" and items["openai"]["status"] == "configuration_missing"

    env(AI_PROVIDER="gemini", GEMINI_API_KEY="AIza-fake-key-0123456789abcdefghij", GEMINI_MODEL="test-model-1")
    system_service._last_ai_test = None
    assert {i["key"]: i for i in boss.get("/api/admin/system").json()["items"]}["ai"]["status"] == "not_tested"  # configured is not the same as connected

    class Fake(AIProvider):
        name = "gemini"

        async def generate(self, **kw):
            return AIResult(text="hi", provider="gemini", model="test-model-1", latency_ms=12)

    monkeypatch.setattr(system_service, "build_ai_service", lambda s: AIService(s, Fake()))
    assert boss.post("/api/admin/system/test-ai", headers=csrf).json()["ok"] is True
    ai = {i["key"]: i for i in boss.get("/api/admin/system").json()["items"]}["ai"]
    assert ai["status"] == "connected" and "12 ms" in ai["detail"]
    assert "AIza" not in boss.get("/api/admin/system").text

    class Broken(Fake):
        async def generate(self, **kw):
            from app.providers.base import AIServiceError

            raise AIServiceError("provider_auth", 503)

    monkeypatch.setattr(system_service, "build_ai_service", lambda s: AIService(s, Broken()))
    assert boss.post("/api/admin/system/test-ai", headers=csrf).json() == {"ok": False, "code": "provider_auth", "latency_ms": None}
    assert {i["key"]: i for i in boss.get("/api/admin/system").json()["items"]}["ai"]["status"] == "unavailable"
    system_service._last_ai_test = None


def test_system_test_requires_super_admin(app, db):
    admin, csrf, _ = staff(app, db, permissions=["chatbot", "settings"])
    assert admin.post("/api/admin/system/test-ai", headers=csrf).status_code == 403


# ---- media ---------------------------------------------------------------------------------------------
def test_upload_preview_publish_replace_and_delete(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["media"])
    up = admin.post("/api/admin/media?filename=Company Logo!!.png&alt=Logo", content=PNG, headers={**csrf, "Content-Type": "image/png"})
    assert up.status_code == 201
    asset = up.json()
    assert asset["content_type"] == "image/png" and asset["filename"] == "Company-Logo.png" and asset["is_public"] is False and asset["url"] is None
    assert client.get(f"/api/media/{asset['id']}").status_code == 404  # private looks like missing
    assert admin.get(asset["preview_url"]).content == PNG  # admins can preview private files
    assert client.get(asset["preview_url"]).status_code == 401

    pub = admin.patch(f"/api/admin/media/{asset['id']}", json={"is_public": True, "alt_text": "Our logo"}, headers=csrf).json()
    assert pub["url"] == f"/api/media/{asset['id']}" and pub["alt_text"] == "Our logo"
    served = client.get(pub["url"])
    assert served.status_code == 200 and served.content == PNG and served.headers["content-type"] == "image/png" and served.headers["x-content-type-options"] == "nosniff"

    jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 32
    rep = admin.put(f"/api/admin/media/{asset['id']}/file", content=jpeg, headers={**csrf, "Content-Type": "application/octet-stream"})
    assert rep.status_code == 200 and rep.json()["content_type"] == "image/jpeg" and rep.json()["filename"].endswith(".jpg")
    listing = admin.get("/api/admin/media").json()
    assert listing["total"] == 1 and listing["usage"]["files"] == 1 and listing["limits"]["max_bytes"] == 2097152
    assert admin.delete(f"/api/admin/media/{asset['id']}").status_code == 403  # CSRF
    assert admin.delete(f"/api/admin/media/{asset['id']}", headers=csrf).status_code == 204
    assert client.get(pub["url"]).status_code == 404 and db.scalar(select(MediaAsset.id)) is None


@pytest.mark.parametrize(("name", "content"), [
    ("evil.svg", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"),
    ("page.png", b"<html><script>alert(1)</script></html>"),  # wrong bytes behind a .png name
    ("tool.exe", b"MZ\x90\x00" + b"\x00" * 50),
    ("notes.txt", b"just text"),
])
def test_files_are_judged_by_their_bytes_not_their_name(app, db, name, content):
    admin, csrf, _ = staff(app, db, permissions=["media"])
    r = admin.post(f"/api/admin/media?filename={name}", content=content, headers={**csrf, "Content-Type": "image/png"})
    assert r.status_code == 415 and r.json()["error"]["code"] == "unsupported_media"
    assert db.scalar(select(MediaAsset.id)) is None


def test_empty_and_oversized_uploads_are_rejected(app, db, env):
    admin, csrf, _ = staff(app, db, permissions=["media"])
    assert admin.post("/api/admin/media?filename=a.png", content=b"", headers=csrf).status_code == 422
    env(MEDIA_MAX_BYTES="2000")
    r = admin.post("/api/admin/media?filename=big.png", content=PNG + b"\x00" * 3000, headers=csrf)
    assert r.status_code == 413
    huge = admin.post("/api/admin/media?filename=huge.png", content=PNG + b"\x00" * 20000, headers=csrf)
    assert huge.status_code == 413  # also stopped by the request-size guard before reaching the route


def test_media_needs_the_media_permission_and_a_normal_json_post_stays_small(app, db):
    nope, csrf, _ = staff(app, db, permissions=["content"])
    assert nope.post("/api/admin/media?filename=a.png", content=PNG, headers=csrf).status_code == 403
    big_json = nope.put("/api/admin/settings", content=b'{"values": {"footer_text": "' + b"a" * 70000 + b'"}}', headers={**csrf, "Content-Type": "application/json"})
    assert big_json.status_code == 413  # only the media route gets a larger body limit
