"""Provider selection. AI_PROVIDER picks exactly one provider; there is no fallback to the other one — a failure is
returned as an error so nothing silently changes provider (or bills the wrong account)."""

from __future__ import annotations

from app.core.config import Settings
from app.providers.base import AIProvider, AIResult
from app.providers.gemini_provider import GeminiProvider
from app.providers.openai_provider import OpenAIProvider

PROVIDERS: dict[str, type[AIProvider]] = {"gemini": GeminiProvider, "openai": OpenAIProvider}


class AIService:
    def __init__(self, settings: Settings, provider: AIProvider | None = None) -> None:
        self.settings = settings
        self._provider = provider  # injected in tests; otherwise built lazily from AI_PROVIDER

    @property
    def provider_name(self) -> str:
        return self._provider.name if self._provider else self.settings.ai_provider

    def _get(self) -> AIProvider:
        if self._provider is None:
            self._provider = PROVIDERS[self.settings.ai_provider](self.settings)  # only the selected class is instantiated
        return self._provider

    async def generate(self, *, instructions: str, messages: list[dict[str, str]], safety_identifier: str | None = None) -> AIResult:
        self.settings.require_ai()  # raises ConfigError naming the missing variable for the SELECTED provider
        return await self._get().generate(instructions=instructions, messages=messages, safety_identifier=safety_identifier)


# One provider instance per (provider, model, key) so HTTP connections are reused between requests.
_cache: dict[tuple[str, str, int], AIProvider] = {}


def build_ai_service(settings: Settings) -> AIService:
    try:
        provider, key, model = settings.require_ai()
    except Exception:  # noqa: BLE001 - unconfigured: the service raises the proper ConfigError when used
        return AIService(settings)
    cache_key = (provider, model, hash(key))
    if cache_key not in _cache:
        _cache[cache_key] = PROVIDERS[provider](settings)
    return AIService(settings, _cache[cache_key])
