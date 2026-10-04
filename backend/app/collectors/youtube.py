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

import httpx
from datetime import datetime, timezone
import logging

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost
from app.core.config import settings

logger = logging.getLogger("pulseboard.collectors.youtube")

class YouTubeCollector(BaseCollector):
    platform = "youtube"

    @property
    def status(self) -> str:
        return CollectorStatus.CONNECTED if settings.YOUTUBE_API_KEY else CollectorStatus.NOT_CONFIGURED

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        if self.status != CollectorStatus.CONNECTED:
            return []

        posts: list[NormalizedPost] = []
        search_url = "https://www.googleapis.com/youtube/v3/search"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    search_url,
                    params={
                        "part": "snippet",
                        "q": query,
                        "type": "video",
                        "maxResults": 15,
                        "key": settings.YOUTUBE_API_KEY
                    }
                )
                res.raise_for_status()
                data = res.json()
                
                for item in data.get("items", []):
                    snippet = item.get("snippet", {})
                    published_at_str = snippet.get("publishedAt")
                    try:
                        published_at = datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        published_at = datetime.now(timezone.utc)
                        
                    if since and published_at < since:
                        continue
                        
                    video_id = item.get("id", {}).get("videoId", "")
                    
                    posts.append(
                        NormalizedPost(
                            platform=self.platform,
                            external_id=video_id,
                            author=snippet.get("channelTitle"),
                            text=f"{snippet.get('title')} - {snippet.get('description')}",
                            url=f"https://www.youtube.com/watch?v={video_id}" if video_id else None,
                            published_at=published_at,
                            engagement_count=0  # Could do a second video API call here for views if needed
                        )
                    )
        except Exception as e:
            logger.error("YouTube collection failed: %s", e)
            
        return posts
