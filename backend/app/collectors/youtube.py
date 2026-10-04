"""
YouTube collector -- stub.

Requires a YouTube Data API v3 key (settings.YOUTUBE_API_KEY), which is
not configured in this environment. `collect()` returns an empty list
when unconfigured rather than pretending to fetch data; see
reddit.py's docstring for the same reasoning.

To make this real: call
`GET https://www.googleapis.com/youtube/v3/search?q={query}&key={key}`
then a second call to `videos.list` for view/like/comment counts to
populate NormalizedPost.engagement_count.
"""

from __future__ import annotations

from datetime import datetime

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost
from app.core.config import settings


class YouTubeCollector(BaseCollector):
    platform = "youtube"

    @property
    def status(self) -> str:
        return CollectorStatus.CONNECTED if settings.YOUTUBE_API_KEY else CollectorStatus.NOT_CONFIGURED

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        if self.status != CollectorStatus.CONNECTED:
            return []
        return []
