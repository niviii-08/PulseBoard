"""
Real-time event definitions and publishing.

Every event PulseBoard broadcasts -- whether from a Celery ingestion
task or from a FastAPI request handler -- goes through `publish_event`
and lands on a single Redis Pub/Sub channel (`EVENTS_CHANNEL`), wrapped in
the same envelope shape:

    {
        "event_type": "ALERT_CREATED",
        "timestamp": "2026-08-03T12:00:00+00:00",
        "data": { ...event-specific fields... }
    }

## Why one channel, not one channel per event type

The FastAPI WebSocket layer (app/core/websocket_manager.py) needs to
relay every one of these event types to connected clients. Subscribing
to a single channel and dispatching on the `event_type` field inside the
payload is a single Redis subscription per FastAPI process, one relay
loop, and one place event ordering is guaranteed (Redis Pub/Sub preserves
publish order per channel, not across channels). Splitting into five
channels would mean five subscriptions, more moving parts in the relay
task, and no ordering guarantee between e.g. a BRAND_RISK_CHANGED and the
ALERT_CREATED that triggered it. Clients that only care about a subset of
event types filter client-side on `event_type` -- a single `if` in
JavaScript, not a reason to split the channel.

## Why payloads are public-safe by design

The WebSocket endpoint this feeds requires no authentication, matching
the rest of the real-time layer. Every event builder in this module is
written to include only fields that are safe to broadcast to any
connected client -- trend/topic names, scores, and alert messages, never
raw post content, author-identifying fields, or brand configuration.
"""

import enum
import json
import uuid
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as redis

EVENTS_CHANNEL = "pulseboard:events"


class EventType(str, enum.Enum):
    EMERGING_TREND_DETECTED = "EMERGING_TREND_DETECTED"
    SENTIMENT_SHIFT_DETECTED = "SENTIMENT_SHIFT_DETECTED"
    BRAND_RISK_CHANGED = "BRAND_RISK_CHANGED"
    ALERT_CREATED = "ALERT_CREATED"
    NEW_HIGH_IMPACT_POST = "NEW_HIGH_IMPACT_POST"
    
    # PulseBoard Advanced Intelligence Events
    TREND_BREAKOUT = "TREND_BREAKOUT"
    TREND_SCORE_CHANGED = "TREND_SCORE_CHANGED"
    ANOMALY_DETECTED = "ANOMALY_DETECTED"
    NEW_MAJOR_EVENT = "NEW_MAJOR_EVENT"


async def publish_event(
    redis_client: "redis.Redis", event_type: EventType, data: dict[str, Any]
) -> None:
    """
    Builds the standard envelope and publishes it. Never raises: a Redis
    hiccup here should be logged by the caller (each call site already
    wraps this appropriately -- see monitoring_service.py's
    _publish_status_change for the established pattern) and must never be
    allowed to fail an otherwise-successful database operation. This
    function itself stays simple and lets callers decide how to handle
    failures, since the right behavior differs slightly by context
    (Celery task vs. request handler).
    """
    envelope = {
        "event_type": event_type.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": _jsonable(data),
    }
    await redis_client.publish(EVENTS_CHANNEL, json.dumps(envelope))


def _jsonable(data: dict[str, Any]) -> dict[str, Any]:
    """
    Recursively converts UUIDs (and anything else json.dumps can't
    natively handle that shows up in these payloads) to strings, so call
    sites can pass plain UUID objects rather than remembering to
    str()-wrap every id field themselves.
    """
    result: dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, uuid.UUID):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = _jsonable(value)
        elif isinstance(value, list):
            result[key] = [
                str(item) if isinstance(item, uuid.UUID) else item for item in value
            ]
        elif isinstance(value, enum.Enum):
            result[key] = value.value
        else:
            result[key] = value
    return result


async def publish_event_from_task(event_type: EventType, data: dict[str, Any]) -> None:
    """
    Publish variant for Celery-task callers (app/tasks/ingestion_tasks.py,
    via app/services/pipeline.py), which run inside `asyncio.run()` and so
    get a fresh event loop per invocation -- reusing the app-lifetime
    `app.core.redis_client.redis_client` singleton from here would bind it
    to a loop that's about to be torn down (see
    app/core/websocket_manager.py's module docstring for the full
    explanation of why that's unsafe). This opens a short-lived connection,
    publishes, and closes it. Never raises -- a Redis hiccup here should
    not fail an otherwise-successful pipeline run, so failures are logged
    and swallowed.
    """
    import logging

    logger = logging.getLogger("pulseboard.realtime_events")
    from app.core.config import settings

    try:
        client = redis.Redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        try:
            await publish_event(client, event_type, data)
        finally:
            await client.aclose()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to publish %s event: %s", event_type.value, exc)
