from __future__ import annotations

import logging
import os
from urllib.parse import urlparse
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.router import api_router
from app.core.config import ConfigError, get_settings
from app.core.errors import envelope, install_error_handlers
from app.core.logging import configure_logging

log = logging.getLogger("app")


class BodyLimitMiddleware:
    """Reject request bodies larger than MAX_REQUEST_BODY_BYTES (declared or streamed) with 413."""

    def __init__(self, app: ASGIApp, max_bytes: int, media_bytes: int = 0, video_bytes: int = 0) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.media_bytes = media_bytes
        self.video_bytes = video_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limit = self.max_bytes
        if scope["path"].startswith("/api/admin/media") and scope["method"] in ("POST", "PUT"):
            limit = self.media_bytes + 8192  # file uploads (admins only; the route still validates type and size)
        elif scope["path"].startswith("/api/admin/hero-videos") and scope["method"] in ("POST", "PUT"):
            limit = self.video_bytes + 8192  # homepage videos (admins only; streamed to disk and validated by the route)
        declared = dict(scope["headers"]).get(b"content-length")
        too_big = bool(declared and declared.isdigit() and int(declared) > limit)
        seen = 0

        async def limited_receive() -> Message:
            nonlocal seen, too_big
            message = await receive()
            if message["type"] == "http.request":
                seen += len(message.get("body", b""))
                if seen > limit:
                    too_big = True
                    return {"type": "http.request", "body": b"", "more_body": False}
            return message

        if too_big:
            return await self._reject(send)
        started = False

        async def guarded_send(message: Message) -> None:
            nonlocal started
            if too_big and not started:
                started = True
                return await self._reject(send)
            if not too_big:
                await send(message)

        await self.app(scope, limited_receive, guarded_send)

    async def _reject(self, send: Send) -> None:
        import json

        body = json.dumps(envelope("payload_too_large", "That request is too large.")).encode()
        await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})


def _warn_cross_site_cookies(settings) -> None:
    """Login is a cookie session. If the website is served from a different site than this API (e.g. Vercel + Render) a SameSite=Lax
    cookie is silently dropped by the browser: login "succeeds" but every later admin request is anonymous. Say so in the logs."""
    if not settings.is_production or settings.cookie_samesite == "none":
        return
    api_host = (urlparse(os.environ.get("RENDER_EXTERNAL_URL", "")).hostname or "").lower()
    if not api_host:
        return
    shared_hosts = ("onrender.com", "vercel.app", "netlify.app", "herokuapp.com", "github.io")  # many unrelated sites live under these: always cross-site

    def cross_site(origin: str) -> bool:
        host = (urlparse(origin).hostname or "").lower()
        if not host or host == api_host or host in ("localhost", "127.0.0.1"):
            return False
        base = ".".join(host.split(".")[-2:])
        return base != ".".join(api_host.split(".")[-2:]) or base in shared_hosts  # rough registrable-domain check, enough for a warning

    other = [o for o in settings.cors_origin_list if cross_site(o)]
    if other:
        log.warning("The website origin(s) %s are a different site from this API (%s) but COOKIE_SAMESITE=%s: browsers will NOT keep the login cookie, so "
                    "admin and customer logins will appear to work and then fail. Serve /api through the website's own domain (recommended: a rewrite "
                    "in frontend/vercel.json with VITE_API_BASE_URL empty) or set COOKIE_SAMESITE=none.", ", ".join(other), api_host, settings.cookie_samesite)


def _provision_admin(settings) -> None:
    """Create the initial super admin from ADMIN_* once. Never overwrites anything; never stops the server from starting."""
    if not settings.admin_email or not settings.database_url:
        return
    try:
        from app.db.session import _factory
        from app.services import auth_service

        with _factory()() as db:
            result = auth_service.provision_initial_admin(db, settings)
        level = logging.INFO if result.ok else logging.WARNING
        if result.action != "exists":
            log.log(level, "Initial admin: %s", result.message)
    except Exception as exc:  # noqa: BLE001 - e.g. database not reachable yet or migrations not applied
        log.warning("Initial admin provisioning skipped (%s). Run `alembic upgrade head`, then `python -m app.cli provision-admin`.", type(exc).__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_json)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.is_production:
            settings.validate_for_production()  # unsafe production config: refuse to start
        elif not settings.auth_secret:
            log.warning("AUTH_SECRET is not set: login and chat sessions are unavailable until it is configured.")
        _warn_cross_site_cookies(settings)
        _provision_admin(settings)
        if not settings.ai_configured:
            log.warning("AI provider '%s' is not configured (set %s_API_KEY and %s_MODEL): /api/chat will return a safe fallback.", settings.ai_provider, settings.ai_provider.upper(), settings.ai_provider.upper())
        yield

    app = FastAPI(
        title="LAX360 Ventures API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if settings.docs_on else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.docs_on else None,
    )
    install_error_handlers(app, expose_hints=not settings.is_production)

    origins = settings.cors_origin_list
    if "*" in origins:
        raise ConfigError("CORS_ORIGINS must list explicit origins (credentials are used), not *.", variable="CORS_ORIGINS")
    app.add_middleware(
        CORSMiddleware, allow_origins=origins, allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "X-CSRF-Token", "Authorization"], max_age=600,
    )
    app.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_request_body_bytes, media_bytes=max(settings.media_max_bytes, settings.hero_video_max_bytes), video_bytes=settings.hero_video_max_bytes)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if settings.is_production:  # browsers ignore it over plain http; over https it pins the site to https
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        response.headers.setdefault("X-Request-ID", uuid.uuid4().hex[:16])
        if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/docs"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    app.include_router(api_router)

    @app.get("/health", tags=["health"])
    def health() -> dict:
        """Liveness (also at /api/health). No database access and no AI request, so it costs nothing."""
        return {"status": "ok"}

    return app


app = create_app()
