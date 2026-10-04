"""
Reddit collector -- stub.

The official Reddit API requires OAuth2 app credentials
(REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET). Neither is configured in this
environment, and unauthenticated scraping of Reddit's HTML/JSON
endpoints violates Reddit's API Terms, so per the spec's explicit
instruction ("Do not build a scraper that violates... platform terms"),
this collector does not attempt one. `collect()` returns an empty list
rather than fabricating data; GET /api/v1/sources reports this
collector's status as "not_configured" honestly instead of implying it
is active.

To make this real: implement OAuth2 client-credentials auth against
https://www.reddit.com/api/v1/access_token, then call the official
`/search` endpoint with the resulting bearer token. That's a bounded,
well-documented amount of work -- deliberately left as a follow-up
rather than half-implemented here.
"""

from __future__ import annotations

from datetime import datetime

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost
from app.core.config import settings


class RedditCollector(BaseCollector):
    platform = "reddit"

    @property
    def status(self) -> str:
        if settings.REDDIT_CLIENT_ID and settings.REDDIT_CLIENT_SECRET:
            return CollectorStatus.CONNECTED
        return CollectorStatus.NOT_CONFIGURED

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        if self.status != CollectorStatus.CONNECTED:
            return []
        # Not implemented: requires the OAuth2 flow described above.
        return []
