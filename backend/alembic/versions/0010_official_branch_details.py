"""Official branch addresses and phone numbers.

Data only: no table or column changes, no rows added or removed. The three existing branch rows (Salem, Bangalore, Mumbai) get the official
address (newline-separated lines) and phone number supplied by LAX360 Ventures. Contact enquiries and demo requests that point at a branch
keep their link, because the rows are updated in place by slug.

Downgrade restores the values the rows had before this migration (the earlier Salem address; no address or phone for the other two).

Revision ID: 0010
Revises: 0009
"""
import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

OFFICIAL = {
    "salem": ("1st Floor, 16, CPS Tower\nAdvaitha Ashram Road, Fairlands\nSalem, Tamil Nadu – 636004", "+91 95666 79928"),
    "bangalore": ("472/7, 20th L Cross Road\nAVS Layout, Koramangala\nBengaluru, Karnataka – 560034", "+91 95666 79928"),
    "mumbai": ("Level 4, Dynasty Business Park\nAndheri–Kurla Road, A-Wing, J. B. Nagar\nAndheri East, Mumbai, Maharashtra – 400059", "+91 95666 05272"),
}
PREVIOUS = {
    "salem": ("LAX360 Pvt Ltd\n1st Floor, 16, CPS Tower\nAdvaitha Ashram Rd, Fairlands\nSalem, Tamil Nadu 636007", None),
    "bangalore": (None, None),
    "mumbai": (None, None),
}


def _apply(values: dict) -> None:
    branches = sa.table("branches", sa.column("slug", sa.String), sa.column("address", sa.Text), sa.column("phone", sa.String))
    for slug, (address, phone) in values.items():
        op.execute(branches.update().where(branches.c.slug == slug).values(address=address, phone=phone))


def upgrade() -> None:
    _apply(OFFICIAL)


def downgrade() -> None:
    _apply(PREVIOUS)
