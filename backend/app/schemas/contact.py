from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.common import ApiModel, EmailStr, OneLine, OptionalText, OutModel

# Mirrors `enquiryTypes` in src/data/navigation.js.
ENQUIRY_TYPES = {
    "project": "Software project",
    "ai": "AI consultation",
    "website-app": "Website or app",
    "marketing": "Digital marketing",
    "course": "Course enquiry",
    "workshop": "College workshop",
    "partnership": "Partnership",
    "career": "Careers",
    "quote": "Quote request",
    "general": "Something else",
    "partner-franchise": "Partnership: Franchise",
    "partner-business": "Partnership: Business & sales partner",
    "partner-authorised": "Partnership: Authorised business partner",
    "partner-technology": "Partnership: Technology partner",
    "partner-reseller": "Partnership: Software reseller",
    "partner-education": "Partnership: Education partner",
    "partner-associate": "Partnership: Business associate",
    "partner-implementation": "Partnership: Implementation partner",
    "partner-other": "Partnership: Other collaboration",
}
EnquiryType = Literal["project", "ai", "website-app", "marketing", "course", "workshop", "partnership", "career", "quote", "general", "partner-franchise", "partner-business", "partner-authorised", "partner-technology", "partner-reseller", "partner-education", "partner-associate", "partner-implementation", "partner-other"]
_PHONE = re.compile(r"^\+?[0-9][0-9\s().-]{6,19}$")


class ContactCreate(ApiModel):
    name: OneLine = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: OptionalText = Field(default=None, max_length=24)
    company: OptionalText = Field(default=None, max_length=160)
    enquiry_type: EnquiryType = "general"
    message: str = Field(min_length=10, max_length=2000)
    branch_id: uuid.UUID | None = None
    extra: dict[str, str] = Field(default_factory=dict)
    attachments: list[uuid.UUID] = Field(default_factory=list, max_length=3)  # files uploaded first through POST /api/contact/attachments
    consent: bool
    source: OptionalText = Field(default=None, max_length=30)
    website: str = Field(default="", max_length=200)  # honeypot: real visitors never fill it

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not _PHONE.match(v):
            raise ValueError("Enter a valid phone number.")
        return re.sub(r"[\s().-]", "", v)

    @field_validator("extra")
    @classmethod
    def _extra(cls, v: dict[str, str]) -> dict[str, str]:
        if len(v) > 40:
            raise ValueError("Too many additional fields.")
        out = {}
        for key, value in v.items():
            if len(key) > 40 or len(value) > 2000:
                raise ValueError("Additional field is too long.")
            if value.strip():
                out[key] = value.strip()
        return out

    @field_validator("consent")
    @classmethod
    def _consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Please agree so we can respond to your enquiry.")
        return v


class ContactReceipt(OutModel):
    id: uuid.UUID | None = None
    status: str = "received"
    duplicate: bool = False


class AdminContactOut(OutModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    company: str | None
    enquiry_type: str
    subject: str
    message: str
    extra: dict | None
    branch_id: uuid.UUID | None
    status: str
    created_at: datetime


class ContactStatusUpdate(ApiModel):
    status: Literal["new", "read", "replied", "closed", "spam"]
