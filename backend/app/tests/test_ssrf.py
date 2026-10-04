"""
SSRF protection tests.

Two tiers:
1. Literal-IP cases need no mocking at all -- "http://127.0.0.1/" parses
   straight to an IP via ipaddress, no DNS involved, so these exercise
   the real code path end-to-end deterministically.
2. Hostname-based cases mock `socket.getaddrinfo` (the exact function the
   guard calls) so tests are deterministic and don't depend on real,
   possibly-unavailable network access in CI/sandboxed environments --
   while still exercising the guard's own resolution + validation logic
   faithfully, since only the OS-level lookup itself is substituted.
"""

import socket

import pytest

from app.services.ssrf_guard import UnsafeURLError, resolve_and_validate


def _fake_getaddrinfo(ip: str, family=socket.AF_INET):
    """Builds a getaddrinfo()-shaped return value for a single fake IP."""

    def _fn(host, port, *args, **kwargs):
        return [(family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", (ip, port))]

    return _fn


class TestLiteralIPBlocking:
    """No DNS mocking needed -- these are literal IPs in the URL itself."""

    @pytest.mark.parametrize(
        "url",
        [
            "http://127.0.0.1/",
            "http://127.0.0.1:8080/admin",
            "http://[::1]/",
            "http://10.0.0.1/",
            "http://10.255.255.255/",
            "http://172.16.0.1/",
            "http://172.31.255.255/",
            "http://192.168.0.1/",
            "http://192.168.255.255/",
            "http://169.254.169.254/",  # AWS/GCP/Azure metadata
            "http://169.254.0.1/",  # link-local generally
            "http://100.100.100.200/",  # Alibaba Cloud metadata
            "http://100.64.0.1/",  # CGNAT range
            "http://0.0.0.0/",
            "http://224.0.0.1/",  # multicast
            "http://[fe80::1]/",  # IPv6 link-local
            "http://[fc00::1]/",  # IPv6 unique local
            "http://[fd00:ec2::254]/",  # AWS IPv6 metadata (ULA range)
        ],
    )
    async def test_blocked_ip_literals(self, url):
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate(url)

    @pytest.mark.parametrize(
        "url",
        [
            "http://2130706433/",  # decimal encoding of 127.0.0.1
            "http://0x7f000001/",  # hex encoding of 127.0.0.1
            "http://017700000001/",  # octal encoding of 127.0.0.1
        ],
    )
    async def test_obfuscated_loopback_encodings_are_still_blocked(self, url):
        """
        These are the exact bypass techniques a naive string-matching
        filter would miss -- the real system resolver normalizes them to
        127.0.0.1 (glibc's inet_aton-compatible parsing), which is
        exactly why the guard trusts resolution output, not input text.
        """
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate(url)

    async def test_public_ip_literal_is_allowed(self):
        ips = await resolve_and_validate("http://8.8.8.8/")
        assert ips == ["8.8.8.8"]


class TestSchemeValidation:
    @pytest.mark.parametrize(
        "url",
        [
            "ftp://8.8.8.8/",
            "file:///etc/passwd",
            "gopher://8.8.8.8/",
            "dict://8.8.8.8/",
            "javascript:alert(1)",
            "8.8.8.8",  # no scheme at all
        ],
    )
    async def test_disallowed_schemes_rejected(self, url):
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate(url)

    async def test_https_scheme_allowed(self):
        ips = await resolve_and_validate("https://8.8.8.8/")
        assert ips == ["8.8.8.8"]


class TestEmbeddedCredentials:
    async def test_url_with_embedded_credentials_rejected(self):
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate("http://user:pass@8.8.8.8/")


class TestMalformedURLs:
    @pytest.mark.parametrize("url", ["http:///no-host-at-all", "http://", "not-a-url-at-all"])
    async def test_missing_hostname_rejected(self, url):
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate(url)


class TestHostnameResolutionMocked:
    """
    Exercises the DNS-resolution path with a controlled, deterministic
    getaddrinfo -- proves the guard validates whatever a hostname
    *resolves to*, independent of what the hostname string looks like.
    """

    async def test_hostname_resolving_to_private_ip_is_blocked(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.ssrf_guard.socket.getaddrinfo",
            _fake_getaddrinfo("10.0.0.5"),
        )
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate("http://internal-service.example.com/")

    async def test_hostname_resolving_to_metadata_ip_is_blocked(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.ssrf_guard.socket.getaddrinfo",
            _fake_getaddrinfo("169.254.169.254"),
        )
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate("http://metadata.google.internal/")

    async def test_hostname_resolving_to_public_ip_is_allowed(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.ssrf_guard.socket.getaddrinfo",
            _fake_getaddrinfo("93.184.216.34"),
        )
        ips = await resolve_and_validate("http://public-example.com/")
        assert ips == ["93.184.216.34"]

    async def test_one_bad_ip_among_multiple_resolved_ips_blocks_the_whole_url(
        self, monkeypatch
    ):
        """
        Fail-closed behavior: if a hostname resolves to BOTH a public and
        a private IP (e.g. a compromised/malicious DNS record, or a
        multi-homed host), the whole URL must be rejected -- an attacker
        should not be able to rely on the pinger picking "the safe one".
        """

        def multi_ip_getaddrinfo(host, port, *args, **kwargs):
            return [
                (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("93.184.216.34", port)),
                (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("10.0.0.1", port)),
            ]

        monkeypatch.setattr(
            "app.services.ssrf_guard.socket.getaddrinfo", multi_ip_getaddrinfo
        )
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate("http://mixed-records.example.com/")

    async def test_dns_resolution_failure_is_rejected_not_crashed(self, monkeypatch):
        def raising_getaddrinfo(host, port, *args, **kwargs):
            raise socket.gaierror("Name or service not known")

        monkeypatch.setattr(
            "app.services.ssrf_guard.socket.getaddrinfo", raising_getaddrinfo
        )
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate("http://does-not-exist.invalid/")


class TestIPv4MappedIPv6:
    async def test_ipv4_mapped_loopback_is_blocked(self, monkeypatch):
        """
        ::ffff:127.0.0.1 is an IPv6 address that embeds an IPv4 loopback
        address -- must be caught even though it's syntactically an IPv6
        literal, not a bare IPv4 one.
        """
        monkeypatch.setattr(
            "app.services.ssrf_guard.socket.getaddrinfo",
            _fake_getaddrinfo("::ffff:127.0.0.1", family=socket.AF_INET6),
        )
        with pytest.raises(UnsafeURLError):
            await resolve_and_validate("http://sneaky.example.com/")
