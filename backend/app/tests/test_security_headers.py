"""
Tests for app/core/security_headers.py.

Exercised against a minimal standalone ASGI app (not the real PulseBoard
app, which needs Postgres/Redis to even start) -- this middleware has no
dependency on the rest of the application, so testing it in isolation
keeps this suite fast and DB-independent, matching the style of
test_http_checker.py / test_ssrf.py.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.core.security_headers import SecurityHeadersMiddleware


async def _ok(request):
    return JSONResponse({"ok": True})


def _build_app() -> Starlette:
    app = Starlette(routes=[Route("/ping", _ok)])
    app.add_middleware(SecurityHeadersMiddleware)
    return app


@pytest.fixture
def client():
    transport = ASGITransport(app=_build_app())
    return AsyncClient(transport=transport, base_url="http://test")


class TestSecurityHeaders:
    async def test_content_type_options_present(self, client):
        async with client as c:
            resp = await c.get("/ping")
        assert resp.headers["x-content-type-options"] == "nosniff"

    async def test_frame_options_present(self, client):
        async with client as c:
            resp = await c.get("/ping")
        assert resp.headers["x-frame-options"] == "DENY"

    async def test_referrer_policy_present(self, client):
        async with client as c:
            resp = await c.get("/ping")
        assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"

    async def test_permissions_policy_present(self, client):
        async with client as c:
            resp = await c.get("/ping")
        assert "geolocation=()" in resp.headers["permissions-policy"]

    async def test_content_security_policy_present(self, client):
        async with client as c:
            resp = await c.get("/ping")
        assert "default-src 'none'" in resp.headers["content-security-policy"]

    async def test_hsts_absent_outside_production(self, client, monkeypatch):
        from app.core import config

        monkeypatch.setattr(config.settings, "ENVIRONMENT", "development")
        async with client as c:
            resp = await c.get("/ping")
        assert "strict-transport-security" not in resp.headers

    async def test_hsts_present_in_production(self, client, monkeypatch):
        from app.core import config

        monkeypatch.setattr(config.settings, "ENVIRONMENT", "production")
        async with client as c:
            resp = await c.get("/ping")
        assert "strict-transport-security" in resp.headers
        monkeypatch.setattr(config.settings, "ENVIRONMENT", "development")

    async def test_headers_present_on_error_responses_too(self):
        """
        A 4xx/5xx response is exactly the kind of response most likely
        to reach an unexpected client -- these headers must not be
        skipped just because the handler raised.
        """

        async def _boom(request):
            return JSONResponse({"error": "nope"}, status_code=500)

        app = Starlette(routes=[Route("/boom", _boom)])
        app.add_middleware(SecurityHeadersMiddleware)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            resp = await c.get("/boom")
        assert resp.status_code == 500
        assert resp.headers["x-content-type-options"] == "nosniff"
