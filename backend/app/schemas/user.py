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
