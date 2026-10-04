"""
WebSocket connection management and the Redis-to-WebSocket relay.

This is the piece that closes the real-time pipeline:

    Celery monitoring task -> Redis Pub/Sub -> [THIS MODULE] -> connected clients

`ConnectionManager` tracks every currently-connected WebSocket for this
FastAPI process, in memory. `relay_redis_events_to_websockets` is a
single long-lived background task, started once at application startup
(see app/main.py's lifespan), that subscribes to the shared Redis
Pub/Sub channel and re-broadcasts every message it receives to every
connection this process is holding.

## Why one shared Redis connection here is safe, unlike in Celery

Every other module in this codebase that touches Redis or Postgres from
inside a Celery task creates a brand-new connection per task invocation,
because `asyncio.run()` (used to bridge Celery's synchronous task
interface into this codebase's async functions) creates a new event loop
every single call, and asyncpg/redis.asyncio connections are bound to the
loop they were created on (see monitoring_service.py's module docstring
for the full explanation). None of that applies here: uvicorn runs
FastAPI on a single, persistent event loop for the entire lifetime of the
process. This module's Redis subscriber connection is created once, at
startup, on that one loop, and lives exactly as long as the loop does --
there is no repeated `asyncio.run()` and no loop-binding hazard to work
around.

## Why PostgreSQL is never queried here

Every event this relay forwards was already fully computed (uptime
math, incident details, anomaly scores) by whichever code path published
it -- the monitoring worker or a FastAPI request handler. This module's
only job is moving an already-JSON-serialized string from Redis to every
open WebSocket. No connected client, no matter how many are connected,
causes an additional database query -- Redis fan-out is the entire
distribution mechanism, exactly as required.
"""

import asyncio
import logging

import redis.asyncio as redis
from fastapi import WebSocket

from app.core.config import settings
from app.services.realtime_events import EVENTS_CHANNEL

logger = logging.getLogger("pulseboard.websocket")

# If the Redis subscriber connection drops (Redis restart, network blip),
# how long to wait before attempting to resubscribe. This is what makes
# the SERVER side of the pipeline resilient -- distinct from, but just as
# important as, the reconnect-friendly behavior expected of WebSocket
# CLIENTS (see the endpoint docstring in app/api/v1/endpoints/websocket.py).
RECONNECT_DELAY_SECONDS = 3.0


class ConnectionManager:
    """
    Tracks active WebSocket connections for this process and broadcasts
    to all of them. Deliberately simple -- a set plus a lock -- because
    the actual fan-out logic (deciding what to send and when) lives
    entirely in Redis Pub/Sub upstream of this class; this class's only
    job is "who's currently listening" and "send this text to all of
    them, dropping anyone who's gone."
    """

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        logger.info("WebSocket connected (total: %d)", len(self._connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)
        logger.info("WebSocket disconnected (total: %d)", len(self._connections))

    async def broadcast(self, message: str) -> None:
        """
        Sends `message` to every connected client. A send failure on one
        connection (client vanished without a clean close, a slow
        consumer whose socket buffer is full, etc.) is caught and that
        connection is dropped -- it must never take down the broadcast
        loop for every other, healthy connection.
        """
        async with self._lock:
            connections = list(self._connections)

        dead: list[WebSocket] = []
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)

        if dead:
            async with self._lock:
                for connection in dead:
                    self._connections.discard(connection)
            logger.info(
                "Dropped %d dead WebSocket connection(s) during broadcast (total: %d)",
                len(dead),
                len(self._connections),
            )

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Module-level singleton -- one ConnectionManager per FastAPI process,
# shared by the WebSocket endpoint (app/api/v1/endpoints/websocket.py)
# and the relay task below. See docs/phase8-realtime-updates.md for how
# this single-process-in-memory design extends to multiple FastAPI
# instances behind a load balancer.
manager = ConnectionManager()


async def relay_redis_events_to_websockets(connection_manager: ConnectionManager = manager) -> None:
    """
    Runs for the lifetime of the application (started in app/main.py's
    lifespan, cancelled on shutdown). Subscribes to the single shared
    events channel and re-broadcasts every message verbatim -- this
    process does not parse, filter, or transform the payload at all; the
    JSON envelope built by app.services.realtime_events.publish_event is
    exactly what reaches the client.

    Wrapped in an outer retry loop so a Redis restart or network blip
    doesn't permanently kill real-time updates for the life of the
    FastAPI process -- it resubscribes after a short delay instead of
    letting the background task silently die.
    """
    while True:
        redis_client: "redis.Redis | None" = None
        try:
            redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            pubsub = redis_client.pubsub()
            await pubsub.subscribe(EVENTS_CHANNEL)
            logger.info("Subscribed to Redis channel '%s' for WebSocket relay.", EVENTS_CHANNEL)

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                await connection_manager.broadcast(message["data"])

        except asyncio.CancelledError:
            # Expected on application shutdown -- clean up and propagate,
            # do NOT swallow it (that would prevent the app from
            # shutting down promptly).
            raise
        except Exception:
            logger.exception(
                "Redis event relay lost its connection -- retrying in %.0fs.",
                RECONNECT_DELAY_SECONDS,
            )
            await asyncio.sleep(RECONNECT_DELAY_SECONDS)
        finally:
            if redis_client is not None:
                await redis_client.aclose()
