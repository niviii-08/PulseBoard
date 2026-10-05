from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from collections import defaultdict
from app.core.database import get_db
from app.models.content import ContentItem
from app.models.trend import Topic, TrendSnapshot
import uuid

router = APIRouter()

@router.get("/dashboard", summary="Get global map dashboard geographic data")
async def get_countries_dashboard(db: AsyncSession = Depends(get_db)):
    # 1. Fetch all content items
    stmt = select(ContentItem).where(ContentItem.country_name != None)
    res = await db.execute(stmt)
    items = res.scalars().all()

    # 2. Group by country
    country_data = defaultdict(lambda: {
        "articles": 0,
        "sentiment_sum": 0.0,
        "categories": defaultdict(int),
        "sources": defaultdict(int),
        "topic_ids": defaultdict(int)
    })

    for item in items:
        c = item.country_name
        country_data[c]["articles"] += 1
        country_data[c]["sentiment_sum"] += item.sentiment
        if item.category:
            country_data[c]["categories"][item.category] += 1
        if item.source:
            country_data[c]["sources"][item.source] += 1
        
        # item.topics_json is a list of topic UUID strings
        if item.topics_json:
            for t_id in item.topics_json:
                country_data[c]["topic_ids"][t_id] += 1

    # 3. Fetch all topics and their latest trend snapshot (for "Fastest Growing Topic" and topicnames)
    topics_res = await db.execute(select(Topic.id, Topic.name))
    topic_map = {str(t.id): t.name for t in topics_res.all()}

    snapshots_res = await db.execute(
        select(TrendSnapshot.topic_id, TrendSnapshot.growth_rate)
        .order_by(TrendSnapshot.timestamp.desc())
    )
    
    # store only the latest snapshot growth rate per topic
    topic_growth = {}
    for snapshot in snapshots_res.all():
        tid = str(snapshot.topic_id)
        if tid not in topic_growth:
            topic_growth[tid] = snapshot.growth_rate

    # 4. Construct response
    results = []
    for c, data in country_data.items():
        avg_sent = data["sentiment_sum"] / data["articles"] if data["articles"] > 0 else 0
        
        # Sort top categories
        top_categories = sorted(data["categories"].items(), key=lambda x: x[1], reverse=True)[:3]
        top_categories_names = [x[0] for x in top_categories]

        # Sort top sources
        top_sources = sorted(data["sources"].items(), key=lambda x: x[1], reverse=True)[:3]
        top_sources_names = [x[0] for x in top_sources]

        # Sort top topics
        top_topic_ids = sorted(data["topic_ids"].items(), key=lambda x: x[1], reverse=True)[:5]
        top_topics_names = [topic_map.get(tid, "Unknown") for tid, _ in top_topic_ids]

        # Fastest growing topic in this country
        fastest_topic_name = "None"
        fastest_growth = -999.0
        for tid, _ in data["topic_ids"].items():
            if topic_growth.get(tid, 0) > fastest_growth:
                fastest_growth = topic_growth.get(tid, 0)
                fastest_topic_name = topic_map.get(tid, "Unknown")

        results.append({
            "country": c,
            "articles": data["articles"],
            "top_topics": top_topics_names,
            "top_categories": top_categories_names,
            "sentiment": avg_sent,
            "fastest_growing_topic": fastest_topic_name,
            "top_sources": top_sources_names,
            "trending_topic_count": len(data["topic_ids"])
        })

    # Sort alphabet or by volume
    results.sort(key=lambda x: x["articles"], reverse=True)
    return results

@router.get("", summary="Get simple country list (legacy)")
async def get_countries_overview(db: AsyncSession = Depends(get_db)):
    stmt = select(ContentItem.country_name, func.count(ContentItem.id).label("volume")).where(ContentItem.country_name != None).group_by(ContentItem.country_name)
    res = await db.execute(stmt)
    return [{"iso_code": r.country_name[:2].upper() if r.country_name else "GL", "name": r.country_name, "volume": r.volume} for r in res.all()]
