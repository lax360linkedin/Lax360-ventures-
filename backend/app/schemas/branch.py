from __future__ import annotations

import uuid

from pydantic import computed_field

from app.schemas.common import OutModel


class BranchOut(OutModel):
    id: uuid.UUID
    slug: str
    name: str
    city: str
    address: str | None = None
    phone: str | None = None

    @computed_field
    @property
    def address_lines(self) -> list[str]:
        return [line for line in (self.address or "").splitlines() if line.strip()]
