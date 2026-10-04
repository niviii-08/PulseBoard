"""
WebSocket and real-time event tests.

Two tiers:
1. ConnectionManager unit tests -- pure asyncio, fake WebSocket-like
   objects, no real network or Redis involved. Covers connect/broadcast/
   disconnect/multiple-clients/dead-connection cleanup deterministically.
2. Integration tests using starlette.testclient.TestClient's real
   websocket_connect() against the actual app (with its lifespan --
   meaning the real relay background task is running), publishing to the
   real Redis instance and confirming a real message round-trips through
   the whole Celery-shaped-event -> Redis -> WebSocket pipeline. These
   are the "WebSocket tests where practical" the phase asks for -- the
   full end-to-end path was also verified manually against a live
   uvicorn process (see docs/phase8-realtime-updates.md), but automating
   the core round-trip here means it stays verified on every test run,
   not just once by hand.
"""

import asyncio
import json
import uuid

import pytest
import redis.asyncio as redis_lib
from starlette.testclient import TestClient

from app.core.config import settings
from app.core.websocket_manager import EVENTS_CHANNEL, ConnectionManager
from app.main import app
from app.services.realtime_events import EventType, publish_event


class FakeWebSocket:
    """
    A minimal stand-in for fastapi.WebSocket exposing only what
    ConnectionManager actually calls: accept() and send_text(). Lets the
    manager's own logic be tested in complete isolation from any real
    network or ASGI machinery.
    """

    def __init__(self, *, fail_on_send: bool = False):
        self.accepted = False
        self.sent_messages: list[str] = []
        self.fail_on_send = fail_on_send

    async def accept(self):
        self.accepted = True

    async def send_text(self, message: str):
        if self.fail_on_send:
            raise RuntimeError("simulated dead connection")
        self.sent_messages.append(message)


class TestConnectionManager:
    async def test_connect_accepts_and_tracks(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()

        await manager.connect(ws)

        assert ws.accepted is True
        assert manager.connection_count == 1

    async def test_disconnect_removes_connection(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()
        await manager.connect(ws)

        await manager.disconnect(ws)

        assert manager.connection_count == 0

    async def test_disconnecting_unknown_connection_does_not_raise(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()  # never connected
        await manager.disconnect(ws)  # should be a silent no-op
        assert manager.connection_count == 0

    async def test_broadcast_reaches_every_connected_client(self):
        manager = ConnectionManager()
        clients = [FakeWebSocket() for _ in range(5)]
        for ws in clients:
            await manager.connect(ws)

        await manager.broadcast("hello everyone")

        for ws in clients:
            assert ws.sent_messages == ["hello everyone"]

    async def test_broadcast_sends_identical_message_to_all(self):
        manager = ConnectionManager()
        clients = [FakeWebSocket() for _ in range(3)]
        for ws in clients:
            await manager.connect(ws)

        await manager.broadcast("event A")
        await manager.broadcast("event B")

        for ws in clients:
            assert ws.sent_messages == ["event A", "event B"]

    async def test_dead_connection_is_dropped_without_affecting_others(self):
        manager = ConnectionManager()
        healthy_a = FakeWebSocket()
        dead = FakeWebSocket(fail_on_send=True)
        healthy_b = FakeWebSocket()
        for ws in (healthy_a, dead, healthy_b):
            await manager.connect(ws)
        assert manager.connection_count == 3

        await manager.broadcast("still works")

        assert healthy_a.sent_messages == ["still works"]
        assert healthy_b.sent_messages == ["still works"]
        assert manager.connection_count == 2  # dead one was dropped

    async def test_broadcast_with_no_connections_does_not_raise(self):
        manager = ConnectionManager()
        await manager.broadcast("nobody is listening")  # should just no-op


# --- Real-time event envelope ------------------------------------------


class TestRealtimeEventEnvelope:
    async def test_publish_event_builds_consistent_envelope(self):
        published = []

        class FakeRedis:
            async def publish(self, channel, message):
                published.append((channel, message))

        await publish_event(FakeRedis(), EventType.EMERGING_TREND_DETECTED, {"topic_id": "abc"})

        assert len(published) == 1
        channel, message = published[0]
        assert channel == EVENTS_CHANNEL

        envelope = json.loads(message)
        assert envelope["event_type"] == "EMERGING_TREND_DETECTED"
        assert "timestamp" in envelope
        assert envelope["data"] == {"topic_id": "abc"}

    async def test_publish_event_serializes_uuids(self):
        published = []

        class FakeRedis:
            async def publish(self, channel, message):
                published.append(message)

        topic_id = uuid.uuid4()
        await publish_event(
            FakeRedis(), EventType.BRAND_RISK_CHANGED, {"topic_id": topic_id, "score": 4.2}
        )

        envelope = json.loads(published[0])
        assert envelope["data"]["topic_id"] == str(topic_id)
        assert envelope["data"]["score"] == 4.2

    async def test_publish_event_serializes_enums(self):
        published = []

        class FakeRedis:
            async def publish(self, channel, message):
                published.append(message)

        from app.models.social import RiskLevel

        await publish_event(
            FakeRedis(),
            EventType.BRAND_RISK_CHANGED,
            {"risk_level": RiskLevel.CRITICAL},
        )

        envelope = json.loads(published[0])
        assert envelope["data"]["risk_level"] == "CRITICAL"

    async def test_all_required_event_types_exist(self):
        required = {
            "EMERGING_TREND_DETECTED",
            "SENTIMENT_SHIFT_DETECTED",
            "BRAND_RISK_CHANGED",
            "ALERT_CREATED",
            "NEW_HIGH_IMPACT_POST",
        }
        actual = {e.value for e in EventType}
        assert required == actual


# --- Real integration: TestClient WebSocket <- real Redis <- publish_event ---


class TestWebSocketIntegration:
    def test_connect_and_disconnect_cleanly(self):
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws/status") as websocket:
                pass  # connecting and cleanly exiting the context is the test

    def test_receives_a_real_redis_published_event(self):
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws/status") as websocket:

                async def publish_test_event():
                    # Give the relay task's subscription a moment to be
                    # fully established before we publish.
                    await asyncio.sleep(0.3)
                    r = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
                    await publish_event(
                        r,
                        EventType.ALERT_CREATED,
                        {"alert_id": "test-123", "message": "Integration Test Alert"},
                    )
                    await r.aclose()

                asyncio.run(publish_test_event())

                received = websocket.receive_text()
                envelope = json.loads(received)
                assert envelope["event_type"] == "ALERT_CREATED"
                assert envelope["data"]["message"] == "Integration Test Alert"

    def test_two_simultaneous_clients_both_receive_the_broadcast(self):
        with TestClient(app) as client:
            with client.websocket_connect("/api/v1/ws/status") as ws1:
                with client.websocket_connect("/api/v1/ws/status") as ws2:

                    async def publish_test_event():
                        await asyncio.sleep(0.3)
                        r = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
                        await publish_event(
                            r,
                            EventType.NEW_HIGH_IMPACT_POST,
                            {"topic_id": "topic-1", "topic_name": "Multi-client Test"},
                        )
                        await r.aclose()

                    asyncio.run(publish_test_event())

                    msg1 = json.loads(ws1.receive_text())
                    msg2 = json.loads(ws2.receive_text())

                    assert msg1["event_type"] == "NEW_HIGH_IMPACT_POST"
                    assert msg2["event_type"] == "NEW_HIGH_IMPACT_POST"
                    assert msg1["data"]["topic_name"] == "Multi-client Test"
                    assert msg2["data"] == msg1["data"]  # identical payload, not just same type
