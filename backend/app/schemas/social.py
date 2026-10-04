"""Shared response shapes for the alerts/sources endpoints -- kept thin,
most responses in this codebase are plain dicts (see trends.py), these
exist mainly to document the shape for API consumers."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AlertRead(BaseModel):
    id: UUID
    alert_type: str
    severity: str
    topic_id: UUID | None
    brand_id: UUID | None
    message: str
    drivers: dict | list | None
    threshold_value: float | None
    observed_value: float | None
    acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True
