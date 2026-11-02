"""Provider-independent contract: every AI provider implements ``AIProvider.generate`` and reports failures as
``AIServiceError`` (a short code, an HTTP status and a visitor-safe message). Provider SDK exceptions, request bodies
and credentials never leave the provider modules."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

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
    provider: str
    model: str
    latency_ms: int
    response_id: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    request_id: str | None = None


class AIProvider(ABC):
    """``messages`` is a list of {"role": "user"|"assistant", "content": str}, oldest first. The system prompt is passed
    separately as ``instructions`` so a visitor can never supply it."""

    name: str

    @abstractmethod
    async def generate(self, *, instructions: str, messages: list[dict[str, str]], safety_identifier: str | None = None) -> AIResult:
        raise NotImplementedError
