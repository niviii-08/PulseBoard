"""
GET /api/v1/trends/*

All read-heavy, all authenticated (mirrors auth.py's existing pattern) --
none of this recomputes engines at request time; every number here was
already computed and stored by app/services/pipeline.py the last time
the ingestion task (or the demo seed) ran. That's a deliberate design
choice: a dashboard GET should be a cheap read, not a re-run of NLP +
scoring on every page load.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.trend import AIInsight, Mention, Topic, TrendSnapshot
from app.models.social import PropagationEvent
from app.services.keyword_extraction import extract_keywords
from app.services.topic_service import ExistingTopic, related_topics

router = APIRouter()


async def _latest_snapshot(db: AsyncSession, topic_id) -> TrendSnapshot | None:
    res = await db.execute(
        select(TrendSnapshot).where(TrendSnapshot.topic_id == topic_id).order_by(TrendSnapshot.timestamp.desc()).limit(1)
    )
    return res.scalar_one_or_none()

@router.get("", summary="Get all topics")
async def get_all_topics(limit: int = 50, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Topic).limit(limit))
    return [{"id": str(t.id), "name": t.name, "description": t.description} for t in res.scalars().all()]

@router.get("/emerging", summary="Get emerging trends, ranked by trend_score")
async def get_emerging_trends(
    limit: int = Query(default=20, le=100),
    platform: str | None = None,
    min_score: float = Query(default=0.0, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    res = await db.execute(select(Topic))
    topics = res.scalars().all()

    results = []
    for topic in topics:
        snap = await _latest_snapshot(db, topic.id)
        if not snap or snap.trend_score < min_score:
            continue
        if platform:
            plat_res = await db.execute(
                select(Mention.id).where(Mention.topic_id == topic.id, Mention.platform == platform).limit(1)
            )
            if not plat_res.first():
                continue
        results.append(
            {
                "id": str(topic.id),
                "name": topic.name,
                "brand_id": str(topic.brand_id) if topic.brand_id else None,
                "volume": snap.volume_last_hour,
                "growth_rate": snap.growth_rate,
                "acceleration": snap.acceleration,
                "trend_score": snap.trend_score,
                "score_breakdown": snap.score_breakdown,
                "sentiment": snap.sentiment_avg,
                "positive_pct": snap.positive_pct,
                "negative_pct": snap.negative_pct,
                "cross_platform_count": snap.cross_platform_count,
                "as_of": snap.timestamp,
            }
        )

    results.sort(key=lambda x: x["trend_score"], reverse=True)
    return results[:limit]


@router.get("/{topic_id}", summary="Trend overview")
async def get_trend_overview(topic_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = res.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found.")
    snap = await _latest_snapshot(db, topic_id)

    first_snap_res = await db.execute(
        select(TrendSnapshot).where(TrendSnapshot.topic_id == topic_id).order_by(TrendSnapshot.timestamp.asc()).limit(1)
    )
    first_snap = first_snap_res.scalar_one_or_none()

    return {
        "id": str(topic.id),
        "name": topic.name,
        "description": topic.description,
        "keywords": topic.keywords,
        "first_detected": first_snap.timestamp if first_snap else None,
        "latest": None
        if not snap
        else {
            "trend_score": snap.trend_score,
            "growth_rate": snap.growth_rate,
            "acceleration": snap.acceleration,
            "volume": snap.volume_last_hour,
            "sentiment": snap.sentiment_avg,
            "positive_pct": snap.positive_pct,
            "negative_pct": snap.negative_pct,
            "neutral_pct": snap.neutral_pct,
            "cross_platform_count": snap.cross_platform_count,
            "as_of": snap.timestamp,
        },
    }


@router.get("/{topic_id}/sentiment", summary="Sentiment over time")
async def get_sentiment_shift(topic_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(
        select(TrendSnapshot).where(TrendSnapshot.topic_id == topic_id).order_by(TrendSnapshot.timestamp.asc())
    )
    snaps = res.scalars().all()
    return [
        {
            "timestamp": s.timestamp,
            "sentiment": s.sentiment_avg,
            "positive_pct": s.positive_pct,
            "negative_pct": s.negative_pct,
            "neutral_pct": s.neutral_pct,
            "volume": s.volume_last_hour,
        }
        for s in snaps
    ]


@router.get("/{topic_id}/propagation", summary="Cross-platform propagation timeline")
async def get_propagation(topic_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(
        select(PropagationEvent).where(PropagationEvent.topic_id == topic_id).order_by(PropagationEvent.sequence_order)
    )
    events = res.scalars().all()
    if not events:
        return {"established": False, "reason": "Propagation path cannot be established from available data.", "steps": []}
    return {
        "established": True,
        "steps": [
            {
                "platform": e.platform,
                "sequence_order": e.sequence_order,
                "first_seen_at": e.first_seen_at,
                "mentions_at_detection": e.mentions_at_detection,
                "growth_since_entry_pct": e.growth_since_entry_pct,
            }
            for e in events
        ],
    }


@router.get("/{topic_id}/timeline", summary="Timeline (Alias for propagation)")
async def get_timeline(topic_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    return await get_propagation(topic_id, db, _user)

@router.get("/{topic_id}/countries", summary="Countries breakdown")
async def get_topic_countries(topic_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    from app.models.extensions import Country
    from sqlalchemy import func
    stmt = select(Country.iso_code, Country.name, func.count(Mention.id).label("volume")).join(Mention, Mention.country_id == Country.id).where(Mention.topic_id == topic_id).group_by(Country.id)
    res = await db.execute(stmt)
    return [{"iso_code": r.iso_code, "name": r.name, "volume": r.volume} for r in res.all()]

@router.get("/{topic_id}/explanation", summary="AI-generated explanation for this trend")
async def get_explanation(topic_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(
        select(AIInsight).where(AIInsight.topic_id == topic_id).order_by(AIInsight.created_at.desc()).limit(1)
    )
    insight = res.scalar_one_or_none()
    if not insight:
        return {"summary_text": "Not enough data yet.", "key_drivers": {}, "generated_by": None}
    return {
        "summary_text": insight.summary_text,
        "key_drivers": insight.key_drivers,
        "kind": insight.kind,
        "generated_by": insight.generated_by,
        "evidence": insight.evidence,
    }


@router.get("/{topic_id}/posts", summary="Top conversations for this topic")
async def get_top_posts(
    topic_id: UUID,
    platform: str | None = None,
    sentiment: str | None = None,
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    stmt = select(Mention).where(Mention.topic_id == topic_id)
    if platform:
        stmt = stmt.where(Mention.platform == platform)
    if sentiment:
        stmt = stmt.where(Mention.sentiment_label == sentiment)
    stmt = stmt.order_by(Mention.engagement_count.desc()).limit(limit)

    res = await db.execute(stmt)
    mentions = res.scalars().all()
    return [
        {
            "id": str(m.id),
            "platform": m.platform.value,
            "author": m.author,
            "content": m.content,
            "url": m.url,
            "sentiment_label": m.sentiment_label,
            "sentiment_score": m.sentiment_score,
            "engagement_count": m.engagement_count,
            "posted_at": m.posted_at,
            "is_demo": m.source_is_demo,
        }
        for m in mentions
    ]


@router.get("/{topic_id}/related", summary="Semantically related topics (keyword overlap)")
async def get_related_topics(topic_id: UUID, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    res = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = res.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found.")

    others_res = await db.execute(select(Topic).where(Topic.id != topic_id))
    other_topics = others_res.scalars().all()
    candidates = [ExistingTopic(id=str(t.id), keywords=t.keywords or []) for t in other_topics]
    ranked = related_topics(topic.keywords or [], candidates)

    names = {str(t.id): t.name for t in other_topics}
    return [{"id": tid, "name": names.get(tid, tid), "similarity": round(score, 2)} for tid, score in ranked]
