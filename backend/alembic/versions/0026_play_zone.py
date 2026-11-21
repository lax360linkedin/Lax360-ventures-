"""Play Zone player ecosystem (new tables only; nothing existing is changed).

Adds: pz_profiles (one per website account), pz_game_sessions (server-issued runs), pz_scores (verified scores), pz_progress (cloud progress), pz_achievement_defs /
pz_player_achievements, pz_challenges / pz_challenge_progress (daily challenges). Every table is keyed to the existing `users` table and deleted with the account.
Row Level Security is switched on without policies, like the other tables: only the backend (a trusted database role) reads and writes them, never the browser.

Revision ID: 0026
Revises: 0025
"""
import sqlalchemy as sa
from alembic import op

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None

TABLES = ("pz_profiles", "pz_game_sessions", "pz_scores", "pz_progress", "pz_achievement_defs", "pz_player_achievements", "pz_challenges", "pz_challenge_progress")
NOW = sa.text("now()")
ACHIEVEMENTS = (
    ("first-steps", "First Steps", "Play your first game in the Play Zone.", None, "footprints", 10),
    ("all-rounder", "All-Rounder", "Play all four games with a signed-in account.", None, "gamepad", 20),
    ("star-collector", "Star Collector", "Collect 100 stars in Catch the Stars.", "catch-the-stars", "star", 30),
    ("cloud-explorer", "Cloud Explorer", "Complete Cloud Kingdom in LAXBOT Jump.", "laxbot-jump", "cloud", 40),
    ("sky-climber", "Sky Climber", "Complete all five LAXBOT Jump worlds.", "laxbot-jump", "mountain", 50),
    ("crystal-gardener", "Crystal Gardener", "Complete the five levels of Crystal Garden in Puzzle Pop.", "puzzle-pop", "flower", 60),
    ("puzzle-master", "Puzzle Master", "Complete 10 Puzzle Pop levels.", "puzzle-pop", "puzzle", 70),
    ("bug-squasher", "Bug Squasher", "Capture 50 bugs in Bug Hunter.", "bug-hunter", "bug", 80),
    ("cyber-defender", "Cyber Defender", "Defeat the Core Corruptor, the final Bug Hunter boss.", "bug-hunter", "shield", 90),
    ("daily-hero", "Daily Hero", "Claim your first daily challenge reward.", None, "calendar", 100),
    ("champion", "Champion", "Reach 2,500 verified overall points.", None, "trophy", 110),
)


def upgrade() -> None:
    op.create_table(
        "pz_profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_pz_profiles_user_id_users"), nullable=False),
        sa.Column("nickname", sa.String(24), nullable=False),
        sa.Column("nickname_key", sa.String(24), nullable=False),
        sa.Column("avatar", sa.String(32), nullable=False, server_default="star-collector"),
        sa.Column("preferences", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("stats", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("games_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("verified_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_played_at", sa.DateTime(timezone=True)),
        sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("moderation_note", sa.String(300)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.UniqueConstraint("user_id", name="uq_pz_profiles_user_id"),
        sa.UniqueConstraint("nickname_key", name="uq_pz_profiles_nickname_key"),
    )
    op.create_index("ix_pz_profiles_verified_points", "pz_profiles", ["verified_points"])
    op.create_table(
        "pz_game_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_pz_game_sessions_user_id_users"), nullable=False),
        sa.Column("game", sa.String(20), nullable=False),
        sa.Column("level_id", sa.String(40), nullable=False, server_default="main"),
        sa.Column("config", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("request_key", sa.String(64)),
        sa.Column("status", sa.String(12), nullable=False, server_default="started"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("client_result", sa.JSON()),
        sa.Column("verdict", sa.String(12)),
        sa.Column("reasons", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.CheckConstraint("status in ('started','completed','rejected','expired')", name="ck_pz_game_sessions_status"),
        sa.UniqueConstraint("user_id", "request_key", name="uq_pz_game_sessions_request"),
    )
    op.create_index("ix_pz_game_sessions_user_game_started", "pz_game_sessions", ["user_id", "game", "started_at"])
    op.create_index("ix_pz_game_sessions_status_expires", "pz_game_sessions", ["status", "expires_at"])
    op.create_table(
        "pz_scores",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("pz_game_sessions.id", ondelete="CASCADE", name="fk_pz_scores_session_id_pz_game_sessions"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_pz_scores_user_id_users"), nullable=False),
        sa.Column("game", sa.String(20), nullable=False),
        sa.Column("level_id", sa.String(40), nullable=False, server_default="main"),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="accepted"),
        sa.Column("flags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("details", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.CheckConstraint("status in ('accepted','flagged','hidden')", name="ck_pz_scores_status"),
        sa.UniqueConstraint("session_id", name="uq_pz_scores_session_id"),
    )
    op.create_index("ix_pz_scores_board", "pz_scores", ["game", "level_id", "status", "created_at"])
    op.create_index("ix_pz_scores_game_score", "pz_scores", ["game", "status", "score"])
    op.create_index("ix_pz_scores_user_game", "pz_scores", ["user_id", "game", "created_at"])
    op.create_table(
        "pz_progress",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_pz_progress_user_id_users"), primary_key=True),
        sa.Column("game", sa.String(20), primary_key=True),
        sa.Column("data", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
    )
    op.create_table(
        "pz_achievement_defs",
        sa.Column("code", sa.String(40), primary_key=True),
        sa.Column("title", sa.String(60), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("game", sa.String(20)),
        sa.Column("icon", sa.String(30), nullable=False, server_default="trophy"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "pz_player_achievements",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_pz_player_achievements_user_id_users"), primary_key=True),
        sa.Column("code", sa.String(40), sa.ForeignKey("pz_achievement_defs.code", ondelete="CASCADE", name="fk_pz_player_achievements_code_pz_achievement_defs"), primary_key=True),
        sa.Column("earned_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("pz_game_sessions.id", ondelete="SET NULL", name="fk_pz_player_achievements_session_id_pz_game_sessions")),
    )
    op.create_table(
        "pz_challenges",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("challenge_date", sa.Date(), nullable=False),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("metric", sa.String(30), nullable=False),
        sa.Column("game", sa.String(20)),
        sa.Column("target", sa.Integer(), nullable=False),
        sa.Column("reward_points", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("challenge_date", "code", name="uq_pz_challenges_day_code"),
    )
    op.create_index("ix_pz_challenges_date", "pz_challenges", ["challenge_date"])
    op.create_table(
        "pz_challenge_progress",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_pz_challenge_progress_user_id_users"), primary_key=True),
        sa.Column("challenge_id", sa.Uuid(), sa.ForeignKey("pz_challenges.id", ondelete="CASCADE", name="fk_pz_challenge_progress_challenge_id_pz_challenges"), primary_key=True),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("games", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("claimed_at", sa.DateTime(timezone=True)),
        sa.Column("reward_points", sa.Integer()),
    )
    table = sa.table("pz_achievement_defs", sa.column("code", sa.String), sa.column("title", sa.String), sa.column("description", sa.String), sa.column("game", sa.String), sa.column("icon", sa.String), sa.column("sort_order", sa.Integer))
    op.bulk_insert(table, [{"code": c, "title": t, "description": d, "game": g, "icon": i, "sort_order": s} for c, t, d, g, i, s in ACHIEVEMENTS])
    for name in TABLES:
        op.execute(f'ALTER TABLE public."{name}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for name in ("pz_challenge_progress", "pz_challenges", "pz_player_achievements", "pz_achievement_defs", "pz_progress", "pz_scores", "pz_game_sessions", "pz_profiles"):
        op.drop_table(name)
