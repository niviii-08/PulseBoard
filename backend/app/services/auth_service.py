"""
Auth service layer.

Keeps the route handlers in app/api/v1/endpoints/auth.py thin — they parse
the request, call one of these functions, and shape the response. All the
actual security-relevant decisions (bootstrap-admin logic, refresh-token
rotation, reuse detection) live here where they're unit-testable without
going through HTTP.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.enums import UserRole
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import TokenResponse


class AuthError(Exception):
    """Base class for auth-flow errors. Mapped to HTTP responses in the router."""


class InvalidCredentialsError(AuthError):
    pass


class EmailAlreadyRegisteredError(AuthError):
    pass


class InvalidRefreshTokenError(AuthError):
    pass


async def register_user(
    db: AsyncSession, *, email: str, password: str, full_name: str
) -> User:
    """
    Bootstrap-admin pattern: the first account ever created becomes an
    admin automatically (someone has to be able to manage the system from
    a fresh install); every registration after that is forced to VIEWER
    regardless of what's requested, closing off self-service privilege
    escalation. Promoting a viewer to admin is an explicit admin action
    (out of scope for this phase — no user-management endpoints exist
    yet), never something a registration payload can request for itself.
    """
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise EmailAlreadyRegisteredError(email)

    user_count = await db.execute(select(func.count()).select_from(User))
    is_first_user = user_count.scalar_one() == 0

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=UserRole.ADMIN if is_first_user else UserRole.VIEWER,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, *, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Deliberately identical error for "no such user" and "wrong password"
    # — distinguishing them lets an attacker enumerate valid emails.
    if user is None or not user.is_active or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError()

    return user


async def issue_token_pair(db: AsyncSession, *, user: User) -> TokenResponse:
    access_token, expires_at = create_access_token(user_id=user.id, role=user.role)

    raw_refresh_token = generate_refresh_token()
    refresh_expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh_token),
            expires_at=refresh_expires_at,
        )
    )
    await db.flush()

    expires_in = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        expires_in=expires_in,
    )


async def rotate_refresh_token(db: AsyncSession, *, raw_refresh_token: str) -> TokenResponse:
    """
    Exchanges a valid refresh token for a new access+refresh pair, and
    revokes the token that was just used (rotation) so it can't be
    replayed.

    Reuse detection: if the presented token maps to a row that is already
    revoked, that's a signal the token was stolen and already used once
    by an attacker (or the legitimate user, in a race) — either way, the
    safe response is to revoke every outstanding refresh token for that
    user, forcing re-authentication everywhere, rather than trusting the
    session further.
    """
    token_hash = hash_refresh_token(raw_refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    token_row = result.scalar_one_or_none()

    if token_row is None:
        raise InvalidRefreshTokenError("Refresh token not recognized.")

    if token_row.revoked_at is not None:
        await _revoke_all_tokens_for_user(db, user_id=token_row.user_id)
        raise InvalidRefreshTokenError(
            "Refresh token has already been used. All sessions for this "
            "account have been revoked as a precaution."
        )

    if token_row.expires_at <= datetime.now(timezone.utc):
        raise InvalidRefreshTokenError("Refresh token has expired.")

    user = await db.get(User, token_row.user_id)
    if user is None or not user.is_active:
        raise InvalidRefreshTokenError("Account is no longer active.")

    token_row.revoked_at = datetime.now(timezone.utc)
    await db.flush()

    return await issue_token_pair(db, user=user)


async def revoke_refresh_token(db: AsyncSession, *, raw_refresh_token: str) -> None:
    """
    Logout. Idempotent and intentionally silent about whether the token
    existed — a 404 here would let a caller probe for valid tokens.
    """
    token_hash = hash_refresh_token(raw_refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    token_row = result.scalar_one_or_none()
    if token_row is not None and token_row.revoked_at is None:
        token_row.revoked_at = datetime.now(timezone.utc)
        await db.flush()


async def _revoke_all_tokens_for_user(db: AsyncSession, *, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    await db.flush()
