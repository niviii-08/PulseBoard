"""
News/RSS collector -- the one collector in this codebase that performs
real, working data collection using only a public, permission-less
protocol (RSS), no authentication, no ToS-restricted scraping.

Uses Google News RSS search by default (settings.NEWS_RSS_FEEDS), which
is a public, unauthenticated feed anyone can query -- no API key, no
robots.txt violation, no rate-limit-abusing crawl. Any other public RSS
endpoint can be added via the same env var without a code change.

Honesty note (see README "Data Sources" section): this collector's HTTP
fetch is implemented and correct, but the sandboxed environment this was
built in has no general internet egress (only package registries), so it
could not be exercised against a live feed during this build. It will
work once deployed somewhere with normal outbound internet access --
run `pytest -k news_collector` there to confirm before relying on it.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost
from app.core.config import settings

logger = logging.getLogger("pulseboard.collectors.news")

_TIMEOUT_SECONDS = 15.0
_MAX_ITEMS_PER_FEED = 25


class NewsCollector(BaseCollector):
    platform = "news"
    status = CollectorStatus.CONNECTED  # RSS needs no credentials; "connected" means "reachable in principle"

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        posts: list[NormalizedPost] = []
        for template in settings.news_rss_feed_templates:
            url = template.format(query=query)
            try:
                async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS, follow_redirects=True) as client:
                    resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PulseBoardBot/1.0"})
                    resp.raise_for_status()
                    parsed = feedparser.parse(resp.content)
            except Exception as exc:  # noqa: BLE001 - one bad feed must not break the run
                logger.warning("News RSS fetch failed for %s: %s", url, exc)
                continue

            for entry in parsed.entries[:_MAX_ITEMS_PER_FEED]:
                published_at = _parse_published(entry)
                if since and published_at < since:
                    continue
                posts.append(
                    NormalizedPost(
                        platform=self.platform,
                        external_id=entry.get("id") or entry.get("link"),
                        author=entry.get("author"),
                        text=f"{entry.get('title', '')} {entry.get('summary', '')}".strip(),
                        url=entry.get("link"),
                        published_at=published_at,
                        engagement_count=0,  # RSS carries no engagement signal
                    )
                )
        return posts


def _parse_published(entry: dict) -> datetime:
    for key in ("published", "updated"):
        value = entry.get(key)
        if value:
            try:
                dt = parsedate_to_datetime(value)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except (TypeError, ValueError):
                continue
    return datetime.now(timezone.utc)
