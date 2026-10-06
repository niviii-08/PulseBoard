from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from collections import defaultdict
from app.core.database import get_db
from app.models.content import ContentItem
from app.models.trend import Topic, TrendSnapshot
import uuid

router = APIRouter()

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from collections import defaultdict
from app.core.database import get_db
from app.models.content import ContentItem
from app.models.trend import Topic, TrendSnapshot, Event
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter()

@router.get("", summary="Get global intelligence dashboard by country")
async def get_countries_intelligence(db: AsyncSession = Depends(get_db)):
    stmt = select(ContentItem)
    res = await db.execute(stmt)
    items = res.scalars().all()

    country_data = defaultdict(lambda: {
        "articles": 0,
        "sentiment_sum": 0.0,
        "categories": defaultdict(int),
        "sources": defaultdict(int),
        "topic_ids": defaultdict(int)
    })

    for item in items:
        # Mark unknown geography explicitly. Do not assume or hallucinate.
        c = item.country_name.strip() if item.country_name and item.country_name.strip() else "Unknown Geography"
        
        country_data[c]["articles"] += 1
        country_data[c]["sentiment_sum"] += item.sentiment
        if item.category:
            country_data[c]["categories"][item.category] += 1
        if item.source:
            country_data[c]["sources"][item.source] += 1
        
        if item.topics_json:
            for t_id in item.topics_json:
                country_data[c]["topic_ids"][t_id] += 1

    topics_res = await db.execute(select(Topic.id, Topic.name))
    topic_map = {str(t.id): t.name for t in topics_res.all()}
    
    events_res = await db.execute(select(Event))
    events_pool = events_res.scalars().all()
    event_topic_map = defaultdict(list)
    for e in events_pool:
        if e.topic_id:
             event_topic_map[str(e.topic_id)].append(e.name)

    snapshots_res = await db.execute(
        select(TrendSnapshot.topic_id, TrendSnapshot.growth_rate)
        .order_by(TrendSnapshot.timestamp.desc())
    )
    topic_growth = {}
    for snapshot in snapshots_res.all():
        tid = str(snapshot.topic_id)
        if tid not in topic_growth:
            topic_growth[tid] = snapshot.growth_rate

    results = []
    for c, data in country_data.items():
        avg_sent = data["sentiment_sum"] / data["articles"] if data["articles"] > 0 else 0
        
        top_categories = [{"name": x[0], "count": x[1]} for x in sorted(data["categories"].items(), key=lambda x: x[1], reverse=True)[:5]]
        top_sources = [{"name": x[0], "count": x[1]} for x in sorted(data["sources"].items(), key=lambda x: x[1], reverse=True)[:5]]
        
        top_topic_ids = sorted(data["topic_ids"].items(), key=lambda x: x[1], reverse=True)[:5]
        top_topics = [{"id": tid, "name": topic_map.get(tid, "Unknown Topic"), "mentions": count} for tid, count in top_topic_ids]

        fastest_topic = {"id": None, "name": "None", "growth_rate": -999.0}
        recent_events = []
        for tid, _ in data["topic_ids"].items():
            if topic_growth.get(tid, 0) > fastest_topic["growth_rate"]:
                fastest_topic = {"id": tid, "name": topic_map.get(tid, "Unknown Topic"), "growth_rate": topic_growth.get(tid, 0)}
            
            if tid in event_topic_map:
                 recent_events.extend(event_topic_map[tid])

        results.append({
            "country": c,
            "total_news_volume": data["articles"],
            "top_topics": top_topics,
            "fastest_growing_topic": fastest_topic if fastest_topic["id"] else None,
            "sentiment": avg_sent,
            "category_distribution": top_categories,
            "source_distribution": top_sources,
            "recent_events": list(set(recent_events))[:5]
        })

    results.sort(key=lambda x: x["total_news_volume"], reverse=True)
    return {"countries": results}


@router.get("/{country_name}", summary="Get deep intelligence for a specific country")
async def get_country_details(country_name: str, db: AsyncSession = Depends(get_db)):
    if country_name.lower() == "unknown geography" or country_name.lower() == "unknown":
        stmt = select(ContentItem).where((ContentItem.country_name == None) | (ContentItem.country_name == ""))
    else:
        stmt = select(ContentItem).where(ContentItem.country_name.ilike(country_name))
        
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    if not items:
        # Default empty fallback rather than 404 to gracefully handle no data states
        return {
             "country": country_name,
             "total_news_volume": 0,
             "sentiment": 0.0,
             "top_topics": [],
             "top_sources": [],
             "major_events": [],
             "trend_timeline": []
        }
        
    articles_count = len(items)
    sentiment_avg = sum([i.sentiment for i in items]) / articles_count
    
    topic_counts = defaultdict(int)
    source_counts = defaultdict(int)
    timeline = defaultdict(int)
    
    for item in items:
        if item.source: source_counts[item.source] += 1
        if item.topics_json:
             for tid in item.topics_json:
                  topic_counts[tid] += 1
                  
        dt = item.published_at.date()
        timeline[dt.isoformat()] += 1
        
    timeline_arr = [{"date": k, "volume": v} for k, v in sorted(timeline.items())]
    
    top_t_ids = [tid for tid, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:10]]
    topic_data = []
    major_events = []
    
    if top_t_ids:
        import uuid
        valid_uuids = []
        for tid in set(top_t_ids):
            if tid:
                try: valid_uuids.append(uuid.UUID(tid))
                except: pass
                
        if valid_uuids:
             t_res = await db.execute(select(Topic).where(Topic.id.in_(valid_uuids)))
             for t in t_res.scalars().all():
                 topic_data.append({"id": str(t.id), "name": t.name, "volume": topic_counts[str(t.id)]})
                 
             e_res = await db.execute(select(Event).where(Event.topic_id.in_(valid_uuids)))
             for e in e_res.scalars().all():
                 major_events.append({"id": str(e.id), "name": e.name, "topic_id": str(e.topic_id)})
                 
    topic_data.sort(key=lambda x: x["volume"], reverse=True)
    
    top_sources = [{"name": s, "volume": c} for s, c in sorted(source_counts.items(), key=lambda x: x[1], reverse=True)[:10]]

    return {
        "country": country_name,
        "total_news_volume": articles_count,
        "sentiment": sentiment_avg,
        "top_topics": topic_data,
        "top_sources": top_sources,
        "major_events": major_events,
        "trend_timeline": timeline_arr
    }
