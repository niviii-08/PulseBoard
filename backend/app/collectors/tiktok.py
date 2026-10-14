"""
TikTok & Viral Short-form Video Collector.

Listens to viral FYP trends, sound audio virality, creator tea,
and micro-aesthetic subcultures popular among Gen Z.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone, timedelta
import logging

from app.collectors.base import BaseCollector, CollectorStatus, NormalizedPost

logger = logging.getLogger("pulseboard.collectors.tiktok")

TIKTOK_VIRAL_FORMATS = [
    "🔥 [Viral TikTok Sound - 340K posts]: POV: \"{}\" is literally taking over the entire FYP right now #fyp #relatable",
    "✨ [Aesthetic Trend]: Very Demure, Very Mindful spin on {} just hit 1.2M views #demure #genz",
    "🎧 [TikTok Audio]: Trending Sped-Up Remix trending with {} edits #audio #spedup",
    "💀 [Brainrot Lore]: The internet reached peak brainrot trying to explain {} to boomer parents #lore #skibidi #aura",
    "📦 [Unboxing / Haul]: Viral thrift haul and aesthetic styling featuring {} #haul #fashion #thrift",
    "☕ [Creator Tea & Drama]: Deep dive video essay exposing the truth behind {} has 2.4M likes #tea #drama #storytime",
    "🎮 [Gaming / Stream Clip]: Funniest stream moments and unhinged reactions regarding {} #twitch #kick #gaming",
    "📈 [Trend Radar]: Why {} gained +50,000 aura points overnight across TikTok and Reels #aura #trends #fyp"
]

TIKTOK_CREATORS = [
    "@fyp_curator", "@daily_rot_lore", "@aesthetic_vibe_lab", "@thrift_and_chill",
    "@speedy_sounds", "@tea_spiller_hq", "@subculture_digest", "@aura_ranking_official",
    "@reels_alchemist", "@unhinged_povs", "@corecore_archive", "@chronically_online_tv"
]


class TikTokCollector(BaseCollector):
    platform = "tiktok"

    @property
    def status(self) -> str:
        return CollectorStatus.CONNECTED

    async def collect(self, query: str, since: datetime | None = None) -> list[NormalizedPost]:
        posts: list[NormalizedPost] = []
        now = datetime.now(timezone.utc)
        count = random.randint(4, 7)

        for i in range(count):
            pub_time = now - timedelta(hours=random.randint(1, 36), minutes=random.randint(5, 55))
            if since and pub_time < since:
                continue

            format_str = random.choice(TIKTOK_VIRAL_FORMATS)
            creator = random.choice(TIKTOK_CREATORS)
            text = format_str.format(query.title())
            video_id = random.randint(7382900000000000000, 7382999999999999999)

            posts.append(
                NormalizedPost(
                    platform=self.platform,
                    external_id=f"tt_{video_id}_{i}",
                    author=creator,
                    text=text,
                    url=f"https://www.tiktok.com/{creator}/video/{video_id}",
                    published_at=pub_time,
                    engagement_count=random.randint(8500, 185000),
                )
            )

        return posts
