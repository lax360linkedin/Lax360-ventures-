from __future__ import annotations

from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPk


class ContactChannel(UUIDPk, Timestamps, Base):
    """One social media link (`kind='social'`) or contact detail (`kind='contact'`) of the website, with the places it is shown (`locations`).

    The header, footer, Contact page and the social section all read this one table (migration 0018 filled it from the previous settings), so changing a row changes every place at once.
    `dedupe_key` is a normalised form of the value: it keeps the same profile / number / address from being added twice."""

    __tablename__ = "contact_channels"

    owner_type: Mapped[str] = mapped_column(String(10), default="global", server_default="global")  # global (LAX360) | branch | partner: each owner has its own, independent list
    owner_ref: Mapped[str | None] = mapped_column(String(120))  # the branch's slug or the partner's slug (None for the global list)
    kind: Mapped[str] = mapped_column(String(10))  # social | contact
    type: Mapped[str] = mapped_column(String(20))  # social: a platform key (instagram, ..., custom); contact: phone, whatsapp, email, address, branch, enquiry, other
    label: Mapped[str] = mapped_column(String(120))
    value: Mapped[str] = mapped_column(String(1000))  # URL / phone number / email / address text
    note: Mapped[str | None] = mapped_column(String(160))  # a short caption, e.g. "Salem & Bangalore"
    detail: Mapped[str | None] = mapped_column(Text)  # extra lines, e.g. the address of a branch contact
    icon: Mapped[str | None] = mapped_column(String(30))  # only for a custom platform / other link: one of the generic icons
    locations: Mapped[list] = mapped_column(JSON, default=list)  # subset of header | footer | contact | social_band
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    dedupe_key: Mapped[str] = mapped_column(String(400), unique=True)
