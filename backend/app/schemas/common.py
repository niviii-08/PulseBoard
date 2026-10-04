"""
Shared Pydantic schema base classes.

Kept deliberately separate from app/models (the SQLAlchemy layer) — this
is the API contract, not the storage layer, and the two are allowed to
diverge (e.g. hiding `hashed_password`, reshaping `IncidentService` into
a flat list of service IDs). Every schema module in this package should
import shared enums from `app.models.enums` (single source of truth for
valid values) but never import the ORM model classes themselves.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMBase(BaseModel):
    """Base for any schema that will be constructed from an ORM instance."""

    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    """Generic pagination envelope reused by every list endpoint."""

    items: list[T]
    total: int = Field(..., description="Total number of matching rows across all pages.")
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1)
    total_pages: int = Field(..., ge=0)
