"""Lead pipeline for enquiries: fuller status stages and follow-up records.

- Widens the allowed enquiry statuses (new, in_progress [older], contacted, qualified, proposal_sent, negotiation, converted, not_interested, closed). Existing rows keep their status.
- Adds `enquiry_followups` (a call / email / WhatsApp / meeting that happened or is planned, with a summary and a done flag), with row-level security like the other tables.

The structured answers of the new enquiry form (services, budget, timeline, ...) are stored in the existing `contact_enquiries.extra` JSON column, and uploaded
project documents in the existing `media_assets` table (private): no change to those tables.

Downgrade removes the follow-ups table and returns the status check to the earlier five stages (rows in a newer stage are moved to "contacted" / "closed").

Revision ID: 0012
Revises: 0011
"""
import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

NEW = "status in ('new','in_progress','contacted','qualified','proposal_sent','negotiation','converted','not_interested','closed')"
OLD = "status in ('new','in_progress','contacted','converted','closed')"


def upgrade() -> None:
    op.drop_constraint("ck_contact_enquiries_status", "contact_enquiries", type_="check")
    op.create_check_constraint("ck_contact_enquiries_status", "contact_enquiries", NEW)
    op.create_table(
        "enquiry_followups",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("enquiry_id", sa.Uuid(), sa.ForeignKey("contact_enquiries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("author_name", sa.String(120), nullable=False),
        sa.Column("kind", sa.String(12), nullable=False, server_default="call"),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("due_on", sa.Date(), nullable=True),
        sa.Column("done", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("kind in ('call','email','whatsapp','meeting','other')", name="ck_enquiry_followups_kind"),
    )
    op.create_index("ix_enquiry_followups_enquiry_id_created_at", "enquiry_followups", ["enquiry_id", "created_at"])
    op.create_index("ix_enquiry_followups_due_on", "enquiry_followups", ["due_on"])
    op.execute('ALTER TABLE public."enquiry_followups" ENABLE ROW LEVEL SECURITY')
    op.execute(
        """
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON public.enquiry_followups FROM %I', r);
    END IF;
  END LOOP;
END $$;
"""
    )


def downgrade() -> None:
    op.drop_table("enquiry_followups")
    op.execute("UPDATE contact_enquiries SET status = 'contacted' WHERE status IN ('qualified','proposal_sent','negotiation')")
    op.execute("UPDATE contact_enquiries SET status = 'closed' WHERE status = 'not_interested'")
    op.drop_constraint("ck_contact_enquiries_status", "contact_enquiries", type_="check")
    op.create_check_constraint("ck_contact_enquiries_status", "contact_enquiries", OLD)
