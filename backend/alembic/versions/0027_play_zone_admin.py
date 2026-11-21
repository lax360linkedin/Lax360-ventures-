"""Play Zone administration (Milestone 7). Additive only: nothing existing is dropped, renamed or rewritten.

Adds columns to pz_profiles (Play Zone suspension) and pz_achievement_defs (validated rules, reward points, icon), and the tables pz_game_configs, pz_game_config_versions,
pz_settings, pz_moderation_events, pz_challenge_templates (seeded with the five existing daily challenges) and pz_media_links. Row Level Security is enabled on the new tables
without policies, like the others: only the backend's trusted role reads and writes them.

Rollback: `alembic downgrade 0026` removes the new tables and columns (the Milestone 7 configuration, moderation history and suspensions are lost; scores, players, progress and
achievements are untouched).

Revision ID: 0027
Revises: 0026
"""
import sqlalchemy as sa
from alembic import op

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None

NEW_TABLES = ("pz_game_configs", "pz_game_config_versions", "pz_settings", "pz_moderation_events", "pz_challenge_templates", "pz_media_links")
CHALLENGES = (
    ("stars", "Collect {n} stars", "Collect {n} stars in Catch the Stars (verified rounds only).", "stars_collected", "catch-the-stars", [20, 25, 30, 20, 25, 30, 35], 20, 10),
    ("platform", "Finish {n} platform level{s}", "Complete {n} LAXBOT Jump level{s} (verified runs only).", "platform_levels", "laxbot-jump", [1, 1, 1, 1, 1, 2, 2], 20, 20),
    ("puzzle", "Win {n} puzzle level{s}", "Win {n} Puzzle Pop level{s} (verified replays only).", "puzzle_levels", "puzzle-pop", [1, 1, 1, 1, 1, 2, 2], 20, 30),
    ("bugs", "Capture {n} bugs", "Capture {n} bugs in Bug Hunter (verified runs only).", "bugs_captured", "bug-hunter", [15, 12, 15, 18, 15, 20, 20], 20, 40),
    ("two-games", "Play {n} different games", "Finish a verified round in {n} different Play Zone games today.", "distinct_games", None, [2, 2, 2, 2, 2, 3, 3], 30, 50),
)


def _fk(col: str, target: str, name: str, ondelete: str = "SET NULL"):
    return sa.Column(col, sa.Uuid(), sa.ForeignKey(target, ondelete=ondelete, name=name))


