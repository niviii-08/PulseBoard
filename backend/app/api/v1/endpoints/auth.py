"""
Auth endpoints:

    POST /api/v1/auth/register
    POST /api/v1/auth/login
    POST /api/v1/auth/refresh
    POST /api/v1/auth/logout
    GET  /api/v1/auth/me

See app/services/auth_service.py for the actual logic; this module only
translates between HTTP and that service layer.
"""

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import PulseBoardError
from app.core.rate_limit import check_rate_limit, rate_limiter
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services import auth_service
from app.models.user import User

logger = logging.getLogger("pulseboard.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

# IP-based limiters: generous enough not to bother a real user retrying
# a typo'd password, tight enough to blunt scripted credential stuffing
# / registration spam from a single source. Login also gets a second,
# email-scoped limiter below (see check_rate_limit's docstring) since an
# IP-only limit does nothing against an attacker spraying guesses for
# one victim account across many source IPs.
_register_limiter = rate_limiter(times=10, seconds=3600, scope="auth_register")
_login_ip_limiter = rate_limiter(times=20, seconds=300, scope="auth_login_ip")
_refresh_limiter = rate_limiter(times=30, seconds=300, scope="auth_refresh")


class AuthenticationFailedError(PulseBoardError):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "AUTHENTICATION_FAILED"


class RegistrationConflictError(PulseBoardError):
    status_code = status.HTTP_409_CONFLICT
    error_code = "EMAIL_ALREADY_REGISTERED"


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    dependencies=[Depends(_register_limiter)],
)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> UserRead:
    try:
        user = await auth_service.register_user(
            db,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
        )
    except auth_service.EmailAlreadyRegisteredError:
        raise RegistrationConflictError("An account with this email already exists.")

    await db.commit()
    logger.info("New user registered: %s (role=%s)", user.email, user.role)
    return UserRead.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in",
    dependencies=[Depends(_login_ip_limiter)],
)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    # Account-scoped limit, independent of the IP-scoped dependency above
    # -- keyed on the submitted email (lowercased the same way the model
    # stores it) so distributing guesses across many IPs doesn't help an
    # attacker. Checked before touching the database.
    await check_rate_limit(
        key=payload.email.lower(), times=10, seconds=300, scope="auth_login_account"
    )

    try:
        user = await auth_service.authenticate_user(
            db, email=payload.email, password=payload.password
        )
    except auth_service.InvalidCredentialsError:
        raise AuthenticationFailedError("Incorrect email or password.")

    tokens = await auth_service.issue_token_pair(db, user=user)
    await db.commit()
    logger.info("User logged in: %s", user.email)
    return tokens


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange a refresh token",
    dependencies=[Depends(_refresh_limiter)],
)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        tokens = await auth_service.rotate_refresh_token(
            db, raw_refresh_token=payload.refresh_token
        )
    except auth_service.InvalidRefreshTokenError as exc:
        await db.commit()  # persist any reuse-detection revocations before failing
        raise AuthenticationFailedError(str(exc))

    await db.commit()
    return tokens


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log out (revoke a refresh token)",
)
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)) -> None:
    await auth_service.revoke_refresh_token(db, raw_refresh_token=payload.refresh_token)
    await db.commit()


@router.get("/me", response_model=UserRead, summary="Get the current authenticated user")
async def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
