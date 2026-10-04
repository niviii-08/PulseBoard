"""
Request logging and request-ID correlation.

Every inbound request gets a unique ID (reused from an incoming
`X-Request-ID` header when the caller/proxy already set one, so a
request can be traced across services in a real deployment). That ID is:

1. Stored in a ContextVar so any log line emitted anywhere during this
   request's handling -- a route handler, a service function, an
   exception log -- can be tagged with it via `RequestIdFilter` without
   having to thread a parameter through every function signature.
2. Echoed back on the response as `X-Request-ID`, so a caller reporting
   "request X failed" can be matched directly to server-side logs.
3. Logged once, at the end of the request, with method, path, status
   code, and duration -- deliberately one line per request rather than
   one at start + one at end, which keeps log volume down and makes
   each line self-contained (no need to correlate a start/end pair to
   know how long a request took).

Query strings are intentionally NOT logged -- they can carry tokens
(e.g. an email-confirmation/unsubscribe token) that shouldn't end up in
log aggregation. Only the path is logged.
"""

import logging
import time
import uuid
from contextvars import ContextVar

from starlette.types import ASGIApp, Message, Receive, Scope, Send

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

access_logger = logging.getLogger("pulseboard.access")


class RequestIdFilter(logging.Filter):
    """
    Attach the current request's ID (from `request_id_var`) to every log
    record as `record.request_id`, so it can be included via a formatter
    without every call site needing to pass it explicitly. Outside of a
    request (startup/shutdown/background tasks not wrapped by the
    middleware), this is just "-".
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class RequestLoggingMiddleware:
    """
    Pure-ASGI (not BaseHTTPMiddleware) for the same reasons
    app/core/security_headers.py uses pure ASGI: negligible per-request
    overhead, and correct behavior for streaming responses and
    WebSocket connections, which this middleware passes through with
    just an ID assigned (no per-message logging -- a long-lived
    WebSocket connection logging one line per frame would be noise, not
    signal; connect/disconnect are already logged by
    app/core/websocket_manager.py).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        incoming_id = headers.get(b"x-request-id")
        request_id = incoming_id.decode("latin-1") if incoming_id else str(uuid.uuid4())
        token = request_id_var.set(request_id)

        if scope["type"] == "websocket":
            try:
                await self.app(scope, receive, send)
            finally:
                request_id_var.reset(token)
            return

        start = time.perf_counter()
        status_code = 0

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers_list = list(message.get("headers", []))
                headers_list.append((b"x-request-id", request_id.encode("latin-1")))
                message = {**message, "headers": headers_list}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            access_logger.info(
                "%s %s -> %d (%.1fms)",
                scope.get("method", "-"),
                scope.get("path", "-"),
                status_code,
                duration_ms,
                extra={
                    "http_method": scope.get("method", "-"),
                    "http_path": scope.get("path", "-"),
                    "http_status": status_code,
                    "duration_ms": round(duration_ms, 1),
                },
            )
            request_id_var.reset(token)
