"""
Central list of collectors + their honest status, backing GET /api/v1/sources.
"""

from __future__ import annotations

from app.collectors.demo import DemoCollector
from app.collectors.news import NewsCollector
from app.collectors.reddit import RedditCollector
from app.collectors.x import XCollector
from app.collectors.youtube import YouTubeCollector

_news = NewsCollector()
_reddit = RedditCollector()
_youtube = YouTubeCollector()
_x = XCollector()
_demo = DemoCollector()


def collector_statuses() -> list[dict]:
    return [
        {"source": "Demo", "platform": "demo", "status": _demo.status},
        {"source": "News (RSS)", "platform": "news", "status": _news.status},
        {"source": "Reddit", "platform": "reddit", "status": _reddit.status},
        {"source": "YouTube", "platform": "youtube", "status": _youtube.status},
        {"source": "X / Twitter", "platform": "x", "status": _x.status},
    ]
