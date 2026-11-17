"""Products shown as available: every product marked "Coming soon" becomes "Live".

Only the availability status of the product items in the content store changes (`data.status` soon -> live); their text, pictures, links and everything else are left as they are. Products with
another status (beta, in development) are not touched. Nothing is changed on a database that is only being scripted (the exported SQL file starts with no products).

Revision ID: 0021
Revises: 0020
"""
import json

import sqlalchemy as sa
from alembic import context, op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if context.is_offline_mode():
        return
    conn = op.get_bind()
    for item_id, data in conn.execute(sa.text("SELECT id, data FROM content_items WHERE kind = 'product'")).all():
        d = data if isinstance(data, dict) else json.loads(data or "{}")
        if d.get("status") == "soon":
            d["status"] = "live"
            conn.execute(sa.text("UPDATE content_items SET data = CAST(:d AS json), updated_at = now() WHERE id = :i"), {"d": json.dumps(d), "i": item_id})


def downgrade() -> None:
    """The earlier status of each product is not recorded, so nothing is reverted (set a product's status back in the admin panel if needed)."""
