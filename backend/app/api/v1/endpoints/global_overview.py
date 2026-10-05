from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.content import ContentItem
from app.models.trend import Topic, TrendSnapshot

router = APIRouter()

@router.get("", summary="Get global intelligence overview")
async def get_global_overview(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(func.count(ContentItem.id)))
    total_articles = res.scalar() or 0
    
    res = await db.execute(select(func.count(Topic.id)))
    active_topics = res.scalar() or 0
    
    res = await db.execute(
        select(Topic.name)
        .join(TrendSnapshot)
        .order_by(TrendSnapshot.acceleration.desc(), TrendSnapshot.timestamp.desc())
        .limit(1)
    )
    fastest_rising = res.scalar() or "Unknown"
    
    res = await db.execute(select(func.count(func.distinct(ContentItem.country_name))))
    countries_count = res.scalar() or 0
    
    res = await db.execute(select(func.count(func.distinct(ContentItem.source))))
    sources_count = res.scalar() or 0
    
    res = await db.execute(select(func.avg(ContentItem.sentiment)))
    avg_sentiment = res.scalar() or 0.0
    
    hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    res = await db.execute(select(func.count(ContentItem.id)).where(ContentItem.published_at >= hour_ago))
    last_hour = res.scalar() or 0
    
    day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    res = await db.execute(select(func.count(ContentItem.id)).where(ContentItem.published_at >= day_ago))
    last_24 = res.scalar() or 0
    
    return {
        "total_articles": total_articles,
        "active_topics": active_topics,
        "fastest_rising_topic": fastest_rising,
        "countries_represented": countries_count,
        "sources_monitored": sources_count,
        "average_sentiment": round(avg_sentiment, 2),
        "articles_last_hour": last_hour,
        "articles_last_24h": last_24
    }
