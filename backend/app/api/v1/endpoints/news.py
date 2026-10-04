from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.trend import Mention, PlatformEnum
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", summary="Get news mentions")
async def get_news(
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user)
):
    stmt = select(Mention).where(Mention.platform == PlatformEnum.news).order_by(Mention.posted_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [
        {
            "id": str(m.id),
            "topic_id": str(m.topic_id),
            "author": m.author,
            "content": m.content,
            "url": m.url,
            "sentiment_label": m.sentiment_label,
            "engagement_count": m.engagement_count,
            "posted_at": m.posted_at,
            "is_demo": m.source_is_demo
        }
        for m in res.scalars().all()
    ]

@router.get("/breaking", summary="Get breaking news")
async def get_breaking_news(
    limit: int = Query(default=5, le=20),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user)
):
    # breaking means high engagement_count or latest
    stmt = select(Mention).where(Mention.platform == PlatformEnum.news).order_by(Mention.engagement_count.desc(), Mention.posted_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [
        {
            "id": str(m.id),
            "topic_id": str(m.topic_id),
            "author": m.author,
            "content": m.content,
            "url": m.url,
            "sentiment_label": m.sentiment_label,
            "engagement_count": m.engagement_count,
            "posted_at": m.posted_at,
            "is_demo": m.source_is_demo
        }
        for m in res.scalars().all()
    ]
