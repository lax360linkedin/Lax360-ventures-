from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from pydantic import Field

from app.models.contact_enquiry import ENQUIRY_STATUSES  # noqa: F401 (documented set)
from app.schemas.common import ApiModel, EmailStr, OneLine

EnquiryStatus = Literal["new", "in_progress", "contacted", "qualified", "proposal_sent", "negotiation", "converted", "not_interested", "closed"]


class EnquiryUpdate(ApiModel):
    status: EnquiryStatus | None = None
    assigned_to: uuid.UUID | None = None  # explicit null un-assigns; omit the field to leave it unchanged


class FollowupCreate(ApiModel):
    kind: Literal["call", "email", "whatsapp", "meeting", "other"] = "call"
    summary: str = Field(min_length=1, max_length=1000)
    due_on: date | None = None
    done: bool = False


class FollowupUpdate(ApiModel):
    done: bool | None = None
    summary: str | None = Field(default=None, min_length=1, max_length=1000)
    due_on: date | None = None


class NoteCreate(ApiModel):
    body: str = Field(min_length=1, max_length=2000)


class ContentCreate(ApiModel):
    title: str = Field(default="", max_length=200)
    data: dict[str, str | bool] = Field(default_factory=dict)
    status: Literal["draft", "published"] = "draft"
    sort_order: int = Field(default=0, ge=0, le=100000)


class ContentOrder(ApiModel):
    ids: list[uuid.UUID] = Field(max_length=500)


class ContentUpdate(ApiModel):
    title: str | None = Field(default=None, max_length=200)
    data: dict[str, str | bool] | None = None
    status: Literal["draft", "published"] | None = None
    sort_order: int | None = Field(default=None, ge=0, le=100000)


class SettingsUpdate(ApiModel):
    values: dict[str, bool | str] = Field(min_length=1, max_length=40)


class StaffCreate(ApiModel):
    email: EmailStr
    full_name: OneLine = Field(min_length=2, max_length=120)
    password: str = Field(min_length=1, max_length=256)
    role: Literal["admin", "super_admin"] = "admin"
    permissions: list[str] = Field(default_factory=list, max_length=20)


class StaffUpdate(ApiModel):
    full_name: OneLine | None = Field(default=None, min_length=2, max_length=120)
    role: Literal["admin", "super_admin"] | None = None
    permissions: list[str] | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class PasswordReset(ApiModel):
    new_password: str = Field(min_length=1, max_length=256)


class MediaUpdate(ApiModel):
    alt_text: str | None = Field(default=None, max_length=200)
    is_public: bool | None = None
