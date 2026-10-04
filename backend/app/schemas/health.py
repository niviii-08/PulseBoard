"""Response schemas for the health check endpoint."""

from typing import Literal

from pydantic import BaseModel, Field

ComponentStatus = Literal["ok", "error"]
OverallStatus = Literal["healthy", "degraded"]


class DependencyHealth(BaseModel):
    status: ComponentStatus
    latency_ms: float | None = Field(
        default=None, description="Round-trip time of the health probe, in milliseconds."
    )


class HealthResponse(BaseModel):
    status: OverallStatus
    version: str
    environment: str
    database: DependencyHealth
    redis: DependencyHealth
