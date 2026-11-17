"""Services & industries carousel: the cards and settings of the auto-scrolling strip below the home header (content items, no schema change).

Seeds the first set of cards (the real services and industries of the website, with their existing pictures and descriptions) and the strip's settings, so the carousel is on the home page straight away
and survives refreshes: everything is ordinary managed content (Admin Panel > Services carousel) from here on. Existing content is never touched; rows that already exist are skipped.

Revision ID: 0020
Revises: 0019
"""
import json
import uuid

import sqlalchemy as sa
from alembic import context, op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None

SETTINGS = {"enabled": True, "eyebrow": "What we do", "title": "Services &", "title_accent": "Industries", "lead": "Software, AI, marketing and training for the businesses we work with. Swipe or drag to explore.",
            "scroll": True, "speed": "normal", "pause_on_hover": True}

# (title, tag, description, link, built-in picture)
CARDS = [('IT & Software Development',
  'Service',
  'Websites, web and mobile apps, CRM and ERP, and business systems built around how your team actually works.',
  '/services/software',
  '/assets/services/software.webp'),
 ('Digital Marketing', 'Service', 'Social media, search and ad campaigns, and content that bring you more of the right customers.', '/services/growth', '/assets/services/marketing.webp'),
 ('AI & Automation', 'Service', 'Chatbots, AI assistants and automated workflows that take repetitive work off your team.', '/services/ai', '/assets/services/ai.webp'),
 ('Education & Training', 'Service', 'Hands-on courses and workshops in IT and AI for students and working professionals.', '/contact?type=course', '/assets/services/education.webp'),
 ('Healthcare',
  'Industry',
  'Digital tools for clinics and hospitals: patients, appointments, records and communication in one connected system.',
  '/industries/healthcare-medical',
  '/assets/industries/healthcare.webp'),
 ('Finance & Business',
  'Industry',
  'Payment, financial management and integration platforms built with secure, well-documented APIs.',
  '/industries/banking-fintech',
  '/assets/industries/finance.webp'),
 ('E-commerce',
  'Industry',
  'Billing, inventory, online stores and customer systems that keep shop floor and web orders in step.',
  '/industries/retail-ecommerce',
  '/assets/industries/retail.webp'),
 ('Mobile & Business Apps',
  'Service',
  'Apps for bookings, field teams, billing and inventory, designed for everyday business use.',
  '/services/mobile',
  '/assets/services/mobile.webp'),
 ('Manufacturing & Industrial',
  'Industry',
  'Production, quality, inventory and maintenance systems that give plants a real-time operational picture.',
  '/industries/manufacturing-industrial',
  '/assets/industries/manufacturing.webp'),
 ('Real Estate & Property',
  'Industry',
  'CRM, listing and booking tools that keep every property enquiry and follow-up on track.',
  '/industries/real-estate-property',
  '/assets/industries/realestate.webp'),
 ('Logistics & Transportation',
  'Industry',
  'Fleet, delivery, warehouse and field-team tools that give operations real-time visibility.',
  '/industries/logistics-transportation',
  '/assets/industries/logistics.webp'),
 ('Hospitality & Tourism',
  'Industry',
  'Hotel, reservation and guest-experience software that keeps bookings and service running smoothly.',
  '/industries/hospitality-tourism',
  '/assets/industries/hospitality.webp')]


def _slug(title):
    import re

    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]


def upgrade() -> None:
    offline = context.is_offline_mode()
    existing = set()
    if not offline:
        existing = {(k, s) for k, s in op.get_bind().execute(sa.text("SELECT kind, slug FROM content_items WHERE kind IN ('service_card', 'service_carousel_page')")).all()}
    rows = []

    def add(kind, slug, title, data, order):
        if (kind, slug) in existing:
            return
        rows.append({"id": uuid.uuid5(uuid.NAMESPACE_URL, f"lax360:content:{kind}:{slug}"), "kind": kind, "slug": slug, "title": title, "data": data if not offline else json.dumps(data), "status": "published", "sort_order": order})

    add("service_carousel_page", "service-carousel", "Services & industries carousel settings", SETTINGS, 0)
    for n, (title, tag, description, link, image) in enumerate(CARDS, start=1):
        add("service_card", _slug(title), title, {"tag": tag, "description": description, "link": link, "link_label": "Explore more", "enabled": True, "builtin_image": image, "image_alt": title}, n * 10)
    if rows:
        table = sa.table("content_items", sa.column("id", sa.Uuid()), sa.column("kind", sa.String()), sa.column("slug", sa.String()), sa.column("title", sa.String()),
                         sa.column("data", sa.JSON() if not offline else sa.String()), sa.column("status", sa.String()), sa.column("sort_order", sa.Integer()))
        op.bulk_insert(table, rows)


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM content_items WHERE kind IN ('service_card', 'service_carousel_page')"))
