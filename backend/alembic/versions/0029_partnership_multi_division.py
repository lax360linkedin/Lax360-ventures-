"""Partnership applications: several business divisions per application.

Adds `divisions` (JSON list), `all_divisions` and `other_interest` to pt_applications and widens `division` to 40 characters (administrator-created divisions can have longer names).
Nothing is dropped or rewritten: existing rows keep their `division`, and `divisions` is back-filled from it so every record shows its division in the new form too.

Rollback: `alembic downgrade 0028` removes the three new columns (the multi-division selections are lost; `division` is kept and still holds the primary division).

Revision ID: 0029
Revises: 0028
"""
import sqlalchemy as sa
from alembic import context, op

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("pt_applications") as t:
        t.alter_column("division", existing_type=sa.String(20), type_=sa.String(40), existing_nullable=False)
        t.add_column(sa.Column("divisions", sa.JSON(), nullable=False, server_default=sa.text("'[]'")))
        t.add_column(sa.Column("all_divisions", sa.Boolean(), nullable=False, server_default="false"))
        t.add_column(sa.Column("other_interest", sa.String(300)))
    if context.is_offline_mode():  # generating the SQL file (scripts/export_sql.py): there are no rows to read, so back-fill with one statement
        op.execute("update pt_applications set divisions = json_build_array(division)")
        return
    bind = op.get_bind()
    rows = bind.execute(sa.text("select id, division from pt_applications")).all()
    for rid, division in rows:
        bind.execute(sa.text("update pt_applications set divisions = :d where id = :i").bindparams(sa.bindparam("d", type_=sa.JSON()), sa.bindparam("i")), {"d": [division], "i": rid})


def downgrade() -> None:
    with op.batch_alter_table("pt_applications") as t:
        t.drop_column("other_interest")
        t.drop_column("all_divisions")
        t.drop_column("divisions")
