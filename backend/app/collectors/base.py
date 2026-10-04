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


class CollectorStatus:
    CONNECTED = "connected"
    DEMO = "demo"
    NOT_CONFIGURED = "not_configured"
    OPTIONAL = "optional"


class BaseCollector(abc.ABC):
    platform: str
    status: str = CollectorStatus.NOT_CONFIGURED

    @abc.abstractmethod
    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        """
        Fetches posts matching `query` (a brand name, alias, or topic
        keyword) published since `since` (or a source-appropriate
        default lookback if None). Must never raise on a transient
        failure -- log and return an empty list -- so one flaky source
        never takes down the whole ingestion run.
        """
        raise NotImplementedError
