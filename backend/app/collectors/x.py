"""
X/Twitter collector -- optional, disabled by default.

The spec is explicit here: X's API is paid/restricted enough that this
project treats it as an optional connector rather than building an
unreliable scraper against ToS. Always reports status "optional" (not
"not_configured") so the UI can distinguish "we chose not to build this
without an official, paid API key" from "this is free and just needs a
key" (which is true of Reddit/YouTube above).
"""

import httpx
from datetime import datetime, timezone
import logging

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost
from app.core.config import settings

logger = logging.getLogger("pulseboard.collectors.x")

class XCollector(BaseCollector):
    platform = "x"
    
    @property
    def status(self) -> str:
        # We consider X optional natively. We only mark it connected if keys exist.
        if hasattr(settings, "X_BEARER_TOKEN") and settings.X_BEARER_TOKEN:
            return CollectorStatus.CONNECTED
        return CollectorStatus.OPTIONAL

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        if self.status != CollectorStatus.CONNECTED:
            return []

        posts: list[NormalizedPost] = []
        search_url = "https://api.twitter.com/2/tweets/search/recent"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    search_url,
                    params={
                        "query": query,
                        "max_results": 15,
                        "tweet.fields": "created_at,public_metrics,author_id"
                    },
                    headers={
                        "Authorization": f"Bearer {settings.X_BEARER_TOKEN}",
                        "User-Agent": "PulseBoardBot/1.0"
                    }
                )
                res.raise_for_status()
                data = res.json()
                
                for item in data.get("data", []):
                    created_at_str = item.get("created_at")
                    try:
                        published_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        published_at = datetime.now(timezone.utc)
                        
                    if since and published_at < since:
                        continue
                        
                    tweet_id = item.get("id", "")
                    metrics = item.get("public_metrics", {})
                    engagement = metrics.get("retweet_count", 0) + metrics.get("reply_count", 0) + metrics.get("like_count", 0)
                    
                    posts.append(
                        NormalizedPost(
                            platform=self.platform,
                            external_id=tweet_id,
                            author=item.get("author_id", "Unknown"),
                            text=item.get("text", ""),
                            url=f"https://x.com/i/web/status/{tweet_id}" if tweet_id else None,
                            published_at=published_at,
                            engagement_count=engagement
                        )
                    )
        except Exception as e:
            logger.error("X/Twitter collection failed: %s", e)
            
        return posts
