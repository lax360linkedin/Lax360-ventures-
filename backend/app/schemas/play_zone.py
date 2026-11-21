from __future__ import annotations

from pydantic import Field

from app.schemas.common import ApiModel


class ProfilePatch(ApiModel):
    nickname: str | None = Field(default=None, max_length=40)
    avatar: str | None = Field(default=None, max_length=32)
    preferences: dict | None = None


class SessionStart(ApiModel):
    game: str = Field(max_length=20)
    level_id: str | None = Field(default=None, max_length=40)
    request_key: str | None = Field(default=None, min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")  # idempotency key: a retried start returns the same run


class SessionComplete(ApiModel):
    result: dict  # the bounded result of the run; its shape depends on the game (see app/play_zone/verify.py)


class ProgressMerge(ApiModel):
    levels: dict = Field(default_factory=dict)
    unlocked: list[str] = Field(default_factory=list, max_length=60)
    best: int | None = Field(default=None, ge=0, le=1_000_000)
    base_version: int | None = Field(default=None, ge=0)  # the version the device last saw: a lower one means another device changed the cloud copy meanwhile
    imported: bool = False  # true for guest progress offered for import: it is kept as UNVERIFIED
