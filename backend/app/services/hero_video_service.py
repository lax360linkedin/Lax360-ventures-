"""Homepage background videos: upload validation, disk storage and the persistent rotation schedule.

Files live on disk (HERO_VIDEO_DIR), never in the database. The schedule is server-side and persistent:

- Slots are counted from an *anchor* (`anchor_start`, always beginning with `anchor_video_id`) and are `slot_days` long (3 by default).
- Slot k plays queue[(base + k) % n]; with repeat off, the last video then keeps playing.
- What is playing is calculated from the saved schedule and the clock, never from when a visitor arrives.
- Every change to the queue (upload, enable/disable, reorder, delete, settings) first notes the slot that is playing and re-anchors on it
  afterwards, so edits can never interrupt a running slot; they only decide what comes after it.
"""

from __future__ import annotations

import asyncio
import os
import struct
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiError
from app.models import HeroVideo, HeroVideoConfig, User

BACKEND = Path(__file__).resolve().parents[2]
VIDEO_EXTENSIONS = {".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm"}
ACCEPTED_DECLARED = {"", "video/mp4", "video/webm", "application/octet-stream"}
MIN_SECONDS, MAX_SECONDS = 1.0, 1800.0
POSTER_MAX_BYTES = 1_048_576
CHUNK = 256 * 1024


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---- storage ------------------------------------------------------------------------------------
def storage_dir(settings: Settings) -> Path:
    path = Path(settings.hero_video_dir)
    path = path if path.is_absolute() else BACKEND / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def file_path(settings: Settings, key: str) -> Path:
    return storage_dir(settings) / key  # keys are generated here (uuid + known extension), never taken from a request


def is_available(settings: Settings, video: HeroVideo) -> bool:
    try:
        return file_path(settings, video.storage_key).is_file()
    except OSError:
        return False


def remove_files(settings: Settings, *keys: str | None) -> None:
    for key in keys:
        if key:
            try:
                file_path(settings, key).unlink(missing_ok=True)
            except OSError:
                pass  # a leftover file is harmless; it is never served without a database row


# ---- validation ---------------------------------------------------------------------------------
def sniff_video(head: bytes) -> str | None:
    """The real type from the first bytes (the extension and the declared type are only hints)."""
    if head[4:8] == b"ftyp" and head[8:12] != b"qt  ":
        return "video/mp4"
    if head[:4] == b"\x1a\x45\xdf\xa3" and b"webm" in head[:64]:
        return "video/webm"
    return None


def sniff_image(head: bytes) -> tuple[str, str] | None:
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


def _boxes(f, start: int, end: int):
    pos = start
    while pos + 8 <= end:
        f.seek(pos)
        header = f.read(8)
        if len(header) < 8:
            return
        size, kind = struct.unpack(">I4s", header)
        header_len = 8
        if size == 1:
            ext = f.read(8)
            if len(ext) < 8:
                return
            size, header_len = struct.unpack(">Q", ext)[0], 16
        elif size == 0:
            size = end - pos
        if size < header_len:
            return
        yield kind, pos + header_len, min(pos + size, end)
        pos += size


def mp4_info(path: Path) -> tuple[float, bool]:
    """(duration seconds, has a video track) read from the MP4 `moov` box; raises ValueError when the file is not a complete MP4."""
    total = path.stat().st_size
    duration, has_video = None, False
    with path.open("rb") as f:
        moov = next(((s, e) for kind, s, e in _boxes(f, 0, total) if kind == b"moov"), None)
        if moov is None:
            raise ValueError("no moov box")
        for kind, s, e in _boxes(f, *moov):
            if kind == b"mvhd":
                f.seek(s)
                body = f.read(min(e - s, 40))
                if body[0] == 1:
                    timescale, length = struct.unpack(">IQ", body[20:32])
                else:
                    timescale, length = struct.unpack(">II", body[12:20])
                duration = length / timescale if timescale else None
            elif kind == b"trak":
                for k2, s2, e2 in _boxes(f, s, e):
                    if k2 != b"mdia":
                        continue
                    for k3, s3, e3 in _boxes(f, s2, e2):
                        if k3 == b"hdlr":
                            f.seek(s3 + 8)
                            has_video = has_video or f.read(4) == b"vide"
    if duration is None:
        raise ValueError("no mvhd box")
    return duration, has_video


