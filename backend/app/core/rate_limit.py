"""
Redis-backed fixed-window rate limiting.

This is the "rate-limit counters" piece core/redis_client.py's module
docstring flagged as deferred to a later hardening phase -- this is that
phase. It exists specifically to protect the unauthenticated public
status-page endpoints (app/api/v1/endpoints/status_public.py): anything
with no auth in front of it is reachable by anyone, including scripts,
so it needs its own abuse protection rather than relying on
get_current_user the way every other route in this codebase does.

Design: a simple fixed-window counter per (scope, client key, window
bucket) in Redis, using INCR + EXPIRE. This is deliberately NOT a
sliding-window or token-bucket algorithm -- fixed-window allows a burst
of up to 2x the limit right at a window boundary, which is a real and
well-known limitation, but it's O(1) (one INCR, no sorted sets or Lua
scripts), trivially correct, and that boundary-burst edge case doesn't
matter for what this protects (spam signups and casual scraping, not a
security-critical limit). See docs/ for the sliding-window alternative
if this ever needs tightening.

Fails OPEN, not closed: if Redis is unreachable, requests are allowed
through rather than the public status page (or subscribe form) going
down because the rate limiter's own dependency is unavailable. A status
page that fails closed when Redis hiccups would defeat its own purpose
-- the page exists so people can check "is it down" even when other
infrastructure is having a bad day.
"""

import logging
import time

from fastapi import Request
from redis.exceptions import RedisError
from starlette import status as http_status

from app.core.exceptions import PulseBoardError
from app.core.config import settings
from app.core.redis_client import redis_client

logger = logging.getLogger("pulseboard.rate_limit")


class RateLimitExceededError(PulseBoardError):
    status_code = http_status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "RATE_LIMIT_EXCEEDED"


def _client_key(request: Request) -> str:
    """
    Best-effort client identity for anonymous requests.

    Only trusts X-Forwarded-For when settings.TRUST_PROXY_HEADERS is
    explicitly enabled for this deployment (true when this process sits
    behind a reverse proxy/load balancer that itself sets/overwrites the
    header -- see docker-compose.yml and .env.example). When that isn't
    the case, trusting a client-supplied header would let any caller set
    X-Forwarded-For to a fresh random value on every request and get a
    brand new rate-limit bucket each time, completely defeating the
    limiter. With the flag off (the safe default), the connection's own
    peer address is used instead, which a client cannot spoof.

    Even when trusted, this is IP-based and not perfect (shared NATs/
    offices share one bucket, a determined abuser can rotate IPs) --
    adequate for "stop casual spam and scraping," not a substitute for a
    WAF.
    """
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limiter(*, times: int, seconds: int, scope: str):
    """
    Returns a FastAPI dependency enforcing at most `times` requests per
    `seconds` per client, per `scope`. `scope` namespaces the Redis keys
    so e.g. the subscribe-form limiter and the read-endpoint limiter
    never share a counter even if called by the same client in the same
    window.

    Usage: `Depends(rate_limiter(times=5, seconds=3600, scope="subscribe"))`
    """

    async def dependency(request: Request) -> None:
        client_key = _client_key(request)
        window = int(time.time() // seconds)
        redis_key = f"ratelimit:{scope}:{client_key}:{window}"

        try:
            count = await redis_client.incr(redis_key)
            if count == 1:
                # Only the request that created the counter sets its
                # expiry -- avoids re-extending the window (and thus the
                # ban) on every subsequent request in it.
                await redis_client.expire(redis_key, seconds)
        except RedisError as exc:
            logger.warning("Rate limiter unavailable (scope=%s), failing open: %s", scope, exc)
            return

        if count > times:
            raise RateLimitExceededError(
                "Too many requests. Please try again shortly.",
                details={"scope": scope, "limit": times, "window_seconds": seconds},
            )

    return dependency


async def check_rate_limit(*, key: str, times: int, seconds: int, scope: str) -> None:
    """
    Same fixed-window INCR+EXPIRE algorithm as `rate_limiter`, exposed as
    a plain function rather than a FastAPI dependency, for the one case
    that needs a limit keyed on something other than "the caller's IP
    address per scope" -- specifically, per-*account* login throttling
    (see app/api/v1/endpoints/auth.py), which must key on the submitted
    email so that an attacker spraying guesses for one victim account
    across many source IPs (defeating any IP-keyed limiter) is still
    caught. Also fails open on a Redis error, for the same reason
    `rate_limiter`'s dependency does.
    """
    window = int(time.time() // seconds)
    redis_key = f"ratelimit:{scope}:{key}:{window}"

    try:
        count = await redis_client.incr(redis_key)
        if count == 1:
            await redis_client.expire(redis_key, seconds)
    except RedisError as exc:
        logger.warning("Rate limiter unavailable (scope=%s), failing open: %s", scope, exc)
        return

    if count > times:
        raise RateLimitExceededError(
            "Too many requests. Please try again shortly.",
            details={"scope": scope, "limit": times, "window_seconds": seconds},
        )
