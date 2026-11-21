"""Play Zone: player profiles, server-issued game sessions, verified scores, cloud progress, achievements and daily challenges.

Everything hangs off the EXISTING website account (`users.id`): there is no separate player login. A profile is created the first time a signed-in customer opens the Play Zone.
Scores are only ever written by the server after it has verified a finished game session (see app/play_zone/verify.py); the browser can never insert a score directly.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPk

GAMES = ("catch-the-stars", "laxbot-jump", "puzzle-pop", "bug-hunter")


class PlayerProfile(UUIDPk, Timestamps, Base):
    """One per website account. `id` is the public Player ID; the nickname and avatar are the only identity shown on leaderboards (never the name, e-mail or phone)."""

    __tablename__ = "pz_profiles"
    __table_args__ = (Index("ix_pz_profiles_verified_points", "verified_points"),)

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    nickname: Mapped[str] = mapped_column(String(24))
    nickname_key: Mapped[str] = mapped_column(String(24), unique=True)  # lower-cased: nicknames are unique ignoring case
    avatar: Mapped[str] = mapped_column(String(32), default="star-collector", server_default="star-collector")
    preferences: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # sound / graphics choices, synced between devices
    stats: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # lifetime counters used by achievements (stars collected, bugs captured, ...)
    games_played: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    verified_points: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # the overall (normalised) points, refreshed whenever a score is accepted
    last_played_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")  # moderation: removes the player from public boards (Milestone 7 manages it)
    moderation_note: Mapped[str | None] = mapped_column(String(300))
    suspended: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")  # Play Zone participation only: the website account itself is never touched
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    suspended_reason: Mapped[str | None] = mapped_column(String(300))


class GameSession(UUIDPk, Base):
    """A game run issued by the server. It records WHAT the player was allowed to play (game, level, seed) and WHEN, so a result can only be submitted once, for that run,
    and is checked against the real elapsed time. Rejected and flagged runs are kept for moderation."""

    __tablename__ = "pz_game_sessions"
    __table_args__ = (
        CheckConstraint("status in ('started','completed','rejected','expired')", name="status"),
        UniqueConstraint("user_id", "request_key", name="request"),
        Index("ix_pz_game_sessions_user_game_started", "user_id", "game", "started_at"),
        Index("ix_pz_game_sessions_status_expires", "status", "expires_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    game: Mapped[str] = mapped_column(String(20))
    level_id: Mapped[str] = mapped_column(String(40), default="main", server_default="main")
    config: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # what the server permitted: the Puzzle Pop seed, the move limit, ...
    request_key: Mapped[str | None] = mapped_column(String(64))  # idempotency key of the "start" request: a retry returns the same session
    status: Mapped[str] = mapped_column(String(12), default="started", server_default="started")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)  # server-measured: completion time minus start time
    client_result: Mapped[dict | None] = mapped_column(JSON)  # the (bounded) result as the browser sent it, kept for audits
    verdict: Mapped[str | None] = mapped_column(String(12))  # accepted | flagged | rejected
    reasons: Mapped[list] = mapped_column(JSON, default=list, server_default=text("'[]'"))  # why it was flagged or rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VerifiedScore(UUIDPk, Base):
    """A score the server accepted. `score` is what the SERVER computed from the verified result, never the number the browser claimed."""

    __tablename__ = "pz_scores"
    __table_args__ = (
        CheckConstraint("status in ('accepted','flagged','hidden')", name="status"),
        Index("ix_pz_scores_board", "game", "level_id", "status", "created_at"),
        Index("ix_pz_scores_game_score", "game", "status", "score"),
        Index("ix_pz_scores_user_game", "user_id", "game", "created_at"),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pz_game_sessions.id", ondelete="CASCADE"), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    game: Mapped[str] = mapped_column(String(20))
    level_id: Mapped[str] = mapped_column(String(40), default="main", server_default="main")
    score: Mapped[int] = mapped_column(Integer)
    points: Mapped[int] = mapped_column(Integer)  # the normalised points of this result (see app/play_zone/scoring.py)
    status: Mapped[str] = mapped_column(String(10), default="accepted", server_default="accepted")  # flagged scores stay off the public boards until a moderator clears them
    flags: Mapped[list] = mapped_column(JSON, default=list, server_default=text("'[]'"))
    details: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GameProgress(Base):
    """Cloud progress of one player in one game: completed levels, stars, unlocked worlds. `version` goes up with every change, so two devices can detect a conflict."""

    __tablename__ = "pz_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    game: Mapped[str] = mapped_column(String(20), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AchievementDef(Base):
    __tablename__ = "pz_achievement_defs"

    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(200))
    game: Mapped[str | None] = mapped_column(String(20))
    icon: Mapped[str] = mapped_column(String(30), default="trophy", server_default="trophy")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    # Admin-defined achievements use a predefined, validated rule (never code or SQL); the built-in ones (rule_type NULL) are evaluated by app/play_zone/service.py.
    rule_type: Mapped[str | None] = mapped_column(String(30))
    rule_params: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))
    reward_points: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    icon_media_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("media_assets.id", ondelete="SET NULL"))


class PlayerAchievement(Base):
    __tablename__ = "pz_player_achievements"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    code: Mapped[str] = mapped_column(String(40), ForeignKey("pz_achievement_defs.code", ondelete="CASCADE"), primary_key=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    session_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("pz_game_sessions.id", ondelete="SET NULL"))


class DailyChallenge(UUIDPk, Base):
    """A challenge of one day (generated by the server from its templates the first time the day is requested). The day runs in the Play Zone timezone."""

    __tablename__ = "pz_challenges"
    __table_args__ = (UniqueConstraint("challenge_date", "code", name="day_code"), Index("ix_pz_challenges_date", "challenge_date"))

    challenge_date: Mapped[date] = mapped_column(Date)
    code: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(200))
    metric: Mapped[str] = mapped_column(String(30))
    game: Mapped[str | None] = mapped_column(String(20))
    target: Mapped[int] = mapped_column(Integer)
    reward_points: Mapped[int] = mapped_column(Integer)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ChallengeProgress(Base):
    __tablename__ = "pz_challenge_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    challenge_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pz_challenges.id", ondelete="CASCADE"), primary_key=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    games: Mapped[list] = mapped_column(JSON, default=list, server_default=text("'[]'"))  # games played today (for the "play two different games" challenge)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reward_points: Mapped[int | None] = mapped_column(Integer)  # recorded when claimed


class GameConfig(Base):
    """What an administrator controls per game. `config_version` goes up with every change of the gameplay profile (`params`); each game session records the version it was started under."""

    __tablename__ = "pz_game_configs"

    game: Mapped[str] = mapped_column(String(20), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    visibility: Mapped[str] = mapped_column(String(10), default="public", server_default="public")  # public | hidden (hidden games are not listed in the lobby)
    maintenance: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    featured: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    title: Mapped[str | None] = mapped_column(String(60))
    short_description: Mapped[str | None] = mapped_column(String(200))
    instructions: Mapped[str | None] = mapped_column(Text)
    thumbnail_media_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("media_assets.id", ondelete="SET NULL"))
    banner_media_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("media_assets.id", ondelete="SET NULL"))
    disabled_levels: Mapped[list] = mapped_column(JSON, default=list, server_default=text("'[]'"))
    params: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))
    config_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GameConfigVersion(UUIDPk, Base):
    """The history of a game's gameplay profile: a session started under version N can always be checked against what version N allowed."""

    __tablename__ = "pz_game_config_versions"
    __table_args__ = (UniqueConstraint("game", "version", name="game_version"),)

    game: Mapped[str] = mapped_column(String(20))
    version: Mapped[int] = mapped_column(Integer)
    params: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))
    changed_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlaySetting(Base):
    """Global Play Zone settings (key/value, validated on write; never secrets)."""

    __tablename__ = "pz_settings"

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("'{}'"))  # {"v": <value>}
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ModerationEvent(UUIDPk, Base):
    """Moderation history of scores and players: who did what, why, and when. Rows are only ever added."""

    __tablename__ = "pz_moderation_events"
    __table_args__ = (
        CheckConstraint("target_type in ('score','player')", name="target_type"),
        Index("ix_pz_moderation_events_target", "target_type", "target_id", "created_at"),
        Index("ix_pz_moderation_events_user", "user_id", "created_at"),
    )

    target_type: Mapped[str] = mapped_column(String(10))
    target_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))  # the player concerned
    action: Mapped[str] = mapped_column(String(20))  # invalidate | restore | approve | suspend | unsuspend
    reason: Mapped[str] = mapped_column(String(300))
    admin_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    admin_email: Mapped[str] = mapped_column(String(200))
    detail: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChallengeTemplate(UUIDPk, Base):
    """The recipe of a daily challenge. The server turns every active template into that day's challenge the first time the day is requested; a generated challenge is a snapshot
    (editing a template never changes challenges that already exist, so players' progress stays valid)."""

    __tablename__ = "pz_challenge_templates"

    code: Mapped[str] = mapped_column(String(40), unique=True)
    title: Mapped[str] = mapped_column(String(80))  # may contain {n} (the target) and {s} (plural s)
    description: Mapped[str] = mapped_column(String(200))
    metric: Mapped[str] = mapped_column(String(30))
    game: Mapped[str | None] = mapped_column(String(20))
    targets: Mapped[list] = mapped_column(JSON, default=list, server_default=text("'[]'"))  # one target per weekday (Monday first)
    reward_points: Mapped[int] = mapped_column(Integer, default=20, server_default="20")
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)
    artwork_media_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("media_assets.id", ondelete="SET NULL"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MediaLink(UUIDPk, Base):
    """Marks a media-library file as Play Zone media (the file itself lives in the existing durable media storage; this table only classifies it)."""

    __tablename__ = "pz_media_links"
    __table_args__ = (CheckConstraint("purpose in ('game_thumbnail','game_banner','world_preview','achievement_icon','challenge_art','promo')", name="purpose"), Index("ix_pz_media_links_purpose", "purpose"))

    media_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("media_assets.id", ondelete="CASCADE"), unique=True)
    purpose: Mapped[str] = mapped_column(String(20))
    game: Mapped[str | None] = mapped_column(String(20))
    label: Mapped[str | None] = mapped_column(String(100))
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


__all__ = ["ChallengeTemplate", "GameConfig", "GameConfigVersion", "MediaLink", "ModerationEvent", "PlaySetting","AchievementDef", "ChallengeProgress", "DailyChallenge", "GAMES", "GameProgress", "GameSession", "PlayerAchievement", "PlayerProfile", "VerifiedScore", "Text"]
