"""
Database configuration.

Sets up the async SQLAlchemy engine, session factory, declarative base,
and the FastAPI dependency used to inject a request-scoped AsyncSession
into route handlers.

Design notes:
- We use the async engine (asyncpg driver) everywhere the *application*
  talks to Postgres. Alembic migrations also run async (see alembic/env.py)
  so there is a single driver / connection style to reason about.
- `Base` is imported by every model module in app/models/. No models are
  defined yet in this phase — this file just establishes the pattern.
- `get_db` is a generator-based dependency that guarantees the session is
  closed (and rolled back on error) regardless of how the request handler
  exits.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger("pulseboard.database")


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""

    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # detects stale/dropped connections before use
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a request-scoped AsyncSession."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context-manager variant for use outside of FastAPI's DI system
    (e.g. inside Celery tasks in later phases, or startup scripts).
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> bool:
    """
    Lightweight connectivity probe used by the health endpoint.
    Returns True if a trivial query succeeds, False otherwise.
    Never raises — callers should treat any exception as "unhealthy".
    """
    try:
        async with engine.connect() as conn:
            from sqlalchemy import text

            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001 - deliberately broad for a health probe
        logger.warning("Database health check failed: %s", exc)
        return False
