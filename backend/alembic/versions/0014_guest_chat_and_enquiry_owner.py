"""Guest chat limit and enquiry ownership (additive, nullable columns only).

- chat_sessions.guest_key / ip_hash: who a guest conversation belongs to (HMAC digests, never the raw cookie id or IP address), so the "3 free messages" rule is enforced by the
  server and cannot be reset by dropping the conversation id.
- contact_enquiries.user_id: the signed-in customer who sent an enquiry (NULL for visitors), so a customer can track their own enquiries and an administrator can see a
  customer's history. Nothing is matched by e-mail address (an address is not proof of identity).

Revision ID: 0014
Revises: 0013
"""
import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_sessions", sa.Column("guest_key", sa.String(64), nullable=True))
    op.add_column("chat_sessions", sa.Column("ip_hash", sa.String(64), nullable=True))
    op.create_index("ix_chat_sessions_guest_key", "chat_sessions", ["guest_key"])
    op.create_index("ix_chat_sessions_ip_hash_created_at", "chat_sessions", ["ip_hash", "created_at"])
    op.add_column("contact_enquiries", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_contact_enquiries_user_id_users", "contact_enquiries", "users", ["user_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_contact_enquiries_user_id", "contact_enquiries", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_contact_enquiries_user_id", table_name="contact_enquiries")
    op.drop_constraint("fk_contact_enquiries_user_id_users", "contact_enquiries", type_="foreignkey")
    op.drop_column("contact_enquiries", "user_id")
    op.drop_index("ix_chat_sessions_ip_hash_created_at", table_name="chat_sessions")
    op.drop_index("ix_chat_sessions_guest_key", table_name="chat_sessions")
    op.drop_column("chat_sessions", "ip_hash")
    op.drop_column("chat_sessions", "guest_key")
