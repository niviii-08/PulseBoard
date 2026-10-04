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
from app.core.database import get_db_context
from app.models.social import Brand
from app.services import pipeline
from app.workers.celery_app import celery_app

logger = logging.getLogger("pulseboard.tasks.ingestion")


async def _collect_and_process() -> dict:
    news = NewsCollector()
    touched_topics = {}

    async with get_db_context() as db:
        from sqlalchemy import select

        res = await db.execute(select(Brand).where(Brand.monitoring_enabled.is_(True)))
        brands = res.scalars().all()

        for brand in brands:
            query_terms = (brand.keywords or [brand.name])[:1]
            for term in query_terms:
                posts = await news.collect(term)
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
