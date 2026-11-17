"""Carousel cards: wording that does not repeat the Services overview cards.

The home page shows the services twice (the "Services & industries" carousel and the Services overview), and four carousel cards used the very same sentences as the overview cards. This gives those
five carousel cards their own short wording (same meaning, no new claims). Only the description of a seeded card changes; a card an administrator has since edited is left alone.

Revision ID: 0023
Revises: 0022
"""
import json

import sqlalchemy as sa
from alembic import context, op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None

# slug: (the wording seeded by migration 0020, the new wording)
SWAPS = {'it-software-development': ('Custom software, websites, web and mobile apps, CRM and ERP, business systems and e-commerce.', 'Websites, web and mobile apps, CRM and ERP, and business systems built around how your team actually works.'), 'digital-marketing': ('Social media, Meta and Google Ads, SEO, landing pages, content and marketing strategy.', 'Social media, search and ad campaigns, and content that bring you more of the right customers.'), 'ai-automation': ('AI applications, chatbots, AI agents, RAG solutions, process automation and AI consulting.', 'Chatbots, AI assistants and automated workflows that take repetitive work off your team.'), 'mobile-business-apps': ('Booking, field-staff, location tracking, billing and inventory apps, and custom business mobile apps.', 'Apps for bookings, field teams, billing and inventory, designed for everyday business use.'), 'education-training': ('Courses and workshops for students and professionals.', 'Hands-on courses and workshops in IT and AI for students and working professionals.')}


def upgrade() -> None:
    if context.is_offline_mode():
        return
    conn = op.get_bind()
    for slug, (old, new) in SWAPS.items():
        row = conn.execute(sa.text("SELECT id, data FROM content_items WHERE kind = 'service_card' AND slug = :s"), {"s": slug}).first()
        if row is None:
            continue
        d = row[1] if isinstance(row[1], dict) else json.loads(row[1] or "{}")
        if d.get("description") == old:
            d["description"] = new
            conn.execute(sa.text("UPDATE content_items SET data = CAST(:d AS json), updated_at = now() WHERE id = :i"), {"d": json.dumps(d), "i": row[0]})


def downgrade() -> None:
    """The earlier wording is not restored."""
