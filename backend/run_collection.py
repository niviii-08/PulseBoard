"""Run live collection with full error tracing."""
import asyncio
import logging
import traceback
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

import httpx
import feedparser
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from app.collectors.reddit import RedditCollector
from app.collectors.bluesky import BlueskyCollector
from app.collectors.base import CollectorStatus, NormalizedPost
from app.core.database import get_db_context
from app.models.social import Brand
from app.models.trend import Mention, PlatformEnum, Topic
from app.services import sentiment_engine
from app.services.keyword_extraction import extract_keywords
from app.services import pipeline
from sqlalchemy import select

async def collect_news_direct(query: str) -> list[NormalizedPost]:
    url = f"https://news.google.com/rss/search?q={query}&hl=en"
    posts = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
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
                posts.append(NormalizedPost(
                    platform="news",
                    external_id=entry.get("id") or entry.get("link"),
                    author=entry.get("author"),
                    text=f"{entry.get('title', '')} {entry.get('summary', '')}".strip(),
                    url=entry.get("link"),
                    published_at=published_at,
                    engagement_count=0,
                ))
    except Exception as e:
        logging.error(f"[news] fetch error: {e}")
    return posts

async def ingest_posts_directly(posts: list[NormalizedPost], brand_name: str, label: str) -> int:
    """Insert mentions one-by-one, skipping duplicates."""
    if not posts:
        return 0
    inserted = 0
    try:
        async with get_db_context() as db:
            # Find brand
            res = await db.execute(select(Brand).where(Brand.name == brand_name))
            brand = res.scalar_one_or_none()
            if not brand:
                print(f"  ✗ [{label}] Brand '{brand_name}' not found")
                return 0

            # Find or create topic
            topic_name = f"{brand_name} Mentions"
            res = await db.execute(select(Topic).where(Topic.name == topic_name))
            topic = res.scalar_one_or_none()
            if not topic:
                topic = Topic(name=topic_name, description=f"Live mentions for {brand_name}", keywords=brand.keywords or [brand_name.lower()], brand_id=brand.id)
                db.add(topic)
                await db.flush()

            for post in posts:
                try:
                    score, label_sent = sentiment_engine.score_text(post.text)
                    keywords = extract_keywords(post.text)
                    mention = Mention(
                        topic_id=topic.id,
                        brand_id=brand.id,
                        platform=PlatformEnum(post.platform),
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
                    await db.rollback()
                    # Skip duplicates silently
                    if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                        continue
                    print(f"  ⚠ [{label}] Mention insert error: {e}")

            # Run pipeline for topic
            try:
                await pipeline.run_pipeline_for_topic(db, topic)
            except Exception as e:
                print(f"  ⚠ [{label}] Pipeline error: {e}")

            try:
                await pipeline.run_pipeline_for_brand(db, brand)
            except Exception as e:
                pass

            await db.commit()
            print(f"  ✓ [{label}] {inserted}/{len(posts)} posts ingested")
    except Exception as e:
        print(f"  ✗ [{label}] Session error: {e}")
        traceback.print_exc()
    return inserted

async def main():
    reddit = RedditCollector()

    print("=" * 60)
    print("  PulseBoard Live Data Collection")
    print("=" * 60)

    # Get brands
    async with get_db_context() as db:
        res = await db.execute(select(Brand).where(Brand.monitoring_enabled.is_(True)))
        brands = [(b.name, b.keywords) for b in res.scalars().all()]
        if not brands:
            print("\nNo brands found, creating defaults...")
            for name, kws in [("Technology", ["AI","software","technology"]), ("Business", ["economy","market","business"]), ("Science", ["science","research","climate"])]:
                db.add(Brand(name=name, aliases=[name.lower()], keywords=kws, monitoring_enabled=True))
            await db.commit()
            res = await db.execute(select(Brand).where(Brand.monitoring_enabled.is_(True)))
            brands = [(b.name, b.keywords) for b in res.scalars().all()]

    print(f"\nBrands: {[b[0] for b in brands]}")
    total_posts = 0

    for brand_name, keywords in brands:
        query = (keywords or [brand_name])[0]
        print(f"\n── '{query}' for '{brand_name}' ──")

        # News
        news_posts = await collect_news_direct(query)
        print(f"  → [news]    fetched {len(news_posts)} posts")
        total_posts += await ingest_posts_directly(news_posts, brand_name, "news")

        # Reddit
        try:
            reddit_posts = await reddit.collect(query)
            print(f"  → [reddit]  fetched {len(reddit_posts)} posts")
            total_posts += await ingest_posts_directly(reddit_posts, brand_name, "reddit")
        except Exception as e:
            print(f"  ✗ [reddit]  fetch error: {e}")

    print(f"\n{'=' * 60}")
    print(f"  ✅ DONE! {total_posts} posts ingested across {len(brands)} brands")
    print(f"{'=' * 60}")

asyncio.run(main())
