"""
Authentication and authorization dependencies.

`get_current_user` is the single place a bearer token is parsed and
turned into a `User` row — every protected route depends on it, directly
or (via `require_admin`) indirectly, so there is exactly one code path
that decides whether a request is authenticated.

Role checks are deliberately implemented as a *second*, separate
dependency (`require_admin`) layered on top of `get_current_user`, rather
than baked into it, so "is this request authenticated" and "is this user
allowed to do this specific thing" stay independently testable and
composable (a future `require_role(*roles)` factory can reuse
`get_current_user` the same way).
"""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TokenError, decode_access_token
from app.models.enums import UserRole
from app.models.user import User

# auto_error=False so we can return our own consistent 401 body (via
# PulseBoardError/AuthenticationError) instead of FastAPI's default
# "Not authenticated" plaintext response.
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or not credentials.credentials:
        raise unauthorized

    try:
        payload = decode_access_token(credentials.credentials)
    except TokenError:
        raise unauthorized

    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise unauthorized

    try:
        user_id = uuid.UUID(user_id_raw)
    except (ValueError, TypeError):
        raise unauthorized

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise unauthorized

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Layers a role check on top of get_current_user. A 403 (not 401) is
    correct here: the request IS authenticated, it's just not permitted —
    401 would incorrectly suggest re-authenticating would help.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires administrator privileges.",
        )
    return current_user
