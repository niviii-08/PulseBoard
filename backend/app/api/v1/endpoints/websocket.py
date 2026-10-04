"""
WS /api/v1/ws/status

The single WebSocket endpoint clients connect to for real-time updates:
service status changes, incident lifecycle events, recovery events, and
anomaly alerts. See app/core/websocket_manager.py for the connection
tracking and Redis relay this endpoint hands off to, and
app/services/realtime_events.py for the event envelope every message on
this socket uses.

## No authentication required

Matches how PulseBoard's public status page will eventually consume this
same feed (see docs/phase8-realtime-updates.md) -- every event payload
is deliberately public-safe by construction (realtime_events.py's module
docstring), so there is nothing this endpoint needs to gate behind a
login. If an admin-only detailed feed is ever needed, it can be added as
a second endpoint (or a token query parameter on this one) without
changing the underlying Redis relay architecture at all.

## Reconnect-friendly behavior

This endpoint holds no per-connection server-side state beyond "is this
socket open" -- there is no session, no sequence number, no "resume from
where you left off." A client that disconnects and reconnects (network
blip, laptop sleep, tab backgrounded and resumed) just becomes a brand
new entry in the ConnectionManager's set; it did not miss anything it
was owed, because nothing is owed -- this is a live broadcast feed, not
a durable message queue. This is a deliberate simplicity tradeoff: a
reconnecting client will naturally want to re-fetch current state via
the normal REST endpoints (GET /services, GET /incidents) on reconnect
to fill the gap of whatever happened while it was disconnected, then
resume receiving live updates from that point forward. A more
sophisticated design (server-side per-client cursors backed by a durable
event log) is real additional infrastructure this phase deliberately
does not build -- see docs/phase8-realtime-updates.md for the reasoning.
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.websocket_manager import manager

logger = logging.getLogger("pulseboard.websocket")

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/status")
async def websocket_status(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            # This endpoint is server -> client broadcast only; it has no
            # client -> server protocol. We still need to await
            # *something* on the socket so the server notices a
            # disconnect (a WebSocket that's never read from never raises
            # WebSocketDisconnect on the server side even after the
            # client goes away) -- receive_text() serves that purpose.
            # Anything a client actually sends is intentionally ignored;
            # a ping/keepalive protocol is the natural place to extend
            # this if one becomes necessary.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket connection ended unexpectedly.")
    finally:
        await manager.disconnect(websocket)
