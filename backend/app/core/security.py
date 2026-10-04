"""
Password hashing and JWT/refresh-token primitives.

Design decisions worth being able to explain:

- **bcrypt used directly**, not via passlib. passlib's bcrypt backend
  detection breaks against bcrypt>=4.1 (it probes `bcrypt.__about__`,
  which newer bcrypt releases removed), and passlib itself has been
  effectively unmaintained since 2020. Calling the `bcrypt` library
  directly is one fewer dependency and one fewer footgun.

- **Access tokens are stateless JWTs**, short-lived (default 60 min).
  They are verified by signature + expiry alone — no database lookup
  required on every authenticated request, which is the whole point of
  using JWTs instead of server-side sessions.

- **Refresh tokens are opaque random strings, not JWTs**, and are stored
  server-side (hashed, in the `refresh_tokens` table — see
  app/models/refresh_token.py). This is what makes real logout and
  real revocation possible: a stateless JWT can't be un-issued before
  it expires, but an opaque token backed by a DB row can be deleted or
  flagged revoked at any time. The tradeoff is one DB round-trip per
  refresh (not per request), which is an acceptable cost for the token
  that's used far less often than the access token.

- **Refresh tokens are hashed (SHA-256) before storage**, the same
  principle as password hashing: if the `refresh_tokens` table is ever
  exfiltrated, the attacker gets hashes, not usable tokens.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from app.core.config import settings
from app.models.enums import UserRole

ACCESS_TOKEN_TYPE = "access"


class TokenError(Exception):
    """Raised for any invalid/expired/malformed JWT. Callers map this to 401."""


# --- Password hashing ---------------------------------------------------


def hash_password(plain_password: str) -> str:
    """Hash a password with bcrypt (cost factor 12, bcrypt's sane default)."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Constant-time comparison via bcrypt.checkpw — never compare hashes
    with `==`, which leaks timing information.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except ValueError:
        # Malformed hash (shouldn't happen with app-generated hashes, but
        # never let a corrupt DB value crash the login endpoint).
        return False


# --- Access tokens (JWT) -------------------------------------------------


def create_access_token(*, user_id: uuid.UUID, role: UserRole) -> tuple[str, datetime]:
    """Returns (encoded_jwt, expires_at) so callers can report expiry to clients."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role.value,
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> dict[str, Any]:
    """Verifies signature + expiry and returns the payload, or raises TokenError."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except ExpiredSignatureError as exc:
        raise TokenError("Access token has expired.") from exc
    except InvalidTokenError as exc:
        raise TokenError("Access token is invalid.") from exc

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise TokenError("Token is not an access token.")
    return payload


# --- Refresh tokens (opaque, DB-backed) -----------------------------------


def generate_refresh_token() -> str:
    """A high-entropy opaque token — not a JWT, carries no claims of its own."""
    return secrets.token_urlsafe(64)


def hash_refresh_token(raw_token: str) -> str:
    """
    SHA-256 rather than bcrypt here deliberately: this value is already
    high-entropy random data (not a low-entropy human password), so
    bcrypt's slow, salted hashing buys nothing but latency. SHA-256 gives
    a fast, deterministic lookup key for the unique index on
    refresh_tokens.token_hash — the same reasoning API-key storage
    schemes typically use.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