def _vint(data: bytes, pos: int, *, keep_marker: bool = False) -> tuple[int, int, bool]:
    first = data[pos]
    length, mask = 1, 0x80
    while length <= 8 and not first & mask:
        length, mask = length + 1, mask >> 1
    if length > 8 or pos + length > len(data):
        raise ValueError("bad vint")
    value = first if keep_marker else first & (mask - 1)
    for b in data[pos + 1:pos + length]:
        value = (value << 8) | b
    unknown = not keep_marker and value == (1 << (7 * length)) - 1
    return value, length, unknown


def webm_duration(head: bytes) -> float | None:
    """Duration from the WebM `Info` element when it sits near the start of the file (it normally does); None when it cannot be read."""
    try:
        pos = 0
        while pos < len(head) - 2:
            ident, l1, _ = _vint(head, pos, keep_marker=True)
            size, l2, unknown = _vint(head, pos + l1)
            body = pos + l1 + l2
            if ident == 0x18538067:  # Segment: look inside
                pos = body
            elif ident == 0x1549A966:  # Info
                scale, duration, p, end = 1_000_000, None, body, min(body + size, len(head))
                while p < end:
                    cid, c1, _ = _vint(head, p, keep_marker=True)
                    csize, c2, _ = _vint(head, p + c1)
                    data = head[p + c1 + c2:p + c1 + c2 + csize]
                    if cid == 0x2AD7B1:
                        scale = int.from_bytes(data, "big")
                    elif cid == 0x4489 and csize in (4, 8):
                        duration = struct.unpack(">f" if csize == 4 else ">d", data)[0]
                    p += c1 + c2 + csize
                return duration * scale / 1e9 if duration is not None else None
            elif unknown:
                return None
            else:
                pos = body + size
    except (ValueError, IndexError, struct.error):
        return None
    return None


@dataclass
class Received:
    tmp: Path
    size: int
    head: bytes


async def receive(request: Request, settings: Settings, max_bytes: int) -> Received:
    """Stream the request body to a temporary file inside the storage folder, refusing anything over `max_bytes`."""
    tmp = storage_dir(settings) / f".{uuid.uuid4().hex}.part"
    size, head = 0, b""
    try:
        with tmp.open("wb") as f:
            async for chunk in request.stream():
                if not chunk:
                    continue
                size += len(chunk)
                if size > max_bytes:
                    raise ApiError(413, "payload_too_large", f"The file is too large (max {max_bytes // 1024 // 1024 or 1} MB).")
                if len(head) < 65536:
                    head += chunk[: 65536 - len(head)]
                f.write(chunk)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise
    if size == 0:
        tmp.unlink(missing_ok=True)
        raise ApiError(422, "validation_error", "The file is empty.")
    return Received(tmp, size, head)


@dataclass
class Checked:
    ctype: str
    ext: str
    duration: float | None


def check_video(received: Received, filename: str, declared_type: str | None) -> Checked:
    ext = os.path.splitext(filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1])[1].lower()
    if ext not in VIDEO_EXTENSIONS:
        raise ApiError(415, "unsupported_media", "Unsupported file type. Upload an MP4 (H.264) or WebM video.")
    if (declared_type or "").split(";")[0].strip().lower() not in ACCEPTED_DECLARED:
        raise ApiError(415, "unsupported_media", "Unsupported file type. Upload an MP4 (H.264) or WebM video.")
    real = sniff_video(received.head)
    if real is None or real != VIDEO_EXTENSIONS[ext]:
        raise ApiError(415, "unsupported_media", "This does not look like a valid MP4 or WebM video (the file content does not match its type).")
    duration: float | None
    if real == "video/mp4":
        try:
            duration, has_video = mp4_info(received.tmp)
        except (ValueError, struct.error, OSError):
            raise ApiError(422, "invalid_video", "This MP4 is incomplete or damaged, so it cannot be played. Export it again and re-upload.") from None
        if not has_video:
            raise ApiError(422, "invalid_video", "This file has no video track.")
    else:
        duration = webm_duration(received.head)
    if duration is not None and not (MIN_SECONDS <= duration <= MAX_SECONDS):
        raise ApiError(422, "invalid_video", f"The video must be between {int(MIN_SECONDS)} second and {int(MAX_SECONDS // 60)} minutes long (this one is {duration:.0f}s).")
    return Checked(real, ".webm" if real == "video/webm" else ".mp4", duration)


