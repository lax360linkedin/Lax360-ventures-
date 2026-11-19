"""Website translations (new table, nothing existing is changed).

`translations` holds the texts an administrator translates in the admin panel (Translations): one row per language and English text. The website ships with its own dictionaries; these rows are added on
top of them, and a text with no translation is shown in English.

Revision ID: 0024
Revises: 0023
"""
import sqlalchemy as sa
from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "translations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("lang", sa.String(8), nullable=False),
        sa.Column("source_hash", sa.String(64), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_translations_updated_by_users")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("lang", "source_hash", name="uq_translations_lang_source_hash"),
    )
    op.execute('ALTER TABLE public."translations" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    op.drop_table("translations")
