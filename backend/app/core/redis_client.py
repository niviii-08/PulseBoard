"""
Redis client configuration.

This phase only wires up connectivity for the health check. Pub/Sub
publishers/subscribers, caching helpers, and rate-limit counters are
introduced in later phases (real-time layer, hardening).

A single shared `redis.asyncio.Redis` client is created lazily and reused
across the app's lifetime (connection pooling is handled internally by
redis-py), then closed on application shutdown in main.py's lifespan.
"""

import logging

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger("pulseboard.redis")

redis_client: Redis = Redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)


async def check_redis_connection() -> bool:
    """
    Lightweight connectivity probe used by the health endpoint.
    Never raises — callers should treat any exception as "unhealthy".
    """
    try:
        pong = await redis_client.ping()
        return bool(pong)
    except RedisError as exc:
        logger.warning("Redis health check failed: %s", exc)
        return False
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis health check failed unexpectedly: %s", exc)
        return False


async def close_redis_connection() -> None:
    """Called during application shutdown to release the connection pool."""
    await redis_client.aclose()
