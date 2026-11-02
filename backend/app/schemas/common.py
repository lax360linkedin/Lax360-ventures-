from __future__ import annotations

from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr


def _clean(v: str) -> str:
    return " ".join(v.split()) if "\n" not in v else v.strip()


def _clean_optional(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None


# Collapse stray whitespace in single-line text; keep line breaks in free text.
OneLine = Annotated[str, AfterValidator(lambda v: " ".join(v.split()))]
OptionalText = Annotated[str | None, AfterValidator(_clean_optional)]


class ApiModel(BaseModel):
    """Base for request bodies: unknown fields are rejected so typos and role/id injection fail loudly."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OutModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


__all__ = ["ApiModel", "EmailStr", "OneLine", "OptionalText", "OutModel"]
