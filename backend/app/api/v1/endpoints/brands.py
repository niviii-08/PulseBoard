"""
Brand monitoring CRUD + brand intelligence reads (/brands/{id}/risk,
/sentiment, /trends, /posts).

Create/update/delete require an authenticated user (any role) via the
existing get_current_user dependency, matching the rest of this API --
there is no separate "admin-only" gate here because brand monitoring
configuration isn't a privileged action in this product, unlike (say)
user management.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.social import Brand, RiskAssessment
from app.models.trend import Mention, Topic, TrendSnapshot
from app.schemas.brand import BrandCreate, BrandRead, BrandUpdate

router = APIRouter()


@router.get("", response_model=list[BrandRead])
async def list_brands(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Brand).order_by(Brand.name))
    return res.scalars().all()


@router.post("", response_model=BrandRead, status_code=201)
async def create_brand(payload: BrandCreate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    existing = await db.execute(select(Brand).where(Brand.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A brand with this name already exists.")
    brand = Brand(**payload.model_dump())
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return brand


@router.get("/{brand_id}", response_model=BrandRead)
async def get_brand(brand_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = res.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")
    return brand


@router.put("/{brand_id}", response_model=BrandRead)
async def update_brand(brand_id: UUID, payload: BrandUpdate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = res.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(brand, field, value)
    await db.commit()
    await db.refresh(brand)
    return brand


@router.delete("/{brand_id}", status_code=204)
async def delete_brand(brand_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = res.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")
    await db.delete(brand)
    await db.commit()


@router.get("/{brand_id}/risk", summary="Latest brand risk assessment + history")
async def get_brand_risk(brand_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Brand).where(Brand.id == brand_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Brand not found.")

    hist_res = await db.execute(
        select(RiskAssessment).where(RiskAssessment.brand_id == brand_id).order_by(RiskAssessment.timestamp.desc()).limit(30)
    )
    history = hist_res.scalars().all()
    if not history:
        return {"latest": None, "history": []}

    latest = history[0]
    return {
        "latest": {
            "risk_score": latest.risk_score,
            "risk_level": latest.risk_level.value,
            "drivers": latest.drivers,
            "negative_mentions_pct": latest.negative_mentions_pct,
            "mention_growth_rate": latest.mention_growth_rate,
            "platforms_affected": latest.platforms_affected,
            "complaint_clusters": latest.complaint_clusters,
            "timestamp": latest.timestamp,
        },
        "history": [
            {"timestamp": h.timestamp, "risk_score": h.risk_score, "risk_level": h.risk_level.value}
            for h in reversed(history)
        ],
    }


@router.get("/{brand_id}/sentiment", summary="Brand-wide sentiment over time")
async def get_brand_sentiment(brand_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(
        select(TrendSnapshot)
        .join(Topic, Topic.id == TrendSnapshot.topic_id)
        .where(Topic.brand_id == brand_id)
        .order_by(TrendSnapshot.timestamp.asc())
    )
    snaps = res.scalars().all()
    return [
        {"timestamp": s.timestamp, "sentiment": s.sentiment_avg, "positive_pct": s.positive_pct, "negative_pct": s.negative_pct}
        for s in snaps
    ]


@router.get("/{brand_id}/trends", summary="Emerging topics tied to this brand")
async def get_brand_trends(brand_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Topic).where(Topic.brand_id == brand_id))
    topics = res.scalars().all()
    out = []
    for topic in topics:
        snap_res = await db.execute(
            select(TrendSnapshot).where(TrendSnapshot.topic_id == topic.id).order_by(TrendSnapshot.timestamp.desc()).limit(1)
        )
        snap = snap_res.scalar_one_or_none()
        if snap:
            out.append({"id": str(topic.id), "name": topic.name, "trend_score": snap.trend_score, "growth_rate": snap.growth_rate})
    out.sort(key=lambda x: x["trend_score"], reverse=True)
    return out


@router.get("/{brand_id}/posts", summary="Top conversations mentioning this brand")
async def get_brand_posts(
    brand_id: UUID,
    limit: int = Query(default=20, le=100),
    sentiment: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    stmt = select(Mention).where(Mention.brand_id == brand_id)
    if sentiment:
        stmt = stmt.where(Mention.sentiment_label == sentiment)
    stmt = stmt.order_by(Mention.engagement_count.desc()).limit(limit)
    res = await db.execute(stmt)
    return [
        {
            "id": str(m.id),
            "platform": m.platform.value,
            "content": m.content,
            "url": m.url,
            "sentiment_label": m.sentiment_label,
            "engagement_count": m.engagement_count,
            "posted_at": m.posted_at,
        }
        for m in res.scalars().all()
    ]
