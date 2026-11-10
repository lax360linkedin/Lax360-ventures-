import logging

import httpx
import openai
import pytest
from sqlalchemy import func, select

from app.models import AiUsage, ChatMessage, ChatSession, DemoRequest
from tests.conftest import fake_response, login, make_user

KEY = "sk-test-fake-0000000000000000"
REQ = httpx.Request("POST", "https://api.openai.com/v1/responses")


def say(client, message="What does LAX360 do?", **extra):
    return client.post("/api/chat", json={"message": message, **extra})


def status_error(cls, code, message=f"Incorrect API key provided: {KEY}"):
    return cls(message, response=httpx.Response(code, request=REQ), body=None)


# ---- configuration -------------------------------------------------------------------------------
def test_missing_api_key_gives_a_safe_actionable_error(client):
    r = say(client)
    body = r.json()["error"]
    assert r.status_code == 503 and body["code"] == "ai_not_configured"
    assert "GEMINI_API_KEY" in body["message"]  # default provider is gemini; the developer hint names the variable to set
    assert "contact form" in body["message"].lower()  # visitor-friendly fallback
    assert "sk-" not in r.text


def test_missing_model_names_the_variable_not_a_guess(client, env):
    env(AI_PROVIDER="openai", OPENAI_API_KEY=KEY)
    r = say(client)
    assert r.status_code == 503 and "OPENAI_MODEL" in r.json()["error"]["message"]


def test_production_hides_developer_hints(env, monkeypatch):
    from app.core.config import Settings

    s = Settings(app_env="production", cookie_secure=None, _env_file=None)
    assert s.is_production and not s.docs_on and s.cookie_secure_on


# ---- happy path ----------------------------------------------------------------------------------
def test_chat_returns_the_expected_format_and_persists(client, ai, db):
    ai.responses.behaviour = fake_response("LAX360 Pvt Ltd offers software, AI, digital growth and training.")
    r = say(client, "Tell me about AI services")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"reply", "conversation_id", "provider", "session_id", "session_token", "message", "links", "whatsapp", "follow_ups", "meta"}
    assert body["provider"] == "openai" and body["reply"] == body["message"]["text"] and body["conversation_id"] == body["session_id"]
    assert body["message"]["text"].startswith("LAX360 Pvt Ltd offers") and body["session_token"]
    assert {"label": "AI & Business Automation", "to": "/services/ai"} in body["links"] and "ai" in body["follow_ups"]
    assert body["meta"]["status"] == "ok"

    call = ai.responses.calls[0]
    assert call["model"] == "test-model-id" and call["store"] is False and call["max_output_tokens"] == 500
    assert "LAX360 Pvt Ltd AI Assistant" in call["instructions"] and "Salem" in call["instructions"]
    assert "Bangalore" in call["instructions"] and "Mumbai" in call["instructions"]
    assert call["input"] == [{"role": "user", "content": "Tell me about AI services"}]
    assert "api_key" not in call and KEY not in str(call)

    msgs = db.scalars(select(ChatMessage).order_by(ChatMessage.created_at)).all()
    assert [(m.role, m.status) for m in msgs] == [("user", "completed"), ("assistant", "completed")]
    usage = db.scalar(select(AiUsage))
    assert usage.status == "ok" and usage.input_tokens == 120 and usage.output_tokens == 30 and usage.provider_request_id == "req_test_1"
    assert db.scalar(select(ChatSession)).message_count == 2


def test_company_knowledge_is_verified_and_does_not_invent(client, ai):
    say(client)
    text = ai.responses.calls[0]["instructions"]
    assert "Never claim LAX360 Pvt Ltd is an official OpenAI partner" in text
    assert "Dynasty Business Park" in text and "+91 95666 05272" in text and "CPS Tower" in text  # the assistant is told the official branch addresses and phones (from the database)
    assert "not yet published" not in text
    assert "Tamil" in text and "Thanglish" in text
    assert "NOT CONFIRMED" in text and "pricing" in text


def test_conversation_context_is_bounded_and_session_token_only_returned_once(client, ai, env):
    env(CHAT_CONTEXT_MESSAGES="3")
    first = say(client, "one").json()
    sid, token = first["session_id"], first["session_token"]
    second = say(client, "two", session_id=sid, session_token=token).json()
    assert second["session_token"] is None and second["session_id"] == sid
    say(client, "three", session_id=sid, session_token=token)
    sent = ai.responses.calls[-1]["input"]
    assert sent[-1] == {"role": "user", "content": "three"} and len(sent) <= 3 and sent[0]["role"] == "user"


def test_conversation_length_limit(client, ai, env):
    env(CHAT_MAX_MESSAGES_PER_SESSION="2")
    first = say(client, "hello").json()
    r = say(client, "again", session_id=first["session_id"], session_token=first["session_token"])
    assert r.status_code == 409 and r.json()["error"]["code"] == "conversation_limit"


# ---- ownership -----------------------------------------------------------------------------------
def test_sessions_cannot_be_used_without_the_secret_token(client, ai):
    first = say(client, "hello").json()
    assert say(client, "x", session_id=first["session_id"]).status_code == 404
    assert say(client, "x", session_id=first["session_id"], session_token="guess").status_code == 404
    assert say(client, "x", session_id="00000000-0000-0000-0000-000000000000", session_token="guess").status_code == 404


