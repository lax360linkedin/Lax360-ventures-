"""Company name: "LAX360 Ventures" becomes "LAX360 Pvt Ltd" in stored website content.

Data only: no table or column changes. Replaces the old name in the three branch names, in the titles and data of admin-managed content, and in saved website
settings (for example the website name and footer text). Customer enquiries, chat messages and audit logs are NOT touched: they are records of what was said.

Downgrade does nothing (the original wording of each edited row is not kept).

Revision ID: 0013
Revises: 0012
"""
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

OLD, NEW = "LAX360 Ventures", "LAX360 Pvt Ltd"
# "LAX360 Ventures is a brand of LAX360 Pvt Ltd" would now say the company is a brand of itself.
SELF_BRAND = "LAX360 Pvt Ltd is a brand of LAX360 Pvt Ltd"


def upgrade() -> None:
    op.execute(f"UPDATE branches SET name = replace(name, '{OLD}', '{NEW}') WHERE strpos(name, '{OLD}') > 0")
    op.execute(f"UPDATE content_items SET title = replace(title, '{OLD}', '{NEW}') WHERE strpos(title, '{OLD}') > 0")
    op.execute(f"UPDATE content_items SET data = replace(data::text, '{OLD}', '{NEW}')::json WHERE strpos(data::text, '{OLD}') > 0")
    op.execute(f"UPDATE site_settings SET value = replace(value::text, '{OLD}', '{NEW}')::json WHERE strpos(value::text, '{OLD}') > 0")
    op.execute(f"UPDATE content_items SET data = replace(data::text, '{SELF_BRAND}', '{NEW}')::json WHERE strpos(data::text, '{SELF_BRAND}') > 0")
    op.execute(f"UPDATE site_settings SET value = replace(value::text, '{SELF_BRAND}', '{NEW}')::json WHERE strpos(value::text, '{SELF_BRAND}') > 0")


def downgrade() -> None:
    pass
