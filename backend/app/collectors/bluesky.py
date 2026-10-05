import httpx
from datetime import datetime, timezone
import logging

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost

logger = logging.getLogger("pulseboard.collectors.bluesky")

class BlueskyCollector(BaseCollector):
    platform = "bluesky"
    
    @property
    def status(self) -> str:
        # ATProto provides a completely open public search endpoint 
        # so this is always connected natively with no auth required.
        return CollectorStatus.CONNECTED

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        posts: list[NormalizedPost] = []
        search_url = "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    search_url,
                    params={
                        "q": query,
                        "limit": 15
                    },
                    headers={
                        "User-Agent": "PulseBoardBot/1.0"
                    }
                )
                res.raise_for_status()
                data = res.json()
                
                for item in data.get("posts", []):
                    record = item.get("record", {})
                    created_at_str = record.get("createdAt")
                    
                    if not created_at_str:
                        continue
                        
                    try:
                        published_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        published_at = datetime.now(timezone.utc)
                        
                    if since and published_at < since:
                        continue
                        
                    uri = item.get("uri", "")
                    # Construct public bsky URL from URI (did:plc.../app.bsky.feed.post/...)
                    url = None
                    if uri.startswith("at://"):
                        parts = uri.split("/")
                        if len(parts) >= 5:
                            url = f"https://bsky.app/profile/{parts[2]}/post/{parts[4]}"
                    
                    engagement_count = item.get("replyCount", 0) + item.get("repostCount", 0) + item.get("likeCount", 0)
                    author = item.get("author", {}).get("handle", "Unknown")
                    
                    posts.append(
                        NormalizedPost(
                            platform=self.platform,
                            external_id=uri,
                            author=author,
                            text=record.get("text", ""),
                            url=url,
                            published_at=published_at,
                            engagement_count=engagement_count
                        )
                    )
        except Exception as e:
            logger.error("Bluesky collection failed: %s", e)
            
        return posts
