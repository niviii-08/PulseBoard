"""GET /dashboard -- the KPI-card summary the main dashboard page loads on
mount. One aggregation query per card rather than N+1 per topic, since
this endpoint is on the hot path (loads every time the dashboard opens)."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.social import Alert, Brand, RiskAssessment
from app.models.trend import Mention, TrendSnapshot

router = APIRouter()


@router.get("", summary="Dashboard KPI summary")
async def get_dashboard(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)

    latest_snap_sub = (
        select(TrendSnapshot.topic_id, func.max(TrendSnapshot.timestamp).label("ts"))
        .group_by(TrendSnapshot.topic_id)
        .subquery()
    )
    latest_snaps_res = await db.execute(
        select(TrendSnapshot).join(
            latest_snap_sub,
            (TrendSnapshot.topic_id == latest_snap_sub.c.topic_id) & (TrendSnapshot.timestamp == latest_snap_sub.c.ts),
        )
    )
    latest_snaps = latest_snaps_res.scalars().all()

    emerging_trends = sum(1 for s in latest_snaps if s.trend_score >= 70)
    avg_sentiment = round(sum(s.sentiment_avg for s in latest_snaps) / len(latest_snaps), 3) if latest_snaps else 0.0

    mention_count_res = await db.execute(select(func.count(Mention.id)).where(Mention.posted_at >= last_24h))
    total_mentions_24h = mention_count_res.scalar_one()

    active_alerts_res = await db.execute(select(func.count(Alert.id)).where(Alert.acknowledged.is_(False)))
    active_alerts = active_alerts_res.scalar_one()

    latest_risk_sub = (
        select(RiskAssessment.brand_id, func.max(RiskAssessment.timestamp).label("ts"))
        .group_by(RiskAssessment.brand_id)
        .subquery()
    )
    risk_res = await db.execute(
        select(RiskAssessment).join(
            latest_risk_sub,
            (RiskAssessment.brand_id == latest_risk_sub.c.brand_id) & (RiskAssessment.timestamp == latest_risk_sub.c.ts),
        )
    )
    latest_risks = risk_res.scalars().all()
    max_risk = max((r.risk_score for r in latest_risks), default=0.0)
    max_risk_level = next((r.risk_level.value for r in latest_risks if r.risk_score == max_risk), "LOW") if latest_risks else "LOW"

    brand_count_res = await db.execute(select(func.count(Brand.id)))
    brand_count = brand_count_res.scalar_one()

    return {
        "emerging_trends": emerging_trends,
        "total_mentions_24h": total_mentions_24h,
        "avg_sentiment": avg_sentiment,
        "active_alerts": active_alerts,
        "brand_risk": {"score": max_risk, "level": max_risk_level},
        "monitored_brands": brand_count,
        "as_of": now,
    }
