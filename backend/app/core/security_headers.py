"""
Security response headers.

PulseBoard's API is consumed by its own first-party frontends (the
public status page and the admin dashboard), not rendered as HTML by
this service itself -- but the headers below are cheap, broadly
recommended defense-in-depth that costs nothing for a pure JSON API and
meaningfully reduces the blast radius of classes of bugs elsewhere in
the stack (a reflected-content bug, a browser that misidentifies a
response's content type, this API ever being embedded somewhere
unexpected). Applied uniformly to every response via ASGI middleware
rather than per-route, so nothing added later can accidentally ship
without them.
"""

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings

_STATIC_HEADERS: tuple[tuple[bytes, bytes], ...] = (
    # This API returns only JSON -- never let a browser sniff a response
    # body into executing as HTML/JS regardless of what a misconfigured
    # or attacker-influenced Content-Type ends up being.
    (b"x-content-type-options", b"nosniff"),
    # Nothing in this API is meant to be framed. Blocks classic
    # clickjacking against any HTML this API might ever incidentally
    # serve (e.g. the interactive /docs page).
    (b"x-frame-options", b"DENY"),
    # Don't leak the full referring URL (which may contain tokens in
    # query strings, incident IDs, etc.) to third-party origins.
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    # Opt this origin out of browser features it never uses. An explicit
    # empty allowlist is stronger than the browser default.
    (
        b"permissions-policy",
        b"geolocation=(), camera=(), microphone=(), payment=(), usb=()",
    ),
    # This is a JSON API, not a page renderer -- a strict CSP costs
    # nothing here and fully neutralizes any future reflected-HTML edge
    # case (e.g. FastAPI's own /docs and /redoc pages, which do render
    # HTML, still function since they load their assets from the
    # documented CDN over HTTPS-only outbound requests, not inline).
    (
        b"content-security-policy",
        b"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    ),
)


class SecurityHeadersMiddleware:
    """
    Pure-ASGI middleware (not BaseHTTPMiddleware) so it adds negligible
    per-request overhead and works correctly with streaming responses
    (notably the WebSocket endpoint, which this middleware passes through
    untouched -- these headers are meaningless on a `websocket` scope and
    HTTP header injection there would be a protocol violation).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(_STATIC_HEADERS)
                # HSTS only makes sense once the deployment is actually
                # terminating/enforcing HTTPS -- sending it over plain
                # HTTP in local dev would just be noise, and sending it
                # prematurely in a misconfigured deployment that isn't
                # HTTPS-only yet can lock out users. Gated on
                # settings.is_production, which operators are expected to
                # only set once TLS is actually in front of this service.
                if settings.is_production:
                    headers.append(
                        (
                            b"strict-transport-security",
                            b"max-age=63072000; includeSubDomains",
                        )
                    )
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_wrapper)
