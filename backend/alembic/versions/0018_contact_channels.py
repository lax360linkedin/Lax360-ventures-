"""Social media links and contact details as one managed list (`contact_channels`).

The header, footer, Contact page and the social section used to read several places (website settings, the "Social media links" content items, built-in defaults). They now read this
one table, and each item says where it is shown. The table is filled ONCE from what the website showed until now, so nothing is lost and nothing changes on the website:
  * the social links: the published "Social media links" items when there are any, otherwise the Instagram / LinkedIn / X links (and Facebook / YouTube when set in the settings);
  * the email, the phone numbers (with their branch captions), the WhatsApp number, the second email and the office address from the settings, or the official built-in values.
The old settings and content items are left untouched.

Revision ID: 0018
Revises: 0017
"""
import json
import re
import uuid

import sqlalchemy as sa
from alembic import context, op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None

ALL = ["header", "footer", "contact", "social_band"]
PLACES = ["header", "footer", "contact"]
DEFAULT_SOCIAL = [("instagram", "https://www.instagram.com/lax360pvtltd"), ("linkedin", "https://www.linkedin.com/company/lax360-pvt-ltd"), ("x", "https://x.com/lax360tech")]
LABEL = {"instagram": "Instagram", "facebook": "Facebook", "linkedin": "LinkedIn", "youtube": "YouTube", "x": "X (Twitter)"}
HOST = {"instagram": "instagram.com", "facebook": "facebook.com", "linkedin": "linkedin.com", "youtube": "youtube.com", "x": "x.com"}


def _digits(v):
    return re.sub(r"\D", "", v or "")


def _text(v):
    return re.sub(r"\s+", " ", v.lower()).strip()


def _social_key(platform, url):
    from urllib.parse import urlparse

    p = urlparse(url)
    return f"social:{platform}:{(p.hostname or '').lower().removeprefix('www.')}{p.path.rstrip('/').lower()}"


def upgrade() -> None:
    op.create_table(
        "contact_channels",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("kind", sa.String(10), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("value", sa.String(1000), nullable=False),
        sa.Column("note", sa.String(160)),
        sa.Column("detail", sa.Text()),
        sa.Column("icon", sa.String(30)),
        sa.Column("locations", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("dedupe_key", sa.String(400), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("dedupe_key", name="uq_contact_channels_dedupe_key"),
        sa.CheckConstraint("kind in ('social','contact')", name="kind"),
    )
    op.execute('ALTER TABLE public."contact_channels" ENABLE ROW LEVEL SECURITY')

    settings, cms = {}, []
    if not context.is_offline_mode():  # the exported SQL file (offline) starts from the official built-in values
        conn = op.get_bind()
        for key, value in conn.execute(sa.text("SELECT key, value FROM site_settings")).all():
            settings[key] = value if isinstance(value, str) else (json.loads(value) if isinstance(value, (bytes, bytearray)) else value)
        cms = conn.execute(sa.text("SELECT title, data, sort_order FROM content_items WHERE kind = 'social_link' ORDER BY sort_order, created_at")).all()

    rows, seen, order = [], set(), [0]

    def add(kind, type_, label, value, locations, note=None, active=True, key=None):
        key = key or (f"contact:{type_}:{_digits(value)}" if type_ in ("phone", "whatsapp") else "contact:%s:%s" % (type_, _text(value)))
        if key in seen or not value:
            return
        seen.add(key)
        order[0] += 10
        rows.append({"id": uuid.uuid5(uuid.NAMESPACE_URL, "lax360:contact_channels:" + key), "kind": kind, "type": type_, "label": label, "value": value, "note": note, "locations": list(locations) if not context.is_offline_mode() else json.dumps(locations), "is_active": active, "sort_order": order[0], "dedupe_key": key[:400]})

    # ---- social links ----
    social = []
    if cms:
        for title, data, _ in cms:
            data = data if isinstance(data, dict) else json.loads(data or "{}")
            if data.get("platform") in LABEL and str(data.get("url") or "").startswith("https://"):
                social.append((data["platform"], data["url"], data.get("enabled") is not False))
    else:
        over = {"instagram": settings.get("social_instagram"), "linkedin": settings.get("social_linkedin"), "x": settings.get("social_x"), "facebook": settings.get("social_facebook"), "youtube": settings.get("social_youtube")}
        social = [(p, over.get(p) or url, True) for p, url in DEFAULT_SOCIAL]
        social += [(p, over[p], True) for p in ("facebook", "youtube") if over.get(p)]
    for platform, url, active in social:
        add("social", platform, LABEL[platform], url, ALL, active=active, key=_social_key(platform, url))

    # ---- contact details ----
    email = settings.get("contact_email") or "lax360tech@gmail.com"
    phones = [settings.get("contact_phone_1"), settings.get("contact_phone_2")]
    if not any(phones):
        phones = ["+91 95666 79928", "+91 95666 05272"]
        notes = ["Salem & Bangalore", "Mumbai"]
    else:
        notes = [None, None]
    phones = [(p, notes[n]) for n, p in enumerate(phones) if p]
    # the order the top bar always had: first phone, email, then the rest
    add("contact", "phone", "Phone", phones[0][0], PLACES, note=phones[0][1])
    add("contact", "email", "Email", email, PLACES)
    for phone, note in phones[1:]:
        add("contact", "phone", "Phone", phone, ["footer", "contact"], note=note)
    add("contact", "whatsapp", "WhatsApp", "+" + _digits(settings.get("whatsapp_number") or "919566679928"), PLACES)
    if settings.get("contact_email_2"):
        add("contact", "email", "Email", settings["contact_email_2"], ["contact"], note="Careers")
    if settings.get("contact_address"):
        add("contact", "address", "Office address", str(settings["contact_address"]).strip()[:600], ["contact"])

    if rows:
        table = sa.table("contact_channels", sa.column("id", sa.Uuid()), sa.column("kind", sa.String()), sa.column("type", sa.String()), sa.column("label", sa.String()), sa.column("value", sa.String()),
                         sa.column("note", sa.String()), sa.column("locations", sa.JSON() if not context.is_offline_mode() else sa.String()), sa.column("is_active", sa.Boolean()), sa.column("sort_order", sa.Integer()), sa.column("dedupe_key", sa.String()))
        op.bulk_insert(table, rows)


def downgrade() -> None:
    op.drop_table("contact_channels")
