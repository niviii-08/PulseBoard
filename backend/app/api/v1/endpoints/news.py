from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.content import ContentItem
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", summary="Get global news articles")
async def get_news(
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db)
    # Removing current_user dependency to allow public access or generic frontend bridging easily, 
    # though it can be kept if auth is explicitly needed.
):
    stmt = select(ContentItem).order_by(ContentItem.published_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [
        {
            "id": str(item.id),
            "headline": item.title,
            "source": item.source,
            "timestamp": item.published_at,
            "country": item.country_name,
            "category": item.category,
            "image": item.image_url,
            "description": item.description,
            "url": item.url,
            "sentiment": item.sentiment,
            "sentiment_label": item.sentiment_label
        }
        for item in res.scalars().all()
    ]

@router.get("/breaking", summary="Get breaking news")
async def get_breaking_news(
    limit: int = Query(default=5, le=20),
    db: AsyncSession = Depends(get_db)
):
    # breaking means high engagement or highly negative/positive sentiment, plus latest
    stmt = select(ContentItem).order_by(ContentItem.engagement.desc(), ContentItem.published_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [
        {
            "id": str(item.id),
            "headline": item.title,
            "source": item.source,
            "timestamp": item.published_at,
            "country": item.country_name,
            "category": item.category,
            "image": item.image_url,
            "description": item.description,
            "url": item.url,
            "sentiment": item.sentiment
        }
        for item in res.scalars().all()
    ]
