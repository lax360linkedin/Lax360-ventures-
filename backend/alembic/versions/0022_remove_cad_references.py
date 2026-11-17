"""Remove CAD & Engineering references from the content store.

LAX360 Pvt Ltd does not offer CAD services, so: the "CAD & Engineering" card of the home page carousel is deleted, and the CAD wording is taken out of the CADPOINT website entry's description (the
partner and its link are unchanged: only the sentences that listed CAD / engineering courses). Nothing else is touched; rows or text that are not there are skipped.

Revision ID: 0022
Revises: 0021
"""
import json

import sqlalchemy as sa
from alembic import context, op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None

EDITS = {
    "overview": [("multimedia, engineering and more", "multimedia and more")],
    "modules": [("Multimedia & Design, CADD Engineering and Automation & RPA", "Multimedia & Design and Automation & RPA")],
}


def upgrade() -> None:
    if context.is_offline_mode():
        return
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM content_items WHERE kind = 'service_card' AND slug = 'cad-engineering'"))
    for item_id, data in conn.execute(sa.text("SELECT id, data FROM content_items WHERE kind = 'website' AND slug = 'cadpoint'")).all():
        d = data if isinstance(data, dict) else json.loads(data or "{}")
        changed = False
        for field, pairs in EDITS.items():
            for old, new in pairs:
                if isinstance(d.get(field), str) and old in d[field]:
                    d[field] = d[field].replace(old, new)
                    changed = True
        if changed:
            conn.execute(sa.text("UPDATE content_items SET data = CAST(:d AS json), updated_at = now() WHERE id = :i"), {"d": json.dumps(d), "i": item_id})


def downgrade() -> None:
    """Deleted wording is not restored."""
