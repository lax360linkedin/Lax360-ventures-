"""OpenAI via the official ``openai`` SDK and the Responses API (`client.responses.create`), async client.

Implemented for configuration-based selection (AI_PROVIDER=openai). Calls are made from the backend with a timeout and a
small bounded retry count; `store=False` so conversations are not retained provider-side. Failures become AIServiceError.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

import openai

from app.core.config import Settings
from app.providers.base import MAX_REPLY_CHARS, AIProvider, AIResult, AIServiceError

log = logging.getLogger("app.ai.openai")

ClientFactory = Callable[[Settings], Any]


def _default_client(settings: Settings) -> openai.AsyncOpenAI:
    _, api_key, _ = settings.require_ai()
    return openai.AsyncOpenAI(api_key=api_key, timeout=settings.ai_timeout_seconds, max_retries=settings.ai_max_retries)


class OpenAIProvider(AIProvider):
    name = "openai"

    def __init__(self, settings: Settings, client_factory: ClientFactory | None = None) -> None:
        self.settings = settings
        self._factory = client_factory or _default_client
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is None:
            self._client = self._factory(self.settings)
        return self._client

    async def generate(self, *, instructions: str, messages: list[dict[str, str]], safety_identifier: str | None = None) -> AIResult:
        _, _, model = self.settings.require_ai()
        client = self._get_client()
        started = time.monotonic()
        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "instructions": instructions,
                "input": messages,
                "max_output_tokens": self.settings.chat_max_output_tokens,
                "store": False,
                "timeout": self.settings.ai_timeout_seconds,
            }
            if safety_identifier:
                kwargs["safety_identifier"] = safety_identifier
            response = await client.responses.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 - translated below, never re-raised raw
            raise self._translate(exc, int((time.monotonic() - started) * 1000)) from None
        latency = int((time.monotonic() - started) * 1000)
        request_id = getattr(response, "_request_id", None) or getattr(response, "request_id", None)

        text = (getattr(response, "output_text", "") or "").strip()
        if not text:
            log.warning("OpenAI returned no text (status=%s, request_id=%s)", getattr(response, "status", None), request_id)
            raise AIServiceError("provider_empty_response", 502, request_id=request_id, latency_ms=latency)
        usage = getattr(response, "usage", None)
        return AIResult(
            text=text[:MAX_REPLY_CHARS], provider=self.name, model=model, latency_ms=latency, response_id=getattr(response, "id", None),
            input_tokens=getattr(usage, "input_tokens", None), output_tokens=getattr(usage, "output_tokens", None), request_id=request_id,
        )

    def _translate(self, exc: Exception, latency_ms: int) -> AIServiceError:
        request_id = getattr(exc, "request_id", None)
        kind = type(exc).__name__
        if isinstance(exc, (openai.AuthenticationError, openai.PermissionDeniedError)):
            log.error("OpenAI rejected the configured credentials (%s, request_id=%s). Check OPENAI_API_KEY and project access.", kind, request_id)
            code, status = "provider_auth", 503
        elif isinstance(exc, openai.RateLimitError):
            if getattr(exc, "code", None) == "insufficient_quota":
                log.warning("OpenAI quota exhausted (request_id=%s)", request_id)
                code, status = "provider_quota_exhausted", 503
            else:
                log.warning("OpenAI rate limit reached (request_id=%s)", request_id)
                code, status = "provider_rate_limited", 429
        elif isinstance(exc, openai.APITimeoutError):
            log.warning("OpenAI request timed out after %d ms", latency_ms)
            code, status = "provider_timeout", 504
        elif isinstance(exc, openai.APIConnectionError):
            log.warning("Could not reach OpenAI (%s)", kind)
            code, status = "provider_unavailable", 503
        elif isinstance(exc, (openai.BadRequestError, openai.NotFoundError, openai.UnprocessableEntityError)):
            log.error("OpenAI rejected the request (%s, request_id=%s). Check OPENAI_MODEL is valid for this account.", kind, request_id)
            code, status = "provider_bad_request", 503
        elif isinstance(exc, openai.APIStatusError):
            log.error("OpenAI server error (%s, status=%s, request_id=%s)", kind, getattr(exc, "status_code", "?"), request_id)
            code, status = "provider_error", 502
        else:
            log.error("Unexpected error calling OpenAI (%s)", kind)
            code, status = "provider_unexpected", 502
        return AIServiceError(code, status, request_id=request_id, latency_ms=latency_ms)
