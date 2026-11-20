"""Translations (admin): the website's texts in each language, edited per language. Needs the website content permission."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.db.session import get_db
from app.models import User
from app.schemas.common import ApiModel
from app.services import audit_service, translation_service as svc

router = APIRouter(prefix="/admin/translations", tags=["admin: translations"])
read, write = permission("content"), permission("content", write=True)


class Item(ApiModel):
    lang: str = Field(max_length=8)
    source: str = Field(max_length=svc.MAX_SOURCE)
    value: str = Field(default="", max_length=svc.MAX_VALUE)  # empty removes the translation


class SaveIn(ApiModel):
    items: list[Item] = Field(min_length=1, max_length=500)


@router.get("")
def list_translations(lang: str = Query(..., max_length=8), _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    """The translations saved in the admin panel for one language, plus the languages and how many each has."""
    return {"lang": lang, "languages": [{"code": c, "name": n} for c, n in svc.LANGUAGES.items()], "counts": svc.counts(db), "strings": svc.strings(db, lang)}


@router.get("/content-strings")
def content_strings(_: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    """The texts of the content managed in the admin panel (articles, products, team members, websites, partners…), so they can be translated here too."""
    return {"strings": svc.content_strings(db)}


@router.put("")
def save(body: SaveIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    result = svc.save_many(db, user, [i.model_dump() for i in body.items])
    audit_service.record(db, user, "translations.save", resource_type="translations", detail={**result, "languages": sorted({i.lang for i in body.items})})
    db.commit()
    return result
