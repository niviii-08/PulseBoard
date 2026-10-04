"""
Shared pytest fixtures.

Test isolation strategy: a fresh async engine/connection is created PER
TEST FUNCTION (not shared across tests), because asyncpg connections are
bound to the event loop they were created on, and pytest-asyncio gives
each test function its own event loop by default. Sharing one engine
across tests is a classic source of "Future attached to a different
loop" errors -- creating one per test sidesteps the whole problem at a
small, acceptable performance cost.

An outer transaction is opened on that connection, the app's `get_db`
dependency is overridden to bind sessions to it, and everything the test
(and the code under test) does happens inside a SAVEPOINT via
`session.begin_nested()`. At teardown we roll back the outer transaction
and dispose the engine, so every test starts from a clean slate and never
leaks state into the next test.

Schema setup/teardown (CREATE TABLE / DROP TABLE) is done ONCE per test
session using a plain synchronous engine (psycopg2), specifically to keep
it decoupled from any asyncio event loop -- DDL only needs to run once
and has no reason to fight over loop ownership.

Uses a dedicated `pulseboard_test` database (settings.TEST_DATABASE_URL)
so the suite never touches development data.
"""

from typing import AsyncGenerator

import pytest
import pytest_asyncio
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
import app.models as _models  # noqa: F401  (populate Base.metadata, avoid shadowing `app`)


def _sync_url(async_url: str) -> str:
    return async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    sync_engine = sa.create_engine(_sync_url(settings.TEST_DATABASE_URL))
    Base.metadata.drop_all(bind=sync_engine)
    Base.metadata.create_all(bind=sync_engine)
    yield
    Base.metadata.drop_all(bind=sync_engine)
    sync_engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(settings.TEST_DATABASE_URL, echo=False)
    connection = await engine.connect()
    trans = await connection.begin()
    session_factory = async_sessionmaker(bind=connection, expire_on_commit=False)
    session = session_factory()

    # Restart a SAVEPOINT whenever the code under test calls session.commit()
    # (route handlers commit explicitly), so nested commits don't end the
    # outer transaction we're relying on for rollback-based isolation.
    @sa.event.listens_for(session.sync_session, "after_transaction_end")
    def restart_savepoint(sess, transaction):
        if transaction.nested and not transaction._parent.nested:
            sess.begin_nested()

    await session.begin_nested()

    try:
        yield session
    finally:
        await session.close()
        await trans.rollback()
        await connection.close()
        await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _no_real_celery_dispatch(monkeypatch):
    """
    Prevents every test from enqueuing real Celery tasks onto whatever
    CELERY_BROKER_URL happens to be configured -- e.g. GET
    /api/v1/collectors/run in test_sources.py calling .delay() on the
    ingestion tasks. Patches `.delay` directly on the task singletons
    rather than replacing the objects entirely, so any test that wants
    to assert a task WAS queued can still monkeypatch it further/locally.
    """
    from app.tasks.ingestion_tasks import collect_and_process, refresh_demo_data

    class _FakeAsyncResult:
        id = "test-task-id"

    monkeypatch.setattr(collect_and_process, "delay", lambda *a, **k: _FakeAsyncResult())
    monkeypatch.setattr(refresh_demo_data, "delay", lambda *a, **k: _FakeAsyncResult())


@pytest_asyncio.fixture(autouse=True)
async def _reset_rate_limit_counters():
    """
    Every test in this suite drives auth/service/webhook endpoints
    through the SAME simulated client address (the ASGI test transport
    has no real socket), so without this fixture the fixed-window
    counters in app/core/rate_limit.py accumulate across the whole test
    session and unrelated tests start tripping RATE_LIMIT_EXCEEDED
    purely from test-suite volume, not from anything the test itself
    did. Flushing the `ratelimit:*` keyspace before each test keeps the
    limiter's own dedicated test file (test_rate_limit.py) as the one
    place its behavior is actually under test, while every other test
    gets a clean slate. Real request volume in production doesn't
    remotely resemble a test suite hammering the same three auth
    endpoints in a tight loop, so this is purely a test-isolation
    concern, not a production behavior change.

    This deliberately uses TWO different Redis connections for two
    different jobs, rather than one:

    1. Flushing the `ratelimit:*` keys uses a private, ad-hoc connection
       created and torn down entirely within this fixture -- it never
       touches the app's shared `app.core.redis_client.redis_client`
       singleton. If it flushed through the singleton instead, doing so
       would itself open a connection on THIS fixture's (pytest-asyncio)
       event loop before the test body even runs. That's harmless for
       tests using the async `client` fixture (same loop throughout),
       but test_websocket.py's integration tests drive the app through
       Starlette's synchronous `TestClient`, which runs the app's own
       lifespan -- including its own use of `redis_client` -- inside a
       separate anyio portal thread with a DIFFERENT event loop. A
       connection already sitting in the singleton's pool from this
       fixture's pre-test flush, opened on pytest-asyncio's loop, then
       gets swept up by the app's shutdown-time `disconnect()` (which
       closes every connection in the pool) running on the portal's
       loop -- and awaiting a close on a connection bound to a
       different, still-running loop reliably reproduces the exact
       "attached to a different loop" crash this whole fixture exists
       to prevent, just one layer further in. Keeping the flush
       connection entirely private sidesteps that.

    2. At teardown, the shared singleton's `connection_pool` is swapped
       for a fresh, empty one -- not gracefully closed -- so that
       whatever connections the app itself opened DURING the test
       (through either loop) are simply abandoned rather than awaited
       shut. The next test's first use lazily opens new connections on
       whatever loop is current then, which is all test isolation here
       needs; abandoning old sockets rather than awaiting their closure
       is exactly what avoids the cross-loop await in the first place.
    Also flushes the `cache:*` keyspace for the same reason -- see
    app/services/status_public_service.py's `get_status_summary`, which
    caches its response in Redis. Without this, a Postgres-level
    rollback-based test (this suite's normal isolation strategy) would
    still leak a warm cache entry from one test into the next, since
    Redis isn't part of that rollback at all.
    """
    import redis.asyncio as redis

    flush_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _flush() -> None:
        try:
            cursor = 0
            while True:
                cursor, keys = await flush_client.scan(
                    cursor, match="ratelimit:*", count=500
                )
                if keys:
                    await flush_client.delete(*keys)
                if cursor == 0:
                    break
            cursor = 0
            while True:
                cursor, keys = await flush_client.scan(cursor, match="cache:*", count=500)
                if keys:
                    await flush_client.delete(*keys)
                if cursor == 0:
                    break
        except Exception:
            # Best-effort test hygiene, not correctness-critical -- never
            # let a Redis hiccup fail an unrelated test.
            pass

    await _flush()
    yield
    await _flush()
    await flush_client.aclose()

    from app.core.redis_client import redis_client

    redis_client.connection_pool = redis.ConnectionPool.from_url(
        settings.REDIS_URL, decode_responses=True
    )
