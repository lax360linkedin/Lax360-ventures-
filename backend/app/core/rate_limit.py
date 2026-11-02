"""Small in-memory sliding-window rate limiter.

It is per process: with several workers/instances each keeps its own counters, so the effective limit is
(limit x instances). That is acceptable for one small instance; put a shared store (Redis) or a gateway
limit in front before scaling out. Provider-side spending limits remain the real backstop for OpenAI.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.errors import ApiError


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window: int) -> int | None:
        """Record a hit; return seconds to wait if the limit is exceeded, else None."""
        now = time.monotonic()
        with self._lock:
            if len(self._hits) > self.MAX_KEYS:  # drop idle keys so memory cannot grow without bound
                self._prune(now)
            q = self._hits[key]
            while q and q[0] <= now - window:
                q.popleft()
            if len(q) >= limit:
                return max(1, int(q[0] + window - now) + 1)
            q.append(now)
            return None

    MAX_KEYS = 10_000
    _horizon = 3600  # seconds a key may be idle before it is dropped (>= the longest rate-limit window in use)

    def _prune(self, now: float) -> None:
        for key in [k for k, q in self._hits.items() if not q or q[-1] <= now - self._horizon]:
            del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request, settings: Settings) -> str:
    if settings.trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(scope: str, max_attr: str, window_attr: str):
    """Dependency factory: limits by client IP using the named settings."""

    def dependency(request: Request, settings: Settings = Depends(get_settings)) -> None:
        if not settings.rate_limit_enabled:
            return
        wait = limiter.hit(f"{scope}:{client_ip(request, settings)}", getattr(settings, max_attr), getattr(settings, window_attr))
        if wait is not None:
            raise ApiError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", headers={"Retry-After": str(wait)})

    return dependency
