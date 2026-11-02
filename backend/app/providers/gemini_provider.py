"""Google Gemini via the official Google Gen AI SDK (`google-genai`, `from google import genai`).

Uses the async client (`client.aio.models.generate_content`). The key and model come from settings only. Failures are
translated to AIServiceError; message and reply text are never logged.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable
from typing import Any

import httpx
from google import genai
from google.genai import errors, types

from app.core.config import Settings
from app.providers.base import MAX_REPLY_CHARS, AIProvider, AIResult, AIServiceError

log = logging.getLogger("app.ai.gemini")

ClientFactory = Callable[[Settings], Any]


def _default_client(settings: Settings) -> genai.Client:
    _, api_key, _ = settings.require_ai()
    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=int(settings.ai_timeout_seconds * 1000)))


def _output_tokens(usage) -> int | None:
    """Generated tokens incl. "thinking" tokens (they are billed and count toward the budget). Field names differ by model/SDK."""
    if usage is None:
        return None
    answer = getattr(usage, "response_token_count", None)
    if answer is None:
        answer = getattr(usage, "candidates_token_count", None)
    thoughts = getattr(usage, "thoughts_token_count", None)
    if answer is None and thoughts is None:
        return None
    return (answer or 0) + (thoughts or 0)


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self, settings: Settings, client_factory: ClientFactory | None = None) -> None:
        self.settings = settings
        self._factory = client_factory or _default_client
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is None:
            self._client = self._factory(self.settings)
        return self._client

    async def generate(self, *, instructions: str, messages: list[dict[str, str]], safety_identifier: str | None = None) -> AIResult:
        _, _, model = self.settings.require_ai()  # ConfigError → handled by the caller as "not configured"
        client = self._get_client()
        contents = [types.Content(role="model" if m["role"] == "assistant" else "user", parts=[types.Part(text=m["content"])]) for m in messages]
        config = types.GenerateContentConfig(system_instruction=instructions, max_output_tokens=self.settings.chat_max_output_tokens)
        started = time.monotonic()
        try:
            # Outer guard in addition to the SDK's own HTTP timeout.
            response = await asyncio.wait_for(client.aio.models.generate_content(model=model, contents=contents, config=config), timeout=self.settings.ai_timeout_seconds + 5)
        except Exception as exc:  # noqa: BLE001 - translated, never re-raised raw
            raise self._translate(exc, int((time.monotonic() - started) * 1000)) from None
        latency = int((time.monotonic() - started) * 1000)

        try:
            text = (response.text or "").strip()
        except Exception:  # noqa: BLE001 - the SDK can raise when a response has no usable parts
            text = ""
        if not text:
            feedback = getattr(response, "prompt_feedback", None)
            log.warning("Gemini returned no text (block_reason=%s)", getattr(feedback, "block_reason", None))
            raise AIServiceError("provider_empty_response", 502, latency_ms=latency)
        usage = getattr(response, "usage_metadata", None)
        return AIResult(
            text=text[:MAX_REPLY_CHARS], provider=self.name, model=model, latency_ms=latency,
            response_id=getattr(response, "response_id", None),
            input_tokens=getattr(usage, "prompt_token_count", None), output_tokens=_output_tokens(usage),
        )

    def list_models(self) -> list[str]:
        """Model ids this key can use for text generation (names only). Used by `python -m app.cli check-ai`."""
        client = self._get_client()
        try:
            names = []
            for m in client.models.list():
                actions = getattr(m, "supported_actions", None)
                if not actions or "generateContent" in actions:
                    names.append(str(m.name).removeprefix("models/"))
            return sorted(names)
        except Exception as exc:  # noqa: BLE001
            raise self._translate(exc, 0) from None

    def _translate(self, exc: Exception, latency_ms: int) -> AIServiceError:
        kind = type(exc).__name__
        if isinstance(exc, (asyncio.TimeoutError, httpx.TimeoutException)):
            log.warning("Gemini request timed out after %d ms", latency_ms)
            code, status = "provider_timeout", 504
        elif isinstance(exc, errors.APIError):
            http = getattr(exc, "code", None)
            text = f"{getattr(exc, 'status', '')} {getattr(exc, 'message', '')}".lower()
            if http in (401, 403) or "api key" in text or "api_key" in text or "permission_denied" in text:
                log.error("Gemini rejected the configured credentials (%s). Check GEMINI_API_KEY and API access.", kind)
                code, status = "provider_auth", 503
            elif http == 429:
                if "quota" in text or "billing" in text:
                    log.warning("Gemini quota exhausted")
                    code, status = "provider_quota_exhausted", 503
                else:
                    log.warning("Gemini rate limit reached")
                    code, status = "provider_rate_limited", 429
            elif http == 504 or "deadline" in text:
                log.warning("Gemini deadline exceeded (504): the model took too long or is overloaded")
                code, status = "provider_timeout", 504
            elif http == 503:
                log.warning("Gemini temporarily unavailable (503)")
                code, status = "provider_unavailable", 503
            elif isinstance(exc, errors.ServerError):
                log.error("Gemini server error (%s, code=%s)", kind, http)
                code, status = "provider_error", 502
            else:
                log.error("Gemini rejected the request (%s, code=%s). Check GEMINI_MODEL is valid for this account.", kind, http)
                code, status = "provider_bad_request", 503
        elif isinstance(exc, httpx.TransportError):
            log.warning("Could not reach Gemini (%s)", kind)
            code, status = "provider_unavailable", 503
        else:
            log.error("Unexpected error calling Gemini (%s)", kind)
            code, status = "provider_unexpected", 502
        return AIServiceError(code, status, latency_ms=latency_ms)
