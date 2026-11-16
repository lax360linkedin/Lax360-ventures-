"""Branch maps: an optional Google Maps embed address per branch (one nullable column), and the Salem branch's map.

`branches.map_embed_url` holds ONLY the https://www.google.com/maps/embed?... address (never HTML): the admin panel accepts a pasted iframe or address and the server extracts and checks it.
Only Salem gets a map here (the address supplied for it); the other branches are given theirs later through the admin panel (Branch locations).

Revision ID: 0016
Revises: 0015
"""
import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None

SALEM = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1380.1767868508273!2d78.14095405285593!3d11.673119895912297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x49584e947d17121d%3A0x4c167403feb05364!2sLax360%20Pvt%20ltd!5e0!3m2!1sen!2sin!4v1794821244657!5m2!1sen!2sin"


def upgrade() -> None:
    op.add_column("branches", sa.Column("map_embed_url", sa.String(1500), nullable=True))
    op.execute(sa.text("UPDATE branches SET map_embed_url = :u WHERE slug = 'salem' AND map_embed_url IS NULL").bindparams(u=SALEM))


def downgrade() -> None:
    op.drop_column("branches", "map_embed_url")