def commit_file(settings: Settings, tmp: Path, ext: str) -> str:
    key = f"{uuid.uuid4().hex}{ext}"
    os.replace(tmp, file_path(settings, key))
    return key


# ---- schedule ------------------------------------------------------------------------------------
def tz_of(settings: Settings) -> ZoneInfo:
    try:
        return ZoneInfo(settings.app_timezone)
    except ZoneInfoNotFoundError:
        return ZoneInfo("Asia/Kolkata")


def local_midnight(settings: Settings, when: datetime | date) -> datetime:
    zone = tz_of(settings)
    day = when.astimezone(zone).date() if isinstance(when, datetime) else when
    return datetime(day.year, day.month, day.day, tzinfo=zone).astimezone(timezone.utc)


def slot_length(cfg: HeroVideoConfig, settings: Settings) -> timedelta:
    if settings.hero_video_slot_seconds:
        return timedelta(seconds=settings.hero_video_slot_seconds)  # development/test override
    return timedelta(days=cfg.slot_days)


def get_config(db: Session, settings: Settings, now: datetime | None = None) -> HeroVideoConfig:
    cfg = db.get(HeroVideoConfig, 1)
    if cfg is None:
        cfg = HeroVideoConfig(id=1, start_at=local_midnight(settings, now or now_utc()), slot_days=3, repeat=True)
        db.add(cfg)
        db.flush()
    return cfg


def queue(db: Session, settings: Settings) -> list[HeroVideo]:
    """Videos that may play: switched on and with their file present, in queue order."""
    rows = db.scalars(select(HeroVideo).where(HeroVideo.is_active.is_(True)).order_by(HeroVideo.position, HeroVideo.created_at))
    return [v for v in rows if is_available(settings, v)]


@dataclass
class Slot:
    video: HeroVideo
    start: datetime
    end: datetime | None  # None = no later slot (repeat off and this is the last video: it keeps playing)


@dataclass
class Resolution:
    now: datetime
    queue: list[HeroVideo]
    slot: timedelta
    current: Slot | None = None
    upcoming: list[Slot] = field(default_factory=list)

    @property
    def next(self) -> Slot | None:
        nxt = self.upcoming[0] if self.upcoming else None
        return nxt if nxt and (self.current is None or nxt.video.id != self.current.video.id) else None

    def windows(self) -> dict[uuid.UUID, Slot]:
        """The current or soonest slot of every queued video."""
        found: dict[uuid.UUID, Slot] = {}
        for s in ([self.current] if self.current else []) + self.upcoming:
            found.setdefault(s.video.id, s)
        return found


