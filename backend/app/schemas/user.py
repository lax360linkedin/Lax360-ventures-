from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import ApiModel, OneLine, OutModel


class UserOut(OutModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str
    created_at: datetime


class ProfileUpdate(ApiModel):
    """The only profile fields a user may change. Email, role and status are deliberately not here."""

    full_name: OneLine = Field(min_length=2, max_length=120)


class PasswordChange(ApiModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=1, max_length=256)


class ProfileOut(OutModel):
    mobile: str | None = None
    category: str | None = None
    institution: str | None = None
    course: str | None = None
    department: str | None = None
    study_year: str | None = None
    company: str | None = None
    job_role: str | None = None
    industry: str | None = None
    experience_years: int | None = None
    other_details: str | None = None
    purposes: list[str] = []
    purpose_note: str | None = None
