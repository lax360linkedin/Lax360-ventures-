"""Remove CAD (civil / mechanical) content: LAX360 does not currently provide CAD services.

Data only: no table or column changes. Deletes admin-managed content rows that describe CAD services (service categories, services, projects,
industries and team members that mention CAD or belong to the removed CAD & Engineering division / CAD team group). Contact enquiries already
received keep their stored enquiry type.

Downgrade does nothing (the removed rows cannot be reconstructed).

Revision ID: 0011
Revises: 0010
"""
import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


REWORDED = [  # the two seeded company FAQ answers keep their meaning without the CAD wording
    ("AI solutions, digital marketing and CAD engineering work", "AI solutions and digital marketing work"),
    (", digital marketing, and CAD drafting and modelling for civil and mechanical work.", " and digital marketing."),
]


def upgrade() -> None:
    bind = op.get_bind()
    for old, new in REWORDED:
        bind.execute(sa.text("UPDATE content_items SET data = replace(data::text, :old, :new)::json WHERE kind = 'faq' AND data::text LIKE :like"),
                     {"old": old, "new": new, "like": f"%{old}%"})
    bind.execute(sa.text(
        r"DELETE FROM content_items WHERE "
        r"(title ~* '\mcad\M' OR data::text ~* '\mcad\M' OR data::text ~* '(division|group).: ?.(engineering|cad)' "
        r"OR title ~* '(civil|mechanical) (cad|engineering)') "
        r"AND kind IN ('service_category','service','project','team_member','article','faq','about_block','about_section')"
    ))


def downgrade() -> None:
    pass
