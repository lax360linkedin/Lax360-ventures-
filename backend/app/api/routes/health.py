from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import ConfigError, Settings, get_settings
from app.db.session import get_db

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def liveness() -> dict:
    """Process is up. Does not touch the database."""
    return {"status": "ok"}


@router.get("/ready")
def readiness(settings: Settings = Depends(get_settings)):
    """Database reachability plus which optional features are configured (booleans only; never values)."""
    body = {
        "status": "ok",
        "database": "ok",
        "ai_provider": settings.ai_provider,
        "ai_configured": settings.ai_configured,
        "auth_configured": settings.auth_secret is not None,
    }
    try:
        db: Session = next(get_db())
        try:
            db.execute(text("select 1"))
            body["schema"] = "ok" if db.execute(text("select to_regclass('public.users') is not null")).scalar() else "missing"
            if body["schema"] == "missing":
                body["status"] = "degraded"
        finally:
            db.close()
    except ConfigError:
        body.update(status="degraded", database="not_configured")
        return JSONResponse(body, status_code=503)
    except Exception:  # noqa: BLE001 - never leak driver errors
        body.update(status="degraded", database="unreachable")
        return JSONResponse(body, status_code=503)
    return JSONResponse(body, status_code=200 if body["status"] == "ok" else 503)
