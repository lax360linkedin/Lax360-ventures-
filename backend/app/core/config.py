"""Environment-driven settings.

Importing this module never requires secrets: nothing here reads the OpenAI key, the database or the auth
secret until a feature that needs them is used (see the ``require_*`` helpers). In production,
``validate_for_production`` is called at startup so a weak configuration fails fast instead of running.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

MODEL_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{1,99}$")


class ConfigError(RuntimeError):
    """A required setting is missing or unsafe. The message names the variable, never its value."""

    def __init__(self, message: str, *, variable: str | None = None) -> None:
        super().__init__(message)
        self.variable = variable


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- application -------------------------------------------------------------------------
    app_env: Literal["development", "test", "production"] = "development"
    port: int = 8000
    log_level: str = "INFO"
    log_json: bool = False
    docs_enabled: bool | None = None  # default: on outside production, off in production
    trust_proxy_headers: bool = False  # honour X-Forwarded-For (only behind a proxy you control)
    max_request_body_bytes: int = 65_536
    media_max_bytes: int = 2_097_152  # largest uploaded image/PDF (stored in the database)
    app_timezone: str = "Asia/Kolkata"  # the timezone every schedule (homepage videos) is calculated and displayed in
    hero_video_dir: str = "storage/hero_videos"  # homepage background videos live on disk (relative paths are inside backend/), NOT in the database
    hero_video_max_bytes: int = 52_428_800  # largest homepage video upload (50 MB)
    hero_video_slot_seconds: int | None = None  # development/test ONLY: replaces the 3-day slot length so rotation can be watched in minutes

    # --- CORS / frontend ---------------------------------------------------------------------
    frontend_origin: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # --- database ----------------------------------------------------------------------------
    database_url: str | None = None
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_recycle_seconds: int = 1800  # recycle connections before a pooler/firewall drops idle ones
    db_connect_timeout_seconds: int = 10
    db_disable_prepared_statements: bool | None = None  # None = automatic (on for Supabase transaction pooler, port 6543)

    # --- authentication ----------------------------------------------------------------------
    auth_secret: SecretStr | None = None
    session_ttl_minutes: int = 720
    session_cookie_name: str = "lax360_session"  # public website sessions
    admin_session_cookie_name: str = "lax360_admin_session"  # company-admin sessions: a different cookie, only ever sent to /api/admin/*
    admin_session_ttl_minutes: int = 480
    cookie_secure: bool | None = None  # default: True in production
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None
    min_password_length: int = 8
    # Initial Super Admin (created once; see auth_service.provision_initial_admin). The password is NEVER stored in settings tables.
    admin_email: str | None = None
    admin_username: str | None = None
    admin_password: SecretStr | None = None

    # --- AI provider (chosen by AI_PROVIDER; keys and models are backend-only) ---------------------
    ai_provider: Literal["gemini", "openai"] = "gemini"
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = None  # the model id YOU choose; none is assumed
    openai_api_key: SecretStr | None = None
    openai_model: str | None = None
    ai_timeout_seconds: float = 20.0
    ai_max_retries: int = 1  # applies to the OpenAI SDK's bounded retries

    # --- chatbot behaviour and limits --------------------------------------------------------
    chat_max_input_chars: int = 1000
    chat_max_output_tokens: int = 500
    chat_context_messages: int = 10
    chat_max_messages_per_session: int = 40
    chat_retention_days: int = 30
    chat_daily_token_budget: int = 0  # 0 = no application-side budget

    # --- rate limiting (in-memory, per process) ---------------------------------------------
    rate_limit_enabled: bool = True
    login_rate_limit_max: int = 5
    login_rate_limit_window_seconds: int = 300
    register_rate_limit_max: int = 5
    register_rate_limit_window_seconds: int = 3600
    contact_rate_limit_max: int = 5
    contact_rate_limit_window_seconds: int = 3600
    demo_rate_limit_max: int = 10
    demo_rate_limit_window_seconds: int = 3600
    chat_rate_limit_max: int = 10
    chat_rate_limit_window_seconds: int = 60

    @field_validator("ai_provider", mode="before")
    @classmethod
    def _provider_lower(cls, v):
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("openai_api_key", "gemini_api_key", "auth_secret", "admin_password", mode="before")
    @classmethod
    def _blank_secret_is_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    @field_validator("openai_model", "gemini_model", "admin_email", "admin_username", "hero_video_slot_seconds", "database_url", "cookie_domain", "docs_enabled", "cookie_secure", "db_disable_prepared_statements", mode="before")
    @classmethod
    def _blank_is_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    # --- derived -----------------------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]
        if self.frontend_origin and self.frontend_origin.rstrip("/") not in origins:
            origins.append(self.frontend_origin.rstrip("/"))
        return origins

    @property
    def docs_on(self) -> bool:
        return self.docs_enabled if self.docs_enabled is not None else not self.is_production

    @property
    def cookie_secure_on(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.is_production

    @property
    def sqlalchemy_url(self) -> str:
        """The database URL with the psycopg 3 driver; raises a safe error when unset."""
        if not self.database_url:
            raise ConfigError("DATABASE_URL is not set. Add it to backend/.env (see .env.example).", variable="DATABASE_URL")
        url = self.database_url
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def ai_configured(self) -> bool:
        """True when the SELECTED provider has its key and model (never inspects the other provider)."""
        try:
            self.require_ai()
        except ConfigError:
            return False
        return True

    # --- requirement helpers -----------------------------------------------------------------
    def require_auth_secret(self) -> str:
        if not self.auth_secret:
            raise ConfigError("AUTH_SECRET is not set. Generate one (see .env.example) and add it to backend/.env.", variable="AUTH_SECRET")
        return self.auth_secret.get_secret_value()

    def require_ai(self) -> tuple[str, str, str]:
        """Return (provider, api_key, model) for the selected provider, or raise a ConfigError naming what is missing.
        Only the selected provider's settings are checked: Gemini mode never needs OpenAI credentials, and vice versa."""
        provider = self.ai_provider
        prefix = provider.upper()
        key = getattr(self, f"{provider}_api_key")
        model = getattr(self, f"{provider}_model")
        if not key or not key.get_secret_value():
            raise ConfigError(f"{prefix}_API_KEY is not set (AI_PROVIDER={provider}). Add it to backend/.env to enable the AI assistant.", variable=f"{prefix}_API_KEY")
        if not model:
            raise ConfigError(
                f"{prefix}_MODEL is not set (AI_PROVIDER={provider}). Choose a model from your {provider.title()} account and set {prefix}_MODEL in backend/.env.",
                variable=f"{prefix}_MODEL",
            )
        if not MODEL_ID_PATTERN.match(model):
            raise ConfigError(f"{prefix}_MODEL does not look like a valid model identifier.", variable=f"{prefix}_MODEL")
        return provider, key.get_secret_value(), model

    def validate_for_production(self) -> None:
        """Fail fast on unsafe production settings. Called once at startup when APP_ENV=production."""
        problems: list[str] = []
        secret = self.auth_secret.get_secret_value() if self.auth_secret else ""
        if len(secret) < 32:
            problems.append("AUTH_SECRET must be set to a random value of at least 32 characters")
        if not self.database_url:
            problems.append("DATABASE_URL must be set")
        if not self.cookie_secure_on:
            problems.append("COOKIE_SECURE must be true")
        if self.cookie_samesite == "none" and not self.cookie_secure_on:
            problems.append("COOKIE_SAMESITE=none requires COOKIE_SECURE=true")
        if "*" in self.cors_origin_list:
            problems.append("CORS_ORIGINS must list explicit origins, not *")
        if any(o.startswith("http://") and "localhost" not in o and "127.0.0.1" not in o for o in self.cors_origin_list):
            problems.append("CORS_ORIGINS must use https:// origins in production")
        if problems:
            raise ConfigError("Unsafe production configuration: " + "; ".join(problems) + ".")


@lru_cache
def get_settings() -> Settings:
    return Settings()
