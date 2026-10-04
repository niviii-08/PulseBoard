"""
PulseBoard FastAPI application entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Responsibilities of this module, and only this module:
- construct the FastAPI app
- configure logging
- configure CORS
- register the exception handlers
- mount the versioned API router
- manage startup/shutdown of shared resources (DB engine, Redis client,
  the Redis-to-WebSocket relay background task)

Everything else (routes, business logic, models) lives in its own module
and is wired in here, not written here.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging
from app.core.redis_client import close_redis_connection
from app.core.request_logging import RequestLoggingMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.sentry import init_sentry
from app.core.websocket_manager import relay_redis_events_to_websockets

configure_logging()
logger = logging.getLogger("pulseboard.main")

# No-op unless SENTRY_DSN is set (see app/core/sentry.py). Called after
# configure_logging() so its own log line uses the app's logging setup.
init_sentry()

# Fail fast: refuse to boot with unsafe settings in production (default
# JWT secret, DEBUG on, missing/wildcard CORS origins). A no-op outside
# ENVIRONMENT=production -- see Settings.assert_safe_for_environment.
settings.assert_safe_for_environment()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s (env=%s, version=%s)",
        settings.APP_NAME,
        settings.ENVIRONMENT,
        settings.APP_VERSION,
    )
    relay_task = asyncio.create_task(relay_redis_events_to_websockets())

    yield

    logger.info("Shutting down %s", settings.APP_NAME)
    relay_task.cancel()
    try:
        await relay_task
    except asyncio.CancelledError:
        pass
    await close_redis_connection()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Registered first (outermost after CORS) so every response -- including
# error responses from the exception handlers below -- carries the
# standard security headers.
app.add_middleware(SecurityHeadersMiddleware)

# Assigns/propagates the X-Request-ID and logs one line per request (see
# app/core/request_logging.py). Registered so it wraps CORS/security
# headers too, meaning its logged status code reflects what the client
# actually received.
app.add_middleware(RequestLoggingMiddleware)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
else:
    logger.warning(
        "BACKEND_CORS_ORIGINS is empty — no cross-origin requests will be "
        "allowed. Set it in .env for local frontend development."
    )

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["root"], summary="API root")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }
