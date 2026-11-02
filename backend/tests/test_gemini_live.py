"""OPTIONAL integration test: makes ONE real Gemini API call (may use your free-tier quota or bill your project).

Skipped unless you opt in by exporting RUN_GEMINI_INTEGRATION=1 together with a real GEMINI_API_KEY and GEMINI_MODEL
in your shell (this test never reads backend/.env). Until it has run and passed on your machine, make no claim that the
live Gemini integration works: the rest of the suite uses fake clients.
"""

import pytest

from tests.conftest import ORIGINAL_ENV

LIVE = ORIGINAL_ENV.get("RUN_GEMINI_INTEGRATION") == "1" and bool(ORIGINAL_ENV.get("GEMINI_API_KEY")) and bool(ORIGINAL_ENV.get("GEMINI_MODEL"))


@pytest.mark.skipif(not LIVE, reason="set RUN_GEMINI_INTEGRATION=1, GEMINI_API_KEY and GEMINI_MODEL to run the single live API call")
def test_one_real_gemini_call():
    import asyncio

    from app.core.config import Settings
    from app.providers.gemini_provider import GeminiProvider

    settings = Settings(_env_file=None, ai_provider="gemini", gemini_api_key=ORIGINAL_ENV["GEMINI_API_KEY"], gemini_model=ORIGINAL_ENV["GEMINI_MODEL"], chat_max_output_tokens=200)
    result = asyncio.run(GeminiProvider(settings).generate(instructions="Reply with one short sentence.", messages=[{"role": "user", "content": "Say hello."}]))
    assert result.text and result.latency_ms > 0
    print(f"live Gemini call ok: model={result.model} latency_ms={result.latency_ms}")
