"""
Central list of collectors + their honest status, backing GET /api/v1/sources.
"""

from __future__ import annotations

from app.collectors.demo import DemoCollector
from app.collectors.news import NewsCollector
from app.collectors.reddit import RedditCollector
from app.collectors.x import XCollector
from app.collectors.youtube import YouTubeCollector
from app.collectors.bluesky import BlueskyCollector
from app.collectors.news_api import NewsAPICollector
from app.collectors.gdelt import GDELTCollector

_news = NewsCollector()
_reddit = RedditCollector()
_youtube = YouTubeCollector()
_x = XCollector()
_bluesky = BlueskyCollector()
_demo = DemoCollector()
_news_api = NewsAPICollector()
_gdelt = GDELTCollector()


def collector_statuses() -> list[dict]:
    return [
        {"source": "Demo", "platform": "demo", "status": _demo.status},
        {"source": "News (RSS)", "platform": "news", "status": _news.status},
        {"source": "Reddit", "platform": "reddit", "status": _reddit.status},
        {"source": "YouTube", "platform": "youtube", "status": _youtube.status},
        {"source": "Bluesky", "platform": "bluesky", "status": _bluesky.status},
        {"source": "X / Twitter", "platform": "x", "status": _x.status},
        {"source": "NewsAPI", "platform": "news_api", "status": _news_api.status},
        {"source": "GDELT", "platform": "gdelt", "status": _gdelt.status},
    ]
