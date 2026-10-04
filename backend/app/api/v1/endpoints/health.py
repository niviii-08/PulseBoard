"""
Health check endpoint.

GET /api/v1/health

Reports:
- overall API status
- database connectivity (with round-trip latency)
- Redis connectivity (with round-trip latency)
- application version

The endpoint deliberately performs *live* probes on every call rather than
caching results — health checks should reflect the current state of the
world, and the endpoint is expected to be called infrequently and cheaply
enough (by an orchestrator or uptime monitor) that this isn't a problem.

HTTP status code semantics:
- 200 if every dependency is reachable ("healthy")
- 503 if any dependency is unreachable ("degraded") — this lets load
  balancers / orchestrators (or PulseBoard monitoring itself, eventually)
  detect an unhealthy instance from the status code alone, without having
  to parse the body.
"""

import logging
import time

from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.core.database import check_database_connection
from app.core.redis_client import check_redis_connection
from app.schemas.health import DependencyHealth, HealthResponse

logger = logging.getLogger("pulseboard.health")

router = APIRouter()


async def _probe_database() -> DependencyHealth:
    start = time.perf_counter()
    is_ok = await check_database_connection()
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    return DependencyHealth(status="ok" if is_ok else "error", latency_ms=elapsed_ms)


async def _probe_redis() -> DependencyHealth:
    start = time.perf_counter()
    is_ok = await check_redis_connection()
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    return DependencyHealth(status="ok" if is_ok else "error", latency_ms=elapsed_ms)


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health check",
    tags=["health"],
)
async def health_check(response: Response) -> HealthResponse:
    database_health = await _probe_database()
    redis_health = await _probe_redis()

    overall_status = (
        "healthy"
        if database_health.status == "ok" and redis_health.status == "ok"
        else "degraded"
    )

    if overall_status == "degraded":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        logger.warning(
            "Health check degraded: database=%s redis=%s",
            database_health.status,
            redis_health.status,
        )

    return HealthResponse(
        status=overall_status,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database=database_health,
        redis=redis_health,
    )
