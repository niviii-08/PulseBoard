import httpx
from datetime import datetime, timezone
import logging
import feedparser
from email.utils import parsedate_to_datetime

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost

logger = logging.getLogger("pulseboard.collectors.reddit")

class RedditCollector(BaseCollector):
    platform = "reddit"
    
    @property
    def status(self) -> str:
        # Since we are pivoting to use Reddit's public RSS feeds, it is always connected.
        return CollectorStatus.CONNECTED

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        posts: list[NormalizedPost] = []
        # Fallback to Reddit's public RSS endpoints to completely bypass their broken developer portal
        search_url = f"https://www.reddit.com/search.rss?q={query}&sort=new"
        
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                res = await client.get(
                    search_url,
                    # Reddit requires a custom User-Agent for RSS fetching, otherwise it throws 429 Too Many Requests
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PulseBoardBot/1.0"}
                )
                res.raise_for_status()
                parsed = feedparser.parse(res.content)
                
                for entry in parsed.entries[:15]:
                    published_at = datetime.now(timezone.utc)
                    for key in ("published", "updated"):
                        val = entry.get(key)
                        if val:
                            try:
                                dt = parsedate_to_datetime(val)
                                published_at = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
                                break
                            except (TypeError, ValueError):
                                pass
                                
                    if since and published_at < since:
                        continue
                        
                    posts.append(
                        NormalizedPost(
                            platform=self.platform,
                            external_id=entry.get("id", ""),
                            author=entry.get("author", "Unknown"),
                            text=f"{entry.get('title', '')} {entry.get('summary', '')}".strip(),
                            url=entry.get("link", ""),
                            published_at=published_at,
                            engagement_count=0  # RSS does not natively pass upvote counts
                        )
                    )
        except Exception as e:
            logger.error("Reddit RSS collection failed: %s", e)
            
        return posts
