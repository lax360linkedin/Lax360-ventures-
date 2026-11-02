"""OpenAI Responses API wrapper (official ``openai`` Python SDK).

- The API key and model come from backend settings only; nothing here runs at import time.
- Calls are made from the backend, with a timeout and a small, configurable retry count.
- Every failure is translated into an ``AIServiceError`` carrying a safe, user-friendly message and a short
  ``code``; raw provider exceptions, request bodies and credentials never leave this module.
- Only operational metadata (status, latency, model, token counts, provider request id) is returned for logging;
  prompt and reply text are not logged.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import openai

from app.core.config import ConfigError, Settings

log = logging.getLogger("app.openai")

FALLBACK_MESSAGE = (
    "The assistant is unavailable right now. Please use the contact form or WhatsApp and the team will help you directly."
)
MAX_REPLY_CHARS = 4000


class AIServiceError(Exception):
    def __init__(self, code: str, http_status: int, user_message: str = FALLBACK_MESSAGE, *, request_id: str | None = None, latency_ms: int | None = None) -> None:
        super().__init__(code)
        self.code = code
        self.http_status = http_status
        self.user_message = user_message
        self.request_id = request_id
        self.latency_ms = latency_ms


@dataclass
class AIResult:
    text: str
    response_id: str | None
    model: str
    latency_ms: int
    input_tokens: int | None
    output_tokens: int | None
    request_id: str | None


ClientFactory = Callable[[Settings], Any]


def _default_client(settings: Settings) -> openai.OpenAI:
    api_key, _ = settings.require_openai()
    return openai.OpenAI(api_key=api_key, timeout=settings.openai_timeout_seconds, max_retries=settings.openai_max_retries)


class OpenAIService:
    def __init__(self, settings: Settings, client_factory: ClientFactory | None = None) -> None:
        self.settings = settings
        self._factory = client_factory or _default_client
        self._client: Any = None

    @property
    def configured(self) -> bool:
        return self.settings.openai_configured

    def _get_client(self) -> Any:
        if self._client is None:
            self._client = self._factory(self.settings)
        return self._client

    def generate(self, *, instructions: str, messages: list[dict[str, str]], safety_identifier: str | None = None) -> AIResult:
        """Send the bounded conversation to the Responses API and return the assistant text.

        ``messages`` is a list of {"role": "user"|"assistant", "content": str}, oldest first.
        """
        try:
            _, model = self.settings.require_openai()  # ConfigError -> handled by the caller as "not configured"
        except ConfigError:
            raise
        client = self._get_client()
        started = time.monotonic()
        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "instructions": instructions,
                "input": messages,
                "max_output_tokens": self.settings.chat_max_output_tokens,
                "store": False,  # do not retain conversations on the provider side
                "timeout": self.settings.openai_timeout_seconds,
            }
            if safety_identifier:
                kwargs["safety_identifier"] = safety_identifier
            response = client.responses.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 - translated below, never re-raised raw
            raise self._translate(exc, int((time.monotonic() - started) * 1000)) from None
        latency = int((time.monotonic() - started) * 1000)
        request_id = getattr(response, "_request_id", None) or getattr(response, "request_id", None)

        text = (getattr(response, "output_text", "") or "").strip()
        if not text:
            status = getattr(response, "status", None)
            log.warning("OpenAI returned no text (status=%s, request_id=%s)", status, request_id)
            raise AIServiceError("provider_empty_response", 502, request_id=request_id, latency_ms=latency)
        usage = getattr(response, "usage", None)
        return AIResult(
            text=text[:MAX_REPLY_CHARS],
            response_id=getattr(response, "id", None),
            model=model,
            latency_ms=latency,
            input_tokens=getattr(usage, "input_tokens", None),
            output_tokens=getattr(usage, "output_tokens", None),
            request_id=request_id,
        )

    def _translate(self, exc: Exception, latency_ms: int) -> AIServiceError:
        request_id = getattr(exc, "request_id", None)
        kind = type(exc).__name__
        if isinstance(exc, (openai.AuthenticationError, openai.PermissionDeniedError)):
            # Operator problem (bad/revoked key or no access). Visitors only see the fallback.
            log.error("OpenAI rejected the configured credentials (%s, request_id=%s). Check OPENAI_API_KEY and project access.", kind, request_id)
            code, status = "provider_auth", 503
        elif isinstance(exc, openai.RateLimitError):
            log.warning("OpenAI rate limit or quota reached (request_id=%s)", request_id)
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
