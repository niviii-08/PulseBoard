"""
NewsAPI collector for the Global Trend Intelligence Platform (Phase 2).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional

import httpx

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedArticle, NormalizedPost
from app.core.config import settings

logger = logging.getLogger("pulseboard.collectors.news_api")

class NewsAPICollector(BaseCollector):
    platform = "news_api"
    
    @property
    def status(self) -> str:
        if getattr(settings, "NEWSAPI_KEY", None):
            return CollectorStatus.CONNECTED
        return CollectorStatus.NOT_CONFIGURED

    async def collect_articles(self, query: str, since: Optional[datetime] = None) -> List[NormalizedArticle]:
        """Fetches from NewsAPI 'everything' endpoint into NormalizedArticles."""
        api_key = getattr(settings, "NEWSAPI_KEY", None)
        if not api_key:
            logger.warning("NewsAPI key not configured; skipping collection.")
            return []

        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query or "world",
            "apiKey": api_key,
            "sortBy": "publishedAt",
            "pageSize": 20,
            "language": "en"
        }
        if since:
            params["from"] = since.isoformat()

        articles = []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, params=params)
                res.raise_for_status()
                data = res.json()
                
                for item in data.get("articles", []):
                    pub_str = item.get("publishedAt")
                    published_at = datetime.now(timezone.utc)
                    if pub_str:
                        try:
                            # NewsAPI returns ISO8601 string, often ending with Z
                            published_at = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                        except ValueError:
                            pass

                    articles.append(NormalizedArticle(
                        source=item.get("source", {}).get("name"),
                        source_type="news_api",
                        title=item.get("title"),
                        description=item.get("description"),
                        url=item.get("url"),
                        published_at=published_at,
                        country="Global",
                        language="en",
                        category="General",
                        author=item.get("author"),
                        image_url=item.get("urlToImage"),
                        engagement=0
                    ))
        except Exception as e:
            logger.warning("NewsAPI fetch failed: %s", e)
            
        return articles

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        """Backward compatibility for existing infrastructure if needed."""
        articles = await self.collect_articles(query, since)
        return [
            NormalizedPost(
                platform=self.platform,
                external_id=a.url,
                author=a.author,
                text=f"{a.title} {a.description}".strip(),
                url=a.url,
                published_at=a.published_at,
                engagement_count=a.engagement
            )
            for a in articles
        ]