def resolve(db: Session, settings: Settings, now: datetime | None = None) -> Resolution:
    now = now or now_utc()
    cfg = get_config(db, settings, now)
    q = queue(db, settings)
    slot = slot_length(cfg, settings)
    res = Resolution(now, q, slot)
    if not q:
        return res
    n = len(q)
    origin = cfg.anchor_start or cfg.start_at
    base = 0
    if cfg.anchor_video_id is not None:
        ids = [v.id for v in q]
        if cfg.anchor_video_id in ids:
            base = ids.index(cfg.anchor_video_id)
        else:  # the anchor video is switched off / missing: carry on with the next one in queue order
            anchor = db.get(HeroVideo, cfg.anchor_video_id)
            if anchor is not None:
                after = [i for i, v in enumerate(q) if (v.position, v.created_at) > (anchor.position, anchor.created_at)]
                base = after[0] if after else 0

    def at(j: int) -> Slot:
        idx = (base + j) % n if cfg.repeat else min(base + j, n - 1)
        last = not cfg.repeat and base + j >= n - 1
        return Slot(q[idx], origin + j * slot, None if last else origin + (j + 1) * slot)

    if now < origin:
        res.upcoming = [at(j) for j in range(n)]
        return res
    k = int((now - origin) // slot)
    res.current = at(k)
    if res.current.end is not None:
        res.upcoming = []
        for j in range(k + 1, k + 1 + n):
            s = at(j)
            res.upcoming.append(s)
            if s.end is None:
                break
    return res


@dataclass
class Snapshot:
    queue_ids: list[uuid.UUID]
    current_id: uuid.UUID | None
    current_start: datetime | None


def snapshot(db: Session, settings: Settings, now: datetime | None = None) -> Snapshot:
    """Note what is playing BEFORE a change, so the change cannot interrupt it."""
    res = resolve(db, settings, now)
    return Snapshot([v.id for v in res.queue], res.current.video.id if res.current else None, res.current.start if res.current else None)


def reanchor(db: Session, settings: Settings, snap: Snapshot, now: datetime | None = None) -> None:
    """After a change: keep the slot that was playing, and let the new queue decide what follows it."""
    now = now or now_utc()
    db.flush()
    cfg = get_config(db, settings, now)
    q = queue(db, settings)
    if not q:
        cfg.anchor_video_id, cfg.anchor_start = None, None
        return
    ids = [v.id for v in q]
    if snap.current_id is None:  # nothing was playing (empty queue, or before the start date): begin with the first video
        cfg.anchor_video_id, cfg.anchor_start = ids[0], max(cfg.start_at, local_midnight(settings, now))
        return
    if snap.current_id in ids:
        new = snap.current_id
    else:  # the playing video was switched off or deleted: the next one in the old queue takes the rest of the slot
        old = snap.queue_ids
        start = old.index(snap.current_id) if snap.current_id in old else -1
        ordered = old[start + 1:] + old[:start + 1] if start >= 0 else old
        new = next((i for i in ordered if i in ids), ids[0])
    cfg.anchor_video_id, cfg.anchor_start = new, snap.current_start


def next_position(db: Session) -> int:
    return (db.scalar(select(func.max(HeroVideo.position))) or 0) + 1


def renumber(db: Session) -> None:
    for i, v in enumerate(db.scalars(select(HeroVideo).order_by(HeroVideo.position, HeroVideo.created_at)), start=1):
        v.position = i


def get(db: Session, video_id: uuid.UUID) -> HeroVideo:
    video = db.get(HeroVideo, video_id)
    if video is None:
        raise ApiError(404, "not_found", "Video not found.")
    return video


def create(db: Session, settings: Settings, user: User, *, title: str, original_name: str, key: str, checked: Checked, size: int) -> HeroVideo:
    snap = snapshot(db, settings)
    video = HeroVideo(title=title, original_name=original_name[:200], storage_key=key, content_type=checked.ctype, size_bytes=size,
                      duration_seconds=checked.duration, is_active=True, position=next_position(db), uploaded_by=user.id)
    db.add(video)
    reanchor(db, settings, snap)
    return video


def set_order(db: Session, settings: Settings, ids: list[uuid.UUID]) -> None:
    videos = {v.id: v for v in db.scalars(select(HeroVideo))}
    if sorted(map(str, ids)) != sorted(map(str, videos)):
        raise ApiError(409, "stale_list", "The list changed since you loaded it. Reload the page and try again.")
    snap = snapshot(db, settings)
    for i, vid in enumerate(ids, start=1):
        videos[vid].position = i
    reanchor(db, settings, snap)


def set_active(db: Session, settings: Settings, video: HeroVideo, active: bool) -> None:
    snap = snapshot(db, settings)
    video.is_active = active
    reanchor(db, settings, snap)


def delete(db: Session, settings: Settings, video: HeroVideo) -> tuple[str, str | None]:
    snap = snapshot(db, settings)
    keys = (video.storage_key, video.poster_key)
    db.delete(video)
    db.flush()
    renumber(db)
    reanchor(db, settings, snap)
    return keys


def update_schedule(db: Session, settings: Settings, user: User, *, start_date: date | None, slot_days: int, repeat: bool, now: datetime | None = None) -> HeroVideoConfig:
    now = now or now_utc()
    snap = snapshot(db, settings, now)
    cfg = get_config(db, settings, now)
    new_start = local_midnight(settings, start_date) if start_date else cfg.start_at
    restart = new_start != cfg.start_at
    cfg.slot_days, cfg.repeat, cfg.start_at, cfg.updated_by = slot_days, repeat, new_start, user.id
    if restart:  # an explicit new start date restarts the rotation from the first video in the queue
        q = queue(db, settings)
        cfg.anchor_video_id, cfg.anchor_start = (q[0].id, new_start) if q else (None, None)
    else:
        reanchor(db, settings, snap, now)
    return cfg
