"""
SSRF (Server-Side Request Forgery) protection for user-provided service URLs.

PulseBoard's entire premise is that the backend makes outbound HTTP
requests to URLs supplied by users. Without protection, an admin (or an
attacker who compromises an admin account, or a bug that lets a viewer
reach the create/update endpoint) could register "http://169.254.169.254/
latest/meta-data/iam/security-credentials/" as a "monitored service" and
turn the monitoring worker into a proxy that reads cloud credentials, or
point it at "http://localhost:6379/" to probe internal Redis, etc.

## Why DNS resolution, not string matching

A naive filter that regexes for "localhost", "127.0.0.1", "169.254.*" is
trivially bypassed:
  - Decimal/octal/hex IP encodings: http://2130706433/ (=127.0.0.1),
    http://0177.0.0.1/, http://0x7f000001/ — all resolve to loopback via
    the standard C resolver (glibc's inet_aton-compatible parsing) even
    though no string filter matching "127.0.0.1" would catch them.
  - A hostname an attacker controls (e.g. "evil.example.com") can point
    its DNS record at any private IP, entirely bypassing any check that
    only looks at the string the user typed.
  - DNS rebinding: even a hostname that resolves safely *at validation
    time* could be re-pointed at a private IP by the time it's actually
    connected to.

The only correct approach is: resolve the hostname (however it was
written) to its actual IP address(es) via the real system resolver, and
validate *those* IPs — the same IPs the underlying HTTP client will
actually connect to. That's what this module does.

## What this does NOT fully solve (and why that's OK for this phase)

DNS rebinding between validation and the eventual connection is a TOCTOU
gap that URL-validation-at-creation-time cannot close by itself — a
hostname could resolve safely right now and to 169.254.169.254 a minute
from now. The monitoring worker (implemented in the next phase, not this
one) is where the real defense against rebinding belongs: it must
re-resolve and re-validate on every single check (not just trust that
validation happened once at Service-creation time), and ideally connect
directly to the validated IP with the original Host header rather than
letting the HTTP client re-resolve the hostname itself. This module's
`resolve_and_validate` is written to be reusable for exactly that purpose
— it returns the validated IP(s), not just a boolean, so a future caller
can pin the connection to one of them.
"""

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit

ALLOWED_SCHEMES = frozenset({"http", "https"})

# IPv4 networks that are never valid targets even though Python's
# ipaddress.is_private/is_reserved/etc. don't all flag them individually.
# 0.0.0.0/8 ("this network") is routed to loopback-like behavior on many
# OSes; Python's is_unspecified only catches the exact address 0.0.0.0,
# not the whole /8, so it's listed explicitly.
EXTRA_BLOCKED_IPV4_NETWORKS = (
    ipaddress.ip_network("0.0.0.0/8"),
)

# Cloud metadata endpoints that are NOT covered by the standard
# private/loopback/link-local checks and must be blocked explicitly:
#   - 169.254.169.254 IS link-local (169.254.0.0/16), already caught —
#     listed anyway for clarity/documentation.
#   - 100.100.100.200 is Alibaba Cloud's metadata endpoint, inside
#     100.64.0.0/10 (RFC 6598 "shared address space" / CGNAT range),
#     which Python's ipaddress module does NOT classify as private.
EXTRA_BLOCKED_IPV4_HOSTS = frozenset(
    {
        ipaddress.ip_address("169.254.169.254"),
        ipaddress.ip_address("100.100.100.200"),
    }
)

# RFC 6598 CGNAT range (100.64.0.0/10) — used by some cloud providers for
# internal routing, including metadata access on certain platforms.
CGNAT_RANGE = ipaddress.ip_network("100.64.0.0/10")

DNS_RESOLUTION_TIMEOUT_SECONDS = 5


