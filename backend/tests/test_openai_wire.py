"""Drives the REAL `openai` SDK client against a mocked HTTP transport (no network, no key needed).

This checks what OpenAIService actually puts on the wire: the Responses endpoint, bearer auth, and the JSON body
(model, instructions, input messages, max_output_tokens, store=false). The *response* JSON below is written by hand
from the documented shape — it is not proof of how the live API behaves; only the opt-in live test is.
"""

import json

import httpx
import openai

from app.core.config import Settings
import asyncio

import pytest

from app.providers.base import AIServiceError
from app.providers.openai_provider import OpenAIProvider


def response_json(text="Hi! I'm the LAX360 Pvt Ltd AI Assistant."):
    return {
        "id": "resp_wire_1", "object": "response", "created_at": 1, "status": "completed", "model": "test-model-id",
        "output": [{"type": "message", "id": "msg_1", "role": "assistant", "status": "completed",
                    "content": [{"type": "output_text", "text": text, "annotations": []}]}],
        "usage": {"input_tokens": 50, "output_tokens": 12, "total_tokens": 62},
        "parallel_tool_calls": True, "tool_choice": "auto", "tools": [],
    }


def service(handler, **over):
    settings = Settings(_env_file=None, ai_provider="openai", openai_api_key="sk-test-wire-0000000000000", openai_model="test-model-id", ai_max_retries=0, **over)

    def factory(s):
        return openai.AsyncOpenAI(api_key=s.openai_api_key.get_secret_value(), max_retries=0, http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))

    return OpenAIProvider(settings, client_factory=factory)


def run(coro):
    return asyncio.run(coro)


def test_request_shape_and_response_parsing():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"], seen["auth"], seen["body"] = request.url.path, request.headers.get("authorization"), json.loads(request.content)
        return httpx.Response(200, json=response_json(), headers={"x-request-id": "req_wire_1"})

    result = run(service(handler).generate(instructions="Be helpful.", messages=[{"role": "user", "content": "hello"}], safety_identifier="abc123"))
    assert seen["path"].endswith("/responses")
    assert seen["auth"] == "Bearer sk-test-wire-0000000000000"
    body = seen["body"]
    assert body["model"] == "test-model-id" and body["instructions"] == "Be helpful." and body["store"] is False
    assert body["max_output_tokens"] == 500 and body["safety_identifier"] == "abc123"
    assert body["input"] == [{"role": "user", "content": "hello"}]
    assert result.text.startswith("Hi!") and result.input_tokens == 50 and result.output_tokens == 12 and result.response_id == "resp_wire_1"
    assert result.request_id == "req_wire_1"


@pytest.mark.parametrize(("status", "code"), [(401, "provider_auth"), (429, "provider_rate_limited"), (500, "provider_error"), (404, "provider_bad_request")])
def test_http_errors_from_the_real_sdk_are_translated(status, code):
    def handler(request):
        return httpx.Response(status, json={"error": {"message": "Incorrect API key provided: sk-test-wire-0000000000000", "type": "x"}})

    with pytest.raises(AIServiceError) as exc:
        run(service(handler).generate(instructions="x", messages=[{"role": "user", "content": "hi"}]))
    assert exc.value.code == code
    assert "sk-test" not in exc.value.user_message and "sk-test" not in str(exc.value)


def test_timeouts_and_connection_failures_from_the_real_sdk():
    def timeout(request):
        raise httpx.ReadTimeout("slow", request=request)

    def down(request):
        raise httpx.ConnectError("refused", request=request)

    with pytest.raises(AIServiceError) as t:
        run(service(timeout).generate(instructions="x", messages=[{"role": "user", "content": "hi"}]))
    with pytest.raises(AIServiceError) as d:
        run(service(down).generate(instructions="x", messages=[{"role": "user", "content": "hi"}]))
    assert (t.value.code, t.value.http_status) == ("provider_timeout", 504)
    assert (d.value.code, d.value.http_status) == ("provider_unavailable", 503)
