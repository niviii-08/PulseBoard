"""
Run live multi-platform web scraping and Gen-Z social intelligence ingestion.

Scrapes:
- YouTube (trending videos & community comments / reactions)
- X / Twitter (viral tweets, quote retweets, hot takes)
- TikTok (FYP sounds, aesthetic subcultures, creator tea)
- Reddit (Gen-Z subreddits, memes, discussions)
- Bluesky (open decentralized social posts)
- Google News RSS (breaking news)
"""
import asyncio
import logging
import traceback
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import httpx
import feedparser

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

from app.collectors.reddit import RedditCollector
from app.collectors.youtube import YouTubeCollector
from app.collectors.x import XCollector
from app.collectors.bluesky import BlueskyCollector
from app.collectors.tiktok import TikTokCollector
from app.collectors.base import NormalizedPost
from app.core.database import get_db_context
from app.models.social import Brand
from app.models.trend import Mention, PlatformEnum, Topic
from app.services import sentiment_engine
from app.services.keyword_extraction import extract_keywords
from app.services import pipeline
from sqlalchemy import select

GENZ_TARGET_BRANDS = [
    {
        "name": "Kai Cenat & Streamers",
        "keywords": ["kai cenat", "ishowspeed", "streamer tea", "amp", "twitch clips"],
        "aliases": ["kaicenat", "speed", "amp streamers"]
    },
    {
        "name": "Sabrina Carpenter & Pop Icons",
        "keywords": ["sabrina carpenter", "billie eilish", "chappell roan", "brat summer", "pop music"],
        "aliases": ["sabrina", "billie", "chappell"]
    },
    {
        "name": "Brainrot Lore & Meme Culture",
        "keywords": ["aura points", "skibidi", "very demure", "looksmaxxing", "mewing"],
        "aliases": ["brainrot", "aura", "demure"]
    },
    {
        "name": "GTA 6 & Gaming Culture",
        "keywords": ["gta 6", "valorant", "roblox", "minecraft", "playstation"],
        "aliases": ["gta", "rockstar games", "valorant clips"]
    },
    {
        "name": "Desi Gen-Z & Creator Hub",
        "keywords": ["samay raina", "carryminati", "india reels", "standup comedy", "bollywood tea"],
        "aliases": ["samay", "carry", "desi comedy"]
    },
    {
        "name": "AI Hustle & College Life",
        "keywords": ["chatgpt homework", "tech internship", "duolingo tiktok", "layoff trauma"],
        "aliases": ["ai student", "tech bro", "internship"]
    }
]


async def collect_news_direct(query: str) -> list[NormalizedPost]:
    url = f"https://news.google.com/rss/search?q={query}&hl=en"
    posts = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
            res.raise_for_status()
            parsed = feedparser.parse(res.content)
            for entry in parsed.entries[:8]:
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
                posts.append(NormalizedPost(
                    platform="news",
                    external_id=entry.get("id") or entry.get("link"),
                    author=entry.get("author") or "Google News",
                    text=f"📰 [News] {entry.get('title', '')} — {entry.get('summary', '')}".strip(),
                    url=entry.get("link"),
                    published_at=published_at,
                    engagement_count=0,
                ))
    except Exception as e:
        logging.warning(f"[news] fetch error: {e}")
    return posts


async def ingest_posts_directly(posts: list[NormalizedPost], brand_name: str, label: str) -> int:
    """Insert mentions one-by-one, skipping duplicates, and trigger analytics pipeline."""
    if not posts:
        return 0
    inserted = 0
    try:
        async with get_db_context() as db:
            res = await db.execute(select(Brand).where(Brand.name == brand_name))
            brand = res.scalar_one_or_none()
            if not brand:
                print(f"  ✗ [{label}] Brand '{brand_name}' not found")
                return 0

            topic_name = f"{brand_name} Buzz"
            res = await db.execute(select(Topic).where(Topic.name == topic_name))
            topic = res.scalar_one_or_none()
            if not topic:
                topic = Topic(
                    name=topic_name,
                    description=f"Live Gen-Z social mentions & sentiment for {brand_name}",
                    keywords=brand.keywords or [brand_name.lower()],
                    brand_id=brand.id
                )
                db.add(topic)
                await db.flush()

            for post in posts:
                try:
                    score, label_sent = sentiment_engine.score_text(post.text)
                    keywords = extract_keywords(post.text)
                    
                    # Ensure platform enum safety
                    try:
                        p_enum = PlatformEnum(post.platform)
                    except ValueError:
                        p_enum = PlatformEnum.web

                    async with db.begin_nested():
                        mention = Mention(
                            topic_id=topic.id,
                            brand_id=brand.id,
                            platform=p_enum,
                            external_id=post.external_id,
                            author=post.author,
                            content=post.text[:2000] if post.text else None,
                            url=post.url,
                            sentiment_score=score,
                            sentiment_label=label_sent,
                            engagement_count=post.engagement_count,
                            keywords=keywords,
                            posted_at=post.published_at,
                            collected_at=datetime.now(timezone.utc),
                            source_is_demo=False,
                        )
                        db.add(mention)
                        await db.flush()
                    inserted += 1
                except Exception as e:
                    continue

            # Safely commit all inserted mentions first
            await db.commit()

            # Now update topic metrics & snapshots in separate resilient blocks
            try:
                await pipeline.run_pipeline_for_topic(db, topic)
                await db.commit()
            except Exception as e:
                await db.rollback()

            try:
                await pipeline.run_pipeline_for_brand(db, brand)
                await db.commit()
            except Exception as e:
                await db.rollback()

            print(f"  ✓ [{label:<10}] {inserted}/{len(posts)} posts ingested and committed")
    except Exception as e:
        print(f"  ✗ [{label}] Ingestion error: {e}")
        traceback.print_exc()
    return inserted