def upgrade() -> None:
    op.add_column("pz_profiles", sa.Column("suspended", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("pz_profiles", sa.Column("suspended_at", sa.DateTime(timezone=True)))
    op.add_column("pz_profiles", sa.Column("suspended_reason", sa.String(300)))
    op.add_column("pz_achievement_defs", sa.Column("rule_type", sa.String(30)))
    op.add_column("pz_achievement_defs", sa.Column("rule_params", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
    op.add_column("pz_achievement_defs", sa.Column("reward_points", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("pz_achievement_defs", sa.Column("icon_media_id", sa.Uuid(), sa.ForeignKey("media_assets.id", ondelete="SET NULL", name="fk_pz_achievement_defs_icon_media_id_media_assets")))

    op.create_table(
        "pz_game_configs",
        sa.Column("game", sa.String(20), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("visibility", sa.String(10), nullable=False, server_default="public"),
        sa.Column("maintenance", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title", sa.String(60)),
        sa.Column("short_description", sa.String(200)),
        sa.Column("instructions", sa.Text()),
        _fk("thumbnail_media_id", "media_assets.id", "fk_pz_game_configs_thumbnail_media_id_media_assets"),
        _fk("banner_media_id", "media_assets.id", "fk_pz_game_configs_banner_media_id_media_assets"),
        sa.Column("disabled_levels", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("params", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("config_version", sa.Integer(), nullable=False, server_default="1"),
        _fk("updated_by", "users.id", "fk_pz_game_configs_updated_by_users"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "pz_game_config_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("game", sa.String(20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("params", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        _fk("changed_by", "users.id", "fk_pz_game_config_versions_changed_by_users"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("game", "version", name="uq_pz_game_config_versions_game_version"),
    )
    op.create_table(
        "pz_settings",
        sa.Column("key", sa.String(40), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        _fk("updated_by", "users.id", "fk_pz_settings_updated_by_users"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "pz_moderation_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("target_type", sa.String(10), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        _fk("user_id", "users.id", "fk_pz_moderation_events_user_id_users"),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("reason", sa.String(300), nullable=False),
        _fk("admin_id", "users.id", "fk_pz_moderation_events_admin_id_users"),
        sa.Column("admin_email", sa.String(200), nullable=False),
        sa.Column("detail", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("target_type in ('score','player')", name="ck_pz_moderation_events_target_type"),
    )
    op.create_index("ix_pz_moderation_events_target", "pz_moderation_events", ["target_type", "target_id", "created_at"])
    op.create_index("ix_pz_moderation_events_user", "pz_moderation_events", ["user_id", "created_at"])
    op.create_table(
        "pz_challenge_templates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("metric", sa.String(30), nullable=False),
        sa.Column("game", sa.String(20)),
        sa.Column("targets", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("reward_points", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("starts_on", sa.Date()),
        sa.Column("ends_on", sa.Date()),
        _fk("artwork_media_id", "media_assets.id", "fk_pz_challenge_templates_artwork_media_id_media_assets"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("code", name="uq_pz_challenge_templates_code"),
    )
    op.create_table(
        "pz_media_links",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("media_id", sa.Uuid(), sa.ForeignKey("media_assets.id", ondelete="CASCADE", name="fk_pz_media_links_media_id_media_assets"), nullable=False),
        sa.Column("purpose", sa.String(20), nullable=False),
        sa.Column("game", sa.String(20)),
        sa.Column("label", sa.String(100)),
        _fk("created_by", "users.id", "fk_pz_media_links_created_by_users"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("media_id", name="uq_pz_media_links_media_id"),
        sa.CheckConstraint("purpose in ('game_thumbnail','game_banner','world_preview','achievement_icon','challenge_art','promo')", name="ck_pz_media_links_purpose"),
    )
    op.create_index("ix_pz_media_links_purpose", "pz_media_links", ["purpose"])
    # useful for the admin dashboards and analytics (date-range scans)
    op.create_index("ix_pz_game_sessions_started_at", "pz_game_sessions", ["started_at"])
    op.create_index("ix_pz_scores_created_at", "pz_scores", ["created_at"])
    op.create_index("ix_pz_profiles_created_at", "pz_profiles", ["created_at"])
    op.create_index("ix_pz_player_achievements_earned_at", "pz_player_achievements", ["earned_at"])

    import json
    import uuid

    def q(value) -> str:  # a SQL string literal (the values are fixed constants above; quotes are doubled anyway)
        return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"

    for code, title, desc, metric, game, targets, reward, order in CHALLENGES:  # plain literal SQL so the migration also renders in offline (--sql) mode
        op.execute(f"INSERT INTO pz_challenge_templates (id, code, title, description, metric, game, targets, reward_points, sort_order) VALUES "
                   f"({q(uuid.uuid4())}, {q(code)}, {q(title)}, {q(desc)}, {q(metric)}, {q(game)}, {q(json.dumps(targets))}, {int(reward)}, {int(order)})")
    for name in NEW_TABLES:
        op.execute(f'ALTER TABLE public."{name}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for name in ("ix_pz_player_achievements_earned_at", "ix_pz_profiles_created_at", "ix_pz_scores_created_at", "ix_pz_game_sessions_started_at"):
        op.drop_index(name)
    for name in ("pz_media_links", "pz_challenge_templates", "pz_moderation_events", "pz_settings", "pz_game_config_versions", "pz_game_configs"):
        op.drop_table(name)
    for col in ("icon_media_id", "reward_points", "rule_params", "rule_type"):
        op.drop_column("pz_achievement_defs", col)
    for col in ("suspended_reason", "suspended_at", "suspended"):
        op.drop_column("pz_profiles", col)
