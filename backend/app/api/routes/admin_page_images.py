"""Page-wise image management (see services/page_images_service.py): list every picture of the website by page, put a new one in a slot, or take one out."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import Field
from sqlalchemy.orm import Session

from app.api.deps import staff_user, staff_user_csrf
from app.core.errors import ApiError
from app.db.session import get_db
from app.models import User
from app.schemas.common import ApiModel
from app.services import audit_service, page_images_service as svc

router = APIRouter(prefix="/admin/page-images", tags=["admin: page images"])


class SlotChange(ApiModel):
    item_id: uuid.UUID | None = None  # a content item ...
    setting: str | None = None  # ... or one of the image settings (logo, favicon, sharing image)
    image_key: str | None = Field(default=None, max_length=110)  # ... or one of the website's built-in pictures (its path)
    action: str = Field(default="replace", max_length=20)  # for a built-in picture: replace | restore_previous | restore_original
    field: str = Field(default="image", max_length=60)
    asset_id: uuid.UUID | None = None  # the uploaded picture to use; null removes the picture


@router.get("")
def pages(user: User = Depends(staff_user), db: Session = Depends(get_db)) -> dict:
    data = svc.listing(db, user)
    if not data["pages"]:
        raise ApiError(403, "forbidden", "You do not have permission for this action.")
    return data


@router.put("/slot")
def change_slot(body: SlotChange, user: User = Depends(staff_user_csrf), db: Session = Depends(get_db)) -> dict:
    if body.image_key:
        changed = svc.set_image(db, user, key=body.image_key, asset_id=body.asset_id, action=body.action)
        audit_service.record(db, user, "content.image", resource_type="site_image", detail=changed)
    else:
        changed = svc.set_slot(db, user, item_id=body.item_id, setting=body.setting, field=body.field, asset_id=body.asset_id)
        audit_service.record(db, user, "content.image", resource_type=changed.get("kind", "settings"), detail={**changed, "action": "replace" if body.asset_id else "remove"})
    db.commit()
    return {"ok": True, **changed}
