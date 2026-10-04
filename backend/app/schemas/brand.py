"""Pydantic schemas for brand monitoring CRUD."""

from uuid import UUID

from pydantic import BaseModel, Field


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    aliases: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    monitoring_enabled: bool = True


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    aliases: list[str] | None = None
    keywords: list[str] | None = None
    monitoring_enabled: bool | None = None


class BrandRead(BaseModel):
    id: UUID
    name: str
    aliases: list[str] | None
    keywords: list[str] | None
    monitoring_enabled: bool

    class Config:
        from_attributes = True