class UnsafeURLError(ValueError):
    """Raised when a URL fails SSRF validation. The message is safe to show to the user."""


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
        return True

    # Unwrap IPv4-mapped IPv6 addresses (::ffff:127.0.0.1) and re-check the
    # embedded IPv4 address — Python's IPv6Address flags do not always
    # automatically account for the mapped address's own properties.
    mapped = getattr(ip, "ipv4_mapped", None)
    if mapped is not None and _is_blocked_ip(mapped):
        return True

    if isinstance(ip, ipaddress.IPv4Address):
        if ip in CGNAT_RANGE:
            return True
        if any(ip in net for net in EXTRA_BLOCKED_IPV4_NETWORKS):
            return True
        if ip in EXTRA_BLOCKED_IPV4_HOSTS:
            return True

    return False


def _parse_scheme_and_host(url: str) -> tuple[str, str, int | None]:
    parts = urlsplit(url)

    scheme = (parts.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        raise UnsafeURLError(
            f"URL scheme '{scheme or '(none)'}' is not allowed. Only http and https are permitted."
        )

    if parts.username or parts.password:
        raise UnsafeURLError("URLs with embedded credentials are not allowed.")

    hostname = parts.hostname
    if not hostname:
        raise UnsafeURLError("URL must include a hostname.")

    return scheme, hostname, parts.port


def _resolve_hostname_sync(hostname: str, port: int) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """
    Blocking DNS resolution via the system resolver (glibc's getaddrinfo),
    run off the event loop by the async wrapper below. Deliberately uses
    the real resolver (not a hand-rolled DNS client) so it sees exactly
    what any HTTP client on this machine would see -- including the
    numeric-IP-string parsing tricks described in the module docstring.
    """
    try:
        addrinfo = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise UnsafeURLError(f"Could not resolve hostname '{hostname}'.") from exc

    ips: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    for family, _type, _proto, _canonname, sockaddr in addrinfo:
        raw_ip = sockaddr[0]
        if family == socket.AF_INET6:
            # Strip zone/scope id (e.g. "fe80::1%eth0") before parsing.
            raw_ip = raw_ip.split("%", 1)[0]
        ips.append(ipaddress.ip_address(raw_ip))

    if not ips:
        raise UnsafeURLError(f"Hostname '{hostname}' did not resolve to any address.")

    return ips


async def resolve_and_validate(url: str) -> list[str]:
    """
    Full SSRF validation pipeline for a candidate service URL:

    1. Scheme must be http or https (rejects file://, gopher://, dict://,
       ftp://, and anything else).
    2. No embedded credentials (http://user:pass@host/).
    3. Hostname is resolved via the real system resolver -- this is what
       makes the check robust against numeric-IP obfuscation tricks and
       hostnames that simply point at a private address, since we never
       trust the string the user typed, only what it actually resolves to.
    4. EVERY resolved IP (a hostname can have several A/AAAA records) is
       checked against loopback / private / link-local / multicast /
       reserved / unspecified / CGNAT / known cloud-metadata ranges. If
       ANY resolved IP is blocked, the whole URL is rejected -- fail
       closed, since an attacker controlling DNS could otherwise mix one
       safe-looking IP with one private IP and rely on the pinger
       connecting to whichever the OS picks.

    Returns the list of validated IP address strings on success (useful
    for a future caller, e.g. the monitoring worker, that wants to pin
    its connection to a specific already-validated IP rather than trust
    a second DNS lookup at request time). Raises UnsafeURLError on any
    failure, with a message safe to return to the API client.
    """
    scheme, hostname, port = _parse_scheme_and_host(url)
    effective_port = port or (443 if scheme == "https" else 80)

    try:
        ips = await asyncio.wait_for(
            asyncio.to_thread(_resolve_hostname_sync, hostname, effective_port),
            timeout=DNS_RESOLUTION_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError as exc:
        raise UnsafeURLError(f"Timed out resolving hostname '{hostname}'.") from exc

    blocked = [ip for ip in ips if _is_blocked_ip(ip)]
    if blocked:
        raise UnsafeURLError(
            f"URL resolves to a disallowed address ({blocked[0]}). "
            "Requests to private networks, loopback, link-local, or cloud "
            "metadata addresses are not permitted."
        )

    return [str(ip) for ip in ips]
