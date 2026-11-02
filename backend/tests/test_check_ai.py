"""`python -m app.cli check-ai` and log redaction of Google / Supabase style secrets (fake providers only, no network)."""

import types

import pytest

from app import cli
from app.core.config import get_settings
from app.core.logging import redact
from app.providers.base import AIProvider, AIResult, AIServiceError
from app.services.ai_service import AIService

KEY = "AIzaSyFAKE-test-key-0123456789abcdefghij"


class FakeGemini(AIProvider):
    name = "gemini"

    def __init__(self, models, error=None):
        self.models, self.error = models, error

    def list_models(self):
        return self.models

    async def generate(self, *, instructions, messages, safety_identifier=None):
        if self.error:
            raise self.error
        return AIResult(text="Hello there!", provider="gemini", model="m", latency_ms=42, input_tokens=7, output_tokens=3)


def run_check(monkeypatch, env, provider, capsys):
    env(AI_PROVIDER="gemini", GEMINI_API_KEY=KEY, GEMINI_MODEL="test-model-1")
    monkeypatch.setattr(cli, "build_ai_service", lambda settings: AIService(settings, provider))
    code = 0
    try:
        cli.main(["check-ai"])
    except SystemExit as exc:
        code = exc.code
    out = capsys.readouterr()
    return code, out.out, out.err


def test_check_ai_reports_success_without_keys_or_reply_text(monkeypatch, env, capsys):
    code, out, err = run_check(monkeypatch, env, FakeGemini(["test-model-1", "other"]), capsys)
    assert code == 0 and "Model id found in that list: yes" in out and "Live call: OK" in out and "tokens in/out=7/3" in out
    assert KEY not in out + err and "Hello there" not in out + err


def test_check_ai_flags_a_model_id_the_key_cannot_use(monkeypatch, env, capsys):
    code, out, err = run_check(monkeypatch, env, FakeGemini(["alpha", "beta"]), capsys)
    assert code == 0 and "found in that list: NO" in err and "alpha, beta" in err


def test_check_ai_failure_gives_a_hint_and_nonzero_exit(monkeypatch, env, capsys):
    code, out, err = run_check(monkeypatch, env, FakeGemini(["test-model-1"], error=AIServiceError("provider_auth", 503)), capsys)
    assert code == 2 and "Live call: FAILED (provider_auth)" in err and "API key" in err and KEY not in out + err


def test_check_ai_with_missing_configuration_exits_cleanly(env, capsys):
    env(AI_PROVIDER="gemini", GEMINI_API_KEY=None, GEMINI_MODEL=None)
    with pytest.raises(SystemExit) as exc:
        cli.main(["check-ai"])
    assert exc.value.code == 2 and "GEMINI_API_KEY" in capsys.readouterr().err


@pytest.mark.parametrize(
    "secret",
    [
        "AIzaSyD-abcdefghijklmnopqrstuvwxyz012345",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlLXZhbHVlLWhlcmU",
        "sk-proj-abcdefghijklmnop",
        "postgresql://postgres.abcd:Sup3rSecret@aws-0-x.pooler.supabase.com:5432/postgres",
    ],
)
def test_logs_redact_google_keys_jwts_and_database_urls(secret):
    cleaned = redact(f"failure while calling provider: {secret} (retrying)")
    assert "Sup3rSecret" not in cleaned and secret not in cleaned and "REDACTED" in cleaned
