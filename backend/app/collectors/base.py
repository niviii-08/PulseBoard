"""
Shared collector interface + the normalized post shape every collector
must produce, regardless of source platform.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass
from datetime import datetime


@dataclass
class NormalizedPost:
    platform: str            # matches app.models.trend.PlatformEnum values
    external_id: str | None
    author: str | None
    text: str
    url: str | None
    published_at: datetime
    engagement_count: int = 0  # likes + comments + shares/retweets, summed

@dataclass
class NormalizedArticle:
    source: str | None
    source_type: str | None
    title: str | None
    description: str | None
    url: str | None
    published_at: datetime
    country: str | None
    language: str | None
    category: str | None
    author: str | None
    image_url: str | None
    engagement: int = 0


class CollectorStatus:
    LIVE = "LIVE"
    CONNECTED = "LIVE"
    NOT_CONFIGURED = "NOT CONFIGURED"
    ERROR = "ERROR"
    DEMO = "DEMO"


@dataclass
class SourceMetadata:
    name: str
    type: str
    status: str
    last_success: datetime | None
    last_failure: datetime | None
    article_count: int
    configuration_status: bool


class BaseCollector(abc.ABC):
    """
    Abstract Pluggable Collector Interface.
    Every source must strictly implement this data pipeline contract.
    """
    platform: str = "unknown"
    name: str = "Unknown Source"
    type: str = "Generic Endpoint"
    status: str = CollectorStatus.NOT_CONFIGURED
    
    last_success: datetime | None = None
    last_failure: datetime | None = None
    
    async def fetch(self, query: str, since: datetime | None = None) -> list[dict]:
        """Fetch raw external API data."""
        raise NotImplementedError
        
    def normalize(self, raw_data: list[dict]) -> list[NormalizedPost | NormalizedArticle]:
        """Transform raw responses into Normalized shapes."""
        raise NotImplementedError
        
    def validate(self, items: list[NormalizedPost | NormalizedArticle]) -> list[NormalizedPost | NormalizedArticle]:
        """Clean and discard invalid items."""
        raise NotImplementedError
        
    def deduplicate(self, items: list[NormalizedPost | NormalizedArticle]) -> list[NormalizedPost | NormalizedArticle]:
        """Remove duplicates."""
        raise NotImplementedError
        
    async def store(self, items: list[NormalizedPost | NormalizedArticle]):
        """Persist items to the database via standard pipeline."""
        raise NotImplementedError

    # Legacy wrapper for backwards compatibility with scheduled Celery tasks
    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost | NormalizedArticle]:
        try:
            raw = await self.fetch(query, since)
            normalized = self.normalize(raw)
            valid = self.validate(normalized)
            deduped = self.deduplicate(valid)
            
            # If records actually produced, wait until storage resolves
            if deduped:
                self.status = CollectorStatus.LIVE
                self.last_success = datetime.utcnow()
            else:
                 # It ran but got nothing. Only call LIVE if it ever produced something.
                 if self.status != CollectorStatus.LIVE:
                      self.status = CollectorStatus.NOT_CONFIGURED
            
            return deduped
        except Exception as e:
            self.last_failure = datetime.utcnow()
            self.status = CollectorStatus.ERROR
            return []
            
    def get_metadata(self) -> SourceMetadata:
        # Article count is fetched via direct ORM mapping during API call, not stored statically here.
        # So we pass 0 here, the endpoint will inject the true count.
        return SourceMetadata(
            name=self.name,
            type=self.type,
            status=self.status,
            last_success=self.last_success,
            last_failure=self.last_failure,
            article_count=0,
            configuration_status=self.status != CollectorStatus.NOT_CONFIGURED
        )
