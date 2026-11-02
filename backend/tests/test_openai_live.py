"""OPTIONAL integration test: makes ONE real, billable OpenAI API call.

Skipped unless you opt in by exporting RUN_OPENAI_INTEGRATION=1 together with a real OPENAI_API_KEY and
OPENAI_MODEL in your shell (this test never reads backend/.env). Until it has run and passed on your machine,
make no claim that the live OpenAI integration works: the rest of the suite uses a fake client.
"""

import pytest

from tests.conftest import ORIGINAL_ENV

LIVE = ORIGINAL_ENV.get("RUN_OPENAI_INTEGRATION") == "1" and bool(ORIGINAL_ENV.get("OPENAI_API_KEY")) and bool(ORIGINAL_ENV.get("OPENAI_MODEL"))


@pytest.mark.openai_live
@pytest.mark.skipif(not LIVE, reason="set RUN_OPENAI_INTEGRATION=1, OPENAI_API_KEY and OPENAI_MODEL to run the single live API call")
def test_one_real_responses_api_call():
    import asyncio

    from app.core.config import Settings
    from app.providers.openai_provider import OpenAIProvider

    settings = Settings(_env_file=None, ai_provider="openai", openai_api_key=ORIGINAL_ENV["OPENAI_API_KEY"], openai_model=ORIGINAL_ENV["OPENAI_MODEL"], chat_max_output_tokens=60)
    result = asyncio.run(OpenAIProvider(settings).generate(instructions="Reply with one short sentence.", messages=[{"role": "user", "content": "Say hello."}]))
    assert result.text and result.latency_ms > 0
    print(f"live call ok: model={result.model} latency_ms={result.latency_ms} request_id={result.request_id}")
