from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel, EmailStr, OneLine, OptionalText, OutModel


class DemoRequestCreate(ApiModel):
    name: OneLine = Field(min_length=2, max_length=120)
    email: EmailStr
    company: OptionalText = Field(default=None, max_length=160)
    preferred_date: date | None = None  # range-checked in the service (needs "today")
    interest: OptionalText = Field(default=None, max_length=80)
    branch_id: uuid.UUID | None = None  # verified against the branches table
    message: OptionalText = Field(default=None, max_length=1000)


class DemoRequestOut(OutModel):
    id: uuid.UUID
    name: str
    email: str
    company: str | None
    preferred_date: date | None
    interest: str | None
    branch_id: uuid.UUID | None
    branch_city: str | None = None
    message: str | None
    status: str
    created_at: datetime


class AdminDemoRequestOut(DemoRequestOut):
    user_id: uuid.UUID | None


class DemoStatusUpdate(ApiModel):
    status: Literal["pending", "contacted", "confirmed", "cancelled"]
