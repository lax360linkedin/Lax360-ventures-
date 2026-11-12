from __future__ import annotations

from typing import Literal

from pydantic import Field, field_validator, model_validator

from app import user_catalog

from app.schemas.common import ApiModel, EmailStr, OneLine, OptionalText, OutModel
from app.schemas.user import UserOut


class LoginRequest(ApiModel):
    """`email` carries the email address OR the username (the field name is kept so existing clients keep working)."""

    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class AdminLoginRequest(LoginRequest):
    """Company-admin login. `issue_token` asks for the session token in the response too (only used as a fallback when the browser blocks the cookie)."""

    issue_token: bool = False


class ProfileFields(ApiModel):
    """The registration details, validated by category: a student gives institution / course / department / year, a working professional gives company / role / industry (+ optional years),
    anyone else gives nothing extra. Fields that do not belong to the chosen category are refused, not silently stored."""

    mobile: str = Field(min_length=1, max_length=30)
    category: Literal["student", "professional", "other"]
    institution: OptionalText = Field(default=None, max_length=160)
    course: OptionalText = Field(default=None, max_length=120)
    department: OptionalText = Field(default=None, max_length=120)
    study_year: OptionalText = Field(default=None, max_length=20)
    company: OptionalText = Field(default=None, max_length=160)
    job_role: OptionalText = Field(default=None, max_length=120)
    industry: OptionalText = Field(default=None, max_length=120)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    other_details: OptionalText = Field(default=None, max_length=300)
    purposes: list[str] = Field(min_length=1, max_length=len(user_catalog.PURPOSES))
    purpose_note: OptionalText = Field(default=None, max_length=500)

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        clean = user_catalog.normalize_mobile(v)
        if clean is None:
            raise ValueError("Enter a valid mobile number (10 to 15 digits, for example +91 98765 43210).")
        return clean

    @field_validator("purposes")
    @classmethod
    def _purposes(cls, v: list[str]) -> list[str]:
        unknown = [p for p in v if p not in user_catalog.PURPOSES]
        if unknown:
            raise ValueError("Choose from the listed purposes.")
        return list(dict.fromkeys(v))

    @field_validator("study_year")
    @classmethod
    def _year(cls, v: str | None) -> str | None:
        if v is not None and v not in user_catalog.STUDY_YEARS:
            raise ValueError("Choose your current year of study.")
        return v

    @model_validator(mode="after")
    def _by_category(self):
        need = {"student": {"institution": "Enter your college or institution.", "course": "Enter your course or degree.", "department": "Enter your department or specialisation.", "study_year": "Choose your current year of study."},
                "professional": {"company": "Enter your company name.", "job_role": "Enter your job role or designation.", "industry": "Enter your industry or business sector."},
                "other": {}}[self.category]
        errors = {f: m for f, m in need.items() if not getattr(self, f)}
        foreign = {"student": ("company", "job_role", "industry", "experience_years", "other_details"), "professional": ("institution", "course", "department", "study_year", "other_details"),
                   "other": ("institution", "course", "department", "study_year", "company", "job_role", "industry", "experience_years")}[self.category]
        for f in foreign:
            if getattr(self, f) not in (None, ""):
                errors[f] = "This does not apply to the category you chose."
        if errors:
            from pydantic_core import PydanticCustomError

            raise PydanticCustomError("profile", "; ".join(errors.values()), {"fields": errors})
        return self


class RegisterRequest(ProfileFields):
    """Public sign-up. There is deliberately no role field (the schema rejects unknown fields): everyone who registers is a customer."""

    full_name: OneLine = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class ForgotPasswordRequest(ApiModel):
    email: EmailStr


class ResetPasswordRequest(ApiModel):
    token: str = Field(min_length=20, max_length=300)
    new_password: str = Field(min_length=1, max_length=256)


class SessionOut(OutModel):
    user: UserOut
    csrf_token: str
