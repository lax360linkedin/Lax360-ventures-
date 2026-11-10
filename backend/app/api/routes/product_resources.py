"""Downloads attached to a product (demo PDFs, brochures, documentation).

The browser never receives a link to the stored file. It asks this endpoint, which checks that the download is published and, for files marked
"login required", that the visitor is signed in to the website; only then are the bytes sent. The files stay private in the media library.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import optional_user
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.db.session import get_db
from app.models import ContentItem, User
from app.services import media_service, object_storage as store

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/resources/{item_id}/download")
def download(item_id: uuid.UUID, user: User | None = Depends(optional_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> Response:
    item = db.get(ContentItem, item_id)
    if item is None or item.kind != "product_resource" or item.status != "published":
        raise ApiError(404, "not_found", "This file is not available.")
    data = item.data or {}
    product = db.scalar(select(ContentItem).where(ContentItem.kind == "product", ContentItem.slug == data.get("product"), ContentItem.status == "published"))
    if product is None:
        raise ApiError(404, "not_found", "This file is not available.")
    if data.get("requires_login", True) is not False and user is None:
        raise ApiError(401, "login_required", "Please log in to download this file.")
    try:
        asset = media_service.get(db, uuid.UUID(str(data.get("file"))), with_data=True)
    except (ValueError, ApiError):
        raise ApiError(404, "not_found", "This file is not available.") from None
    if asset.storage == "db":
        body = bytes(asset.data) if asset.data is not None else None
    else:
        body = store.read(settings, asset.bucket or settings.media_bucket, asset.storage_key or "", asset.storage)
    if body is None:
        raise ApiError(404, "not_found", "The file is no longer stored. Please contact us and we will send it to you.")
    restricted = data.get("requires_login", True) is not False
    return Response(body, media_type=asset.content_type, headers={
        "Content-Disposition": f'attachment; filename="{asset.filename}"', "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store" if restricted else "public, max-age=300"})
