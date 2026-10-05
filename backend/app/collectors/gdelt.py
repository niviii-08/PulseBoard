"""
GDELT collector for the Global Trend Intelligence Platform (Phase 3).
Connects to the public GDELT v2 Doc API.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional

import httpx

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedArticle, NormalizedPost

logger = logging.getLogger("pulseboard.collectors.gdelt")

class GDELTCollector(BaseCollector):
    platform = "gdelt"
    
    @property
    def status(self) -> str:
        # GDELT is open and doesn't require an API key
        return CollectorStatus.CONNECTED

    async def collect_articles(self, query: str, since: Optional[datetime] = None) -> List[NormalizedArticle]:
        """Fetches from GDELT 2.0 Doc API into NormalizedArticles."""
        url = "https://api.gdeltproject.org/api/v2/doc/doc"
        # GDELT v2 Doc API maxrecords caps at 250
        params = {
            "query": query or "world",
            "mode": "artlist",
            "maxrecords": "50",
            "format": "json"
        }

        articles = []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, params=params)
                res.raise_for_status()
                
                # GDELT can sometimes return invalid JSON if empty, handle gracefully
                try:
                    data = res.json()
                except Exception:
                    data = {}
                
                for item in data.get("articles", []):
                    # GDELT timestamp format: YYYYMMDDTHHMMSSZ
                    pub_str = item.get("seendate")
                    published_at = datetime.now(timezone.utc)
                    if pub_str and len(pub_str) == 16:
                        try:
                            published_at = datetime.strptime(pub_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
                        except ValueError:
                            pass

                    title = item.get("title", "")
                    if not title:
                        continue
                        
                    articles.append(NormalizedArticle(
                        source=item.get("domain"),
                        source_type="gdelt",
                        title=title,
                        description=None, # GDELT Doc API artlist mode doesn't provide excerpts natively without extra params
                        url=item.get("url"),
                        published_at=published_at,
                        country=item.get("sourcecountry", "Global"),
                        language=item.get("language", "English"),
                        category="News",
                        author=None,
                        image_url=item.get("socialimage"),
                        engagement=0
                    ))
        except Exception as e:
            logger.warning("GDELT fetch failed: %s", e)
            
        return articles

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        """Backward compatibility for existing infrastructure if needed."""
        articles = await self.collect_articles(query, since)
        return [
            NormalizedPost(
                platform=self.platform,
                external_id=a.url,
                author=a.author,
                text=f"{a.title}".strip(),
                url=a.url,
                published_at=a.published_at,
                engagement_count=a.engagement
            )
            for a in articles
        ]
