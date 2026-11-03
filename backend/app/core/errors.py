"""One error envelope for the whole API: {"error": {"code", "message", "fields"?}}."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import exc as sa_exc
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import ConfigError

log = logging.getLogger("app.errors")


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, *, fields: dict[str, str] | None = None, headers: dict[str, str] | None = None, details: dict | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields
        self.headers = headers
        self.details = details  # structured extras for the client (e.g. where a file is used), never secrets


def envelope(code: str, message: str, fields: dict[str, str] | None = None, details: dict | None = None) -> dict:
    body: dict = {"code": code, "message": message}
    if fields:
        body["fields"] = fields
    if details:
        body["details"] = details
    return {"error": body}


def _field_name(loc: tuple) -> str:
    parts = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(parts) or "body"


def install_error_handlers(app: FastAPI, *, expose_hints: bool) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError):
        return JSONResponse(envelope(exc.code, exc.message, exc.fields, exc.details), status_code=exc.status_code, headers=exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        code = {404: "not_found", 405: "method_not_allowed", 413: "payload_too_large"}.get(exc.status_code, "http_error")
        return JSONResponse(envelope(code, str(exc.detail)), status_code=exc.status_code, headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for err in exc.errors():
            fields.setdefault(_field_name(tuple(err.get("loc", ()))), str(err.get("msg", "Invalid value")).removeprefix("Value error, "))
        return JSONResponse(envelope("validation_error", "Please check the highlighted fields.", fields), status_code=422)

    @app.exception_handler(ConfigError)
    async def _config_error(_: Request, exc: ConfigError):
        log.error("Configuration error: %s", exc)
        message = "This feature is not configured on the server yet."
        if expose_hints:  # development only: tell the developer what to set
            message += f" {exc}"
        return JSONResponse(envelope("not_configured", message), status_code=503)

    @app.exception_handler(sa_exc.OperationalError)
    @app.exception_handler(sa_exc.InterfaceError)
    @app.exception_handler(sa_exc.TimeoutError)
    async def _database_unavailable(_: Request, exc: Exception):
        from app.db.url import classify_error

        log.error("Database unavailable: %s", classify_error(exc.orig if getattr(exc, "orig", None) else exc))  # hint only, no host/user/password
        return JSONResponse(envelope("database_unavailable", "The service is temporarily unable to reach its database. Please try again shortly."), status_code=503)

    @app.exception_handler(sa_exc.ProgrammingError)
    async def _programming_error(_: Request, exc: sa_exc.ProgrammingError):
        if getattr(getattr(exc, "orig", None), "sqlstate", None) in ("42P01", "42703"):  # undefined_table / undefined_column (migrations not applied)
            log.error("Database schema is missing or out of date: run `alembic upgrade head` (or apply backend/sql/supabase_schema.sql)")
            message = "The service is not fully set up yet (database schema missing or out of date)."
            if expose_hints:
                message += " Run `alembic upgrade head` in backend/."
            return JSONResponse(envelope("database_not_ready", message), status_code=503)
        log.error("Unhandled database error", exc_info=exc)
        return JSONResponse(envelope("internal_error", "Something went wrong on our side. Please try again."), status_code=500)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        log.error("Unhandled error", exc_info=exc)  # redacted by the logging filter
        return JSONResponse(envelope("internal_error", "Something went wrong on our side. Please try again."), status_code=500)