async def main():
    print("=" * 65)
    print("  🔥 PulseBoard Live Gen-Z Social Media Scraper & Listening")
    print("=" * 65)

    # Initialize all active collectors
    youtube_col = YouTubeCollector()
    x_col = XCollector()
    tiktok_col = TikTokCollector()
    reddit_col = RedditCollector()
    bluesky_col = BlueskyCollector()

    # Ensure Gen-Z Brands exist in Database
    async with get_db_context() as db:
        res = await db.execute(select(Brand))
        existing_brands = {b.name: b for b in res.scalars().all()}
        
        for gb in GENZ_TARGET_BRANDS:
            if gb["name"] not in existing_brands:
                db.add(Brand(
                    name=gb["name"],
                    aliases=gb["aliases"],
                    keywords=gb["keywords"],
                    monitoring_enabled=True
                ))
        await db.commit()

        # Fetch all active monitoring brands
        res = await db.execute(select(Brand).where(Brand.monitoring_enabled.is_(True)))
        brands = [(b.name, b.keywords) for b in res.scalars().all()]

    print(f"\nMonitoring {len(brands)} Gen-Z Topics/Brands:")
    for b_name, _ in brands:
        print(f"  • {b_name}")

    total_all_posts = 0

    for brand_name, keywords in brands:
        query = (keywords or [brand_name])[0]
        print(f"\n─────────────────────────────────────────────────────────────")
        print(f"  ⚡ Live Scraping: '{query}' for '{brand_name}'")
        print(f"─────────────────────────────────────────────────────────────")

        # 1. YouTube (Trending Videos + Community Comments)
        try:
            yt_posts = await youtube_col.collect(query)
            print(f"  → [youtube]   scraped {len(yt_posts)} videos & top comments")
            total_all_posts += await ingest_posts_directly(yt_posts, brand_name, "youtube")
        except Exception as e:
            print(f"  ⚠ [youtube]   error: {e}")

        # 2. X / Twitter (Viral Tweets, Hot Takes & Quote Tweets)
        try:
            x_posts = await x_col.collect(query)
            print(f"  → [x/twitter] scraped {len(x_posts)} viral tweets & discourse")
            total_all_posts += await ingest_posts_directly(x_posts, brand_name, "x")
        except Exception as e:
            print(f"  ⚠ [x/twitter] error: {e}")

        # 3. TikTok (FYP Viral Sounds & Micro-trends)
        try:
            tt_posts = await tiktok_col.collect(query)
            print(f"  → [tiktok]    scraped {len(tt_posts)} FYP sounds & aesthetics")
            total_all_posts += await ingest_posts_directly(tt_posts, brand_name, "tiktok")
        except Exception as e:
            print(f"  ⚠ [tiktok]    error: {e}")

        # 4. Reddit (Gen-Z Subreddits, Memes & Threads)
        try:
            rd_posts = await reddit_col.collect(query)
            print(f"  → [reddit]    scraped {len(rd_posts)} subreddit threads")
            total_all_posts += await ingest_posts_directly(rd_posts, brand_name, "reddit")
        except Exception as e:
            print(f"  ⚠ [reddit]    error: {e}")

        # 5. Bluesky (Public Social Feed)
        try:
            bs_posts = await bluesky_col.collect(query)
            if bs_posts:
                print(f"  → [bluesky]   scraped {len(bs_posts)} public posts")
                total_all_posts += await ingest_posts_directly(bs_posts, brand_name, "bluesky")
        except Exception as e:
            pass

        # 6. Google News (Breaking Culture Headlines)
        try:
            news_posts = await collect_news_direct(query)
            if news_posts:
                print(f"  → [news]      scraped {len(news_posts)} headlines")
                total_all_posts += await ingest_posts_directly(news_posts, brand_name, "news")
        except Exception as e:
            pass

    print(f"\n{'=' * 65}")
    print(f"  🎉 SUCCESS: {total_all_posts} Gen-Z social posts & comments ingested into PulseBoard!")
    print(f"{'=' * 65}\n")


if __name__ == "__main__":
    asyncio.run(main())
