"""GET /search -- simple ILIKE search across brands and topics. Deliberately
not a separate search index/Elasticsearch: at portfolio/demo data volume a
Postgres ILIKE query is fast enough, and adding a search cluster to stand
up a demo project would be exactly the kind of "unnecessary technology
just to make the resume look impressive" the spec explicitly warns against."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.social import Brand
from app.models.trend import Topic, TrendSnapshot

router = APIRouter()


@router.get("", summary="Search brands and topics")
async def search(q: str = Query(min_length=1), db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    like = f"%{q}%"

    brand_res = await db.execute(select(Brand).where(Brand.name.ilike(like)).limit(10))
    brands = [{"id": str(b.id), "name": b.name, "type": "brand"} for b in brand_res.scalars().all()]

    topic_res = await db.execute(select(Topic).where(Topic.name.ilike(like)).limit(10))
    topics = []
    for t in topic_res.scalars().all():
        snap_res = await db.execute(
            select(TrendSnapshot).where(TrendSnapshot.topic_id == t.id).order_by(TrendSnapshot.timestamp.desc()).limit(1)
        )
        snap = snap_res.scalar_one_or_none()
        topics.append(
            {
                "id": str(t.id),
                "name": t.name,
                "type": "topic",
                "trend_score": snap.trend_score if snap else None,
                "sentiment": snap.sentiment_avg if snap else None,
            }
        )

    return {"brands": brands, "topics": topics}
