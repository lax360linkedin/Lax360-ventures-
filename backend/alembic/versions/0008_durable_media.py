"""Durable media library: files live in object storage (Supabase Storage), the database keeps metadata and the storage reference.

Additive and non-destructive:
- existing media rows keep their bytes in `data` (storage = 'db') and keep working; nothing is deleted or moved;
- `data` becomes nullable (new uploads do not store bytes in the database);
- new columns: storage ('db' | 'local' | 'supabase'), storage_key, bucket, sha256 (also back-filled for existing rows so duplicates are detected), kind.

Revision ID: 0008
Revises: 0007
"""
import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("media_assets", sa.Column("storage", sa.String(10), server_default="db", nullable=False))
    op.add_column("media_assets", sa.Column("storage_key", sa.String(120), nullable=True))
    op.add_column("media_assets", sa.Column("bucket", sa.String(63), nullable=True))
    op.add_column("media_assets", sa.Column("sha256", sa.String(64), nullable=True))
    op.add_column("media_assets", sa.Column("kind", sa.String(12), server_default="image", nullable=False))
    op.alter_column("media_assets", "data", existing_type=sa.LargeBinary(), nullable=True)
    op.execute("UPDATE media_assets SET kind = 'document' WHERE content_type = 'application/pdf'")
    op.execute("UPDATE media_assets SET kind = 'video' WHERE content_type LIKE 'video/%'")
    op.execute("UPDATE media_assets SET sha256 = encode(sha256(data), 'hex') WHERE data IS NOT NULL AND sha256 IS NULL")
    op.create_check_constraint("ck_media_assets_storage", "media_assets", "storage in ('db','local','supabase')")
    op.create_check_constraint("ck_media_assets_kind", "media_assets", "kind in ('image','video','document')")
    op.create_check_constraint("ck_media_assets_has_file", "media_assets", "data IS NOT NULL OR storage_key IS NOT NULL")
    op.create_index("ix_media_assets_sha256", "media_assets", ["sha256"])
    op.create_index("ix_media_assets_kind", "media_assets", ["kind"])


def downgrade() -> None:
    # Only safe while no row lives outside the database; refuse rather than lose files.
    op.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM media_assets WHERE data IS NULL) THEN RAISE EXCEPTION 'media_assets rows exist whose files are in object storage; downgrade would lose them'; END IF; END $$;")
    op.drop_index("ix_media_assets_kind", table_name="media_assets")
    op.drop_index("ix_media_assets_sha256", table_name="media_assets")
    op.drop_constraint("ck_media_assets_has_file", "media_assets", type_="check")
    op.drop_constraint("ck_media_assets_kind", "media_assets", type_="check")
    op.drop_constraint("ck_media_assets_storage", "media_assets", type_="check")
    op.alter_column("media_assets", "data", existing_type=sa.LargeBinary(), nullable=False)
    for col in ("kind", "sha256", "bucket", "storage_key", "storage"):
        op.drop_column("media_assets", col)
