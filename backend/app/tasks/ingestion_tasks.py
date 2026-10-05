"""
Celery tasks wiring the collectors (app/collectors) to the pipeline
(app/services/pipeline.py). Two tasks:

  - collect_and_process: the production-shape task. For every
    monitoring-enabled Brand, runs every collector whose status is
    "connected" (see app.collectors.registry) against that brand's
    keywords, ingests whatever comes back, then reruns the engine
    pipeline for every topic/brand touched. With no collector
    credentials configured, only NewsCollector runs (RSS needs no
    key) -- this is real, not simulated, but this sandboxed build
    environment has no general internet egress to exercise it against
    a live feed (see app/collectors/news.py's docstring).

  - refresh_demo_data: regenerates the scripted demo dataset (see
    app/collectors/demo.py) and runs the same pipeline over it. This is
    what POST /api/v1/collectors/run?source=demo calls, and what
    scripts/seed_demo_data.py uses for the initial local seed.

Both are intentionally *not* "insert some random mentions every 5
seconds" (the previous version of this file) -- every mention now goes
through sentiment scoring, topic assignment, and the full engine chain
before the task returns.
"""

from __future__ import annotations

import asyncio
import logging

from app.collectors.demo import DemoCollector
from app.collectors.news import NewsCollector
from app.collectors.reddit import RedditCollector
from app.collectors.youtube import YouTubeCollector
from app.collectors.x import XCollector
from app.collectors.bluesky import BlueskyCollector
from app.collectors.base import CollectorStatus
from app.core.database import get_db_context
from app.models.social import Brand
from app.services import pipeline
from app.workers.celery_app import celery_app

logger = logging.getLogger("pulseboard.tasks.ingestion")


async def _collect_and_process() -> dict:
    collectors = [
        NewsCollector(),
        RedditCollector(),
        YouTubeCollector(),
        XCollector(),
        BlueskyCollector()
    ]
    active_collectors = [c for c in collectors if c.status == CollectorStatus.CONNECTED]
    
    touched_topics = {}

    async with get_db_context() as db:
        from sqlalchemy import select

        res = await db.execute(select(Brand).where(Brand.monitoring_enabled.is_(True)))
        brands = res.scalars().all()

        for brand in brands:
            query_terms = (brand.keywords or [brand.name])[:1]
            for term in query_terms:
                for collector in active_collectors:
                    posts = await collector.collect(term)
                    if not posts:
                        continue
                    topics = await pipeline.ingest_normalized_posts(
                        db, posts, source_is_demo=False, forced_brand_name=brand.name
                    )
                    for t in topics:
                        touched_topics[t.id] = t

        for topic in touched_topics.values():
            await pipeline.run_pipeline_for_topic(db, topic)
        for brand in brands:
            await pipeline.run_pipeline_for_brand(db, brand)

        await db.commit()

    return {"topics_touched": len(touched_topics), "brands_checked": len(brands)}


async def _refresh_demo_data() -> dict:
    demo = DemoCollector()
    demo_posts = demo.generate_all()

    async with get_db_context() as db:
        from sqlalchemy import select

        # Make sure the scripted scenarios' brands exist so their mentions
        # can be brand-scoped (risk engine needs Mention.brand_id set).
        scenario_brands = {p.brand_name for p in demo_posts if p.brand_name}
        for name in scenario_brands:
            res = await db.execute(select(Brand).where(Brand.name == name))
            if not res.scalar_one_or_none():
                db.add(Brand(name=name, aliases=[name], keywords=[name.lower()], monitoring_enabled=True))
        await db.flush()

        touched_topics = {}
        by_topic: dict[str, list] = {}
        for p in demo_posts:
            by_topic.setdefault(p.topic_name, []).append(p)

        for scenario in demo.scenarios():
            posts = by_topic.get(scenario.topic_name, [])
            if not posts:
                continue
            topics = await pipeline.ingest_normalized_posts(
                db,
                posts,
                source_is_demo=True,
                forced_topic_name=scenario.topic_name,
                forced_topic_keywords=scenario.topic_keywords,
                forced_brand_name=scenario.brand_name,
            )
            for t in topics:
                touched_topics[t.id] = t

        for topic in touched_topics.values():
            await pipeline.run_pipeline_for_topic(db, topic)

        res = await db.execute(select(Brand))
        for brand in res.scalars().all():
            await pipeline.run_pipeline_for_brand(db, brand)

        await db.commit()

    return {"topics_touched": len(touched_topics), "posts_ingested": len(demo_posts)}


@celery_app.task(name="ingestion.collect_and_process")
def collect_and_process() -> dict:
    return asyncio.run(_collect_and_process())


@celery_app.task(name="ingestion.refresh_demo_data")
def refresh_demo_data() -> dict:
    return asyncio.run(_refresh_demo_data())

async def _collect_global_news() -> dict:
    from app.collectors.news_api import NewsAPICollector
    from app.collectors.gdelt import GDELTCollector
    
    api = NewsAPICollector()
    gdelt = GDELTCollector()
    
    categories = ["breaking news", "technology", "business", "science", "sports", "entertainment", "health"]
    articles = []
    
    if api.status == CollectorStatus.CONNECTED:
        for cat in categories:
            res = await api.collect_articles(query=cat)
            articles.extend(res)
            
    if gdelt.status == CollectorStatus.CONNECTED:
        for cat in categories:
            res = await gdelt.collect_articles(query=cat)
            articles.extend(res)
    
    if not articles:
        return {"status": "no_articles_found"}
        
    async with get_db_context() as db:
        topics = await pipeline.ingest_normalized_articles(db, articles)
        for topic in topics:
            await pipeline.run_pipeline_for_topic(db, topic)
        await db.commit()
        
    return {"status": "success", "articles_ingested": len(articles), "topics_touched": len(topics)}

@celery_app.task(name="ingestion.collect_global_news")
def collect_global_news() -> dict:
    return asyncio.run(_collect_global_news())

async def _recompute_emerging_trends() -> dict:
    from app.models.trend import Topic
    from sqlalchemy import select
    async with get_db_context() as db:
        res = await db.execute(select(Topic))
        topics = res.scalars().all()
        for topic in topics:
            await pipeline.rebuild_trend_snapshots(db, topic)
        await db.commit()
    return {"status": "success", "topics": len(topics)}

@celery_app.task(name="ingestion.recompute_emerging_trends")
def recompute_emerging_trends() -> dict:
    return asyncio.run(_recompute_emerging_trends())

async def _rebuild_topic_aggregates() -> dict:
    from app.models.trend import Topic
    from sqlalchemy import select
    async with get_db_context() as db:
        res = await db.execute(select(Topic))
        topics = res.scalars().all()
        for topic in topics:
            await pipeline.generate_ai_insight(db, topic)
            from app.models.social import Brand
            res_brand = await db.execute(select(Brand).where(Brand.id == topic.brand_id))
            brand = res_brand.scalar_one_or_none()
            if brand:
                await pipeline.rebuild_brand_risk(db, brand)
        await db.commit()
    return {"status": "success", "topics": len(topics)}

@celery_app.task(name="ingestion.rebuild_topic_aggregates")
def rebuild_topic_aggregates() -> dict:
    return asyncio.run(_rebuild_topic_aggregates())
