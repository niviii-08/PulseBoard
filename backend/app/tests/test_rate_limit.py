"""
Tests for app/core/rate_limit.py.

Uses a trivial in-memory fake standing in for the Redis client (same
style as test_notification_dispatch.py's `_FakeRealtimeRedis`) so this
suite is fast and has no real Redis dependency. Covers three things:
1. The INCR+EXPIRE counting/limit logic itself (via check_rate_limit).
2. That X-Forwarded-For is only trusted when TRUST_PROXY_HEADERS is on
   -- the fix for the header-spoofing bypass described in
   app/core/rate_limit.py's _client_key docstring.
3. Fail-open behavior when the fake backend raises a Redis error.
"""

import pytest
from redis.exceptions import RedisError
from starlette.requests import Request

from app.core import rate_limit
from app.core.rate_limit import RateLimitExceededError, _client_key, check_rate_limit


class _FakeRedis:
    def __init__(self):
        self.counts: dict[str, int] = {}
        self.expiries: dict[str, int] = {}
        self.raise_error = False

    async def incr(self, key: str) -> int:
        if self.raise_error:
            raise RedisError("simulated outage")
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key: str, seconds: int) -> None:
        self.expiries[key] = seconds


def _make_request(headers: dict[str, str] | None = None, client_host: str = "203.0.113.7"):
    scope = {
        "type": "http",
        "headers": [
            (k.lower().encode(), v.encode()) for k, v in (headers or {}).items()
        ],
        "client": (client_host, 12345),
        "method": "GET",
        "path": "/",
    }
    return Request(scope)


class TestClientKeyProxyTrust:
    def test_xff_ignored_when_not_trusted(self, monkeypatch):
        monkeypatch.setattr(rate_limit.settings, "TRUST_PROXY_HEADERS", False)
        request = _make_request({"x-forwarded-for": "1.2.3.4"}, client_host="203.0.113.7")
        assert _client_key(request) == "203.0.113.7"

    def test_xff_used_when_trusted(self, monkeypatch):
        monkeypatch.setattr(rate_limit.settings, "TRUST_PROXY_HEADERS", True)
        request = _make_request({"x-forwarded-for": "1.2.3.4, 10.0.0.1"}, client_host="203.0.113.7")
        assert _client_key(request) == "1.2.3.4"

    def test_client_cannot_spoof_a_fresh_bucket_per_request_by_default(self, monkeypatch):
        """
        The actual vulnerability this guards against: with proxy trust
        off, sending a different X-Forwarded-For on every request must
        NOT change the rate-limit bucket a given connection maps to.
        """
        monkeypatch.setattr(rate_limit.settings, "TRUST_PROXY_HEADERS", False)
        keys = {
            _client_key(_make_request({"x-forwarded-for": f"10.0.0.{i}"}, client_host="203.0.113.7"))
            for i in range(5)
        }
        assert keys == {"203.0.113.7"}


class TestCheckRateLimit:
    async def test_allows_up_to_the_limit(self, monkeypatch):
        fake = _FakeRedis()
        monkeypatch.setattr(rate_limit, "redis_client", fake)
        for _ in range(3):
            await check_rate_limit(key="user@example.com", times=3, seconds=60, scope="test")

    async def test_rejects_over_the_limit(self, monkeypatch):
        fake = _FakeRedis()
        monkeypatch.setattr(rate_limit, "redis_client", fake)
        for _ in range(3):
            await check_rate_limit(key="user@example.com", times=3, seconds=60, scope="test")
        with pytest.raises(RateLimitExceededError):
            await check_rate_limit(key="user@example.com", times=3, seconds=60, scope="test")

    async def test_different_keys_have_independent_buckets(self, monkeypatch):
        fake = _FakeRedis()
        monkeypatch.setattr(rate_limit, "redis_client", fake)
        for _ in range(3):
            await check_rate_limit(key="victim@example.com", times=3, seconds=60, scope="test")
        # A different account key is not affected by victim's exhausted bucket.
        await check_rate_limit(key="someone-else@example.com", times=3, seconds=60, scope="test")

    async def test_fails_open_on_redis_error(self, monkeypatch):
        fake = _FakeRedis()
        fake.raise_error = True
        monkeypatch.setattr(rate_limit, "redis_client", fake)
        # Should not raise even though the backend is "down".
        await check_rate_limit(key="anyone", times=1, seconds=60, scope="test")
