from __future__ import annotations

from pydantic import Field

from app.schemas.common import ApiModel, EmailStr, OneLine, OutModel
from app.schemas.user import UserOut


class LoginRequest(ApiModel):
    """`email` carries the email address OR the username (the field name is kept so existing clients keep working)."""

    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class AdminLoginRequest(LoginRequest):
    """Company-admin login. `issue_token` asks for the session token in the response too (only used as a fallback when the browser blocks the cookie)."""

    issue_token: bool = False


class RegisterRequest(ApiModel):
    """Public sign-up. There is deliberately no role field (the schema rejects unknown fields): everyone who registers is a customer."""

    full_name: OneLine = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class SessionOut(OutModel):
    user: UserOut
    csrf_token: str