def test_a_signed_in_users_session_is_not_available_to_others(client, app, ai, db):
    from fastapi.testclient import TestClient

    make_user(db)
    login(client)
    mine = say(client, "hello").json()
    assert db.scalar(select(ChatSession.user_id)) is not None
    stranger = TestClient(app, base_url="http://localhost")
    r = stranger.post("/api/chat", json={"message": "hi", "session_id": mine["session_id"], "session_token": mine["session_token"]})
    assert r.status_code == 404  # even with the right token, an anonymous caller cannot take over a user's conversation
    assert say(client, "still me", session_id=mine["session_id"], session_token=mine["session_token"]).status_code == 200


# ---- request validation --------------------------------------------------------------------------
def test_invalid_and_oversized_requests(client, ai):
    assert client.post("/api/chat", json={}).status_code == 422
    assert client.post("/api/chat", json={"message": ""}).status_code == 422
    assert client.post("/api/chat", json={"message": "hi", "role": "system"}).status_code == 422
    assert client.post("/api/chat", content=b"not json", headers={"Content-Type": "application/json"}).status_code == 422
    long = say(client, "x" * 1001)
    assert long.status_code == 422 and "message" in long.json()["error"]["fields"]
    assert say(client, "x" * 5000).status_code == 422
    huge = client.post("/api/chat", content=b'{"message":"' + b"a" * 70_000 + b'"}', headers={"Content-Type": "application/json"})
    assert huge.status_code == 413
    assert ai.responses.calls == []  # nothing invalid ever reached the provider


# ---- provider failures ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (status_error(openai.AuthenticationError, 401), 503, "provider_auth"),
        (status_error(openai.RateLimitError, 429, "Rate limit reached"), 429, "provider_rate_limited"),
        (openai.APITimeoutError(request=REQ), 504, "provider_timeout"),
        (openai.APIConnectionError(request=REQ), 503, "provider_unavailable"),
        (status_error(openai.InternalServerError, 500, "upstream boom"), 502, "provider_error"),
        (status_error(openai.NotFoundError, 404, "The model does not exist"), 503, "provider_bad_request"),
        (RuntimeError(f"unexpected {KEY}"), 502, "provider_unexpected"),
    ],
)
def test_provider_errors_become_safe_fallbacks(client, ai, db, error, status, code):
    ai.responses.behaviour = error
    r = say(client)
    err = r.json()["error"]
    assert r.status_code == status and err["code"] == code
    assert "contact form" in err["message"].lower()
    assert KEY not in r.text and "upstream boom" not in r.text and "Traceback" not in r.text
    if status == 429:
        assert r.headers["retry-after"]
    assert db.scalar(select(AiUsage.status)) == code
    assert db.scalar(select(ChatMessage.status).where(ChatMessage.role == "user")) == "failed"
    assert db.scalar(select(func.count()).select_from(ChatMessage).where(ChatMessage.role == "assistant")) == 0


def test_empty_provider_output_is_an_error_not_a_blank_reply(client, ai):
    ai.responses.behaviour = fake_response(text="   ")
    r = say(client)
    assert r.status_code == 502 and r.json()["error"]["code"] == "provider_empty_response"


def test_no_secret_reaches_logs_or_responses(client, ai, caplog):
    caplog.set_level(logging.DEBUG)
    ai.responses.behaviour = status_error(openai.AuthenticationError, 401)
    r = say(client, "Please remember my password hunter2")
    ai.responses.behaviour = RuntimeError(f"boom {KEY}")
    r2 = say(client)
    for text in (r.text, r2.text, caplog.text):
        assert KEY not in text
    assert "hunter2" not in caplog.text and "Please remember" not in caplog.text  # message content is never logged


def test_redaction_filter_masks_keys_and_connection_strings():
    from app.core.logging import redact

    assert "sk-abcdefghijklmnop" not in redact("key sk-abcdefghijklmnop here")
    assert "s3cret" not in redact("postgresql://user:s3cret@db:5432/x")
    assert "abc123" not in redact("Authorization: Bearer abc123")
    assert "p@ss" not in redact("password=p@ss")


# ---- usage controls ------------------------------------------------------------------------------
def test_daily_token_budget_blocks_further_calls(client, ai, env):
    env(CHAT_DAILY_TOKEN_BUDGET="100")
    assert say(client).status_code == 200  # uses 150 tokens
    r = say(client)
    assert r.status_code == 503 and r.json()["error"]["code"] == "ai_budget_exceeded"
    assert len(ai.responses.calls) == 1


def test_chat_is_rate_limited(client, ai, env):
    env(CHAT_RATE_LIMIT_MAX="2")
    assert [say(client).status_code for _ in range(3)] == [200, 200, 429]


# ---- the model cannot trigger actions ------------------------------------------------------------
def test_model_text_cannot_create_demo_requests_or_admin_actions(client, ai, db):
    ai.responses.behaviour = fake_response("Sure! Your demo is booked and confirmed for tomorrow.")
    r = say(client, "I want to book a demo")
    assert r.status_code == 200
    assert {"label": "Get a Demo (login required)", "to": "/demo"} in r.json()["links"]
    assert db.scalar(select(func.count()).select_from(DemoRequest)) == 0
    assert "tools" not in ai.responses.calls[0]  # no function calling / tool access is offered to the model


def test_expired_conversations_are_purged(client, ai, db):
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import update

    from app.services.chat_service import purge_expired

    say(client)
    db.execute(update(ChatSession).values(expires_at=datetime.now(timezone.utc) - timedelta(days=1)))
    db.commit()
    assert purge_expired(db) == 1
    assert db.scalar(select(func.count()).select_from(ChatMessage)) == 0
