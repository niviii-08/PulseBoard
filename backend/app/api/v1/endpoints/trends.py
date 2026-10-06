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
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, cast, String
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

@router.get("/all", summary="Get all topics")
async def get_all_topics(limit: int = 50, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Topic).limit(limit))
    return [{"id": str(t.id), "name": t.name, "description": t.description} for t in res.scalars().all()]

@router.get("", summary="Get trending topics, ranked by trend_score or personalized_score")
async def get_emerging_trends(
    limit: int = Query(default=20, le=100),
    platform: str | None = None,
    min_score: float = Query(default=0.0, ge=0, le=100),
    interests: str | None = Query(None, description="Comma-separated user interests for personalized scoring"),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Topic))
    topics = res.scalars().all()
    
    user_interest_list = [i.strip().lower() for i in interests.split(",")] if interests else []

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
                
        # Personalization Layer
        user_relevance_score = 0.0
        personalized_score = snap.trend_score
        
        if user_interest_list:
            text_target = f"{topic.name} {topic.description or ''} {' '.join(topic.keywords or [])}".lower()
            
            # Simple keyword overlap
            matches = sum(1 for interest in user_interest_list if interest in text_target)
            
            if matches > 0:
                user_relevance_score = min(30.0, matches * 15.0)
                # Cap personalized score artificially at 100 max
                personalized_score = min(100.0, snap.trend_score + user_relevance_score)

        results.append(
            {
                "id": str(topic.id),
                "name": topic.name,
                "brand_id": str(topic.brand_id) if topic.brand_id else None,
                "volume": snap.volume_last_hour,
                "growth_rate": snap.growth_rate,
                "acceleration": snap.acceleration,
                "trend_score": snap.trend_score,
                "user_relevance_score": user_relevance_score,
                "personalized_score": personalized_score,
                "score_breakdown": snap.score_breakdown,
                "sentiment": snap.sentiment_avg,
                "positive_pct": snap.positive_pct,
                "negative_pct": snap.negative_pct,
                "cross_platform_count": snap.cross_platform_count,
                "as_of": snap.timestamp,
            }
        )

    if user_interest_list:
        results.sort(key=lambda x: x["personalized_score"], reverse=True)
    else:
        results.sort(key=lambda x: x["trend_score"], reverse=True)
        
    return results[:limit]


@router.get("/compare", summary="Compare multiple topics")
async def compare_trends(
    ids: List[UUID] = Query(...),
    timeframe: str = Query("24H", description="1H, 6H, 24H, 7D"),
    db: AsyncSession = Depends(get_db)
):
    if len(ids) > 4:
         raise HTTPException(status_code=400, detail="Can compare up to 4 topics maximum.")
         
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    delta_map = {"1H": 1, "6H": 6, "24H": 24, "7D": 168}
    hours = delta_map.get(timeframe.upper(), 24)
    cutoff = now - timedelta(hours=hours)

    topics_res = await db.execute(select(Topic).where(Topic.id.in_(ids)))
    topics = {str(t.id): t for t in topics_res.scalars().all()}
    
    comparisons = []
    timelines = []
    
    # We will build unified timelines for each topic
    from collections import defaultdict
    topic_timeline = defaultdict(list)
    
    for tid in ids:
        t_id_str = str(tid)
        if t_id_str not in topics:
             continue
        t = topics[t_id_str]
        
        # Timeline data
        snaps_res = await db.execute(
            select(TrendSnapshot)
            .where(TrendSnapshot.topic_id == tid, TrendSnapshot.timestamp >= cutoff)
            .order_by(TrendSnapshot.timestamp.asc())
        )
        snaps = snaps_res.scalars().all()
        
        # Calculate derived stats over this period
        start_vol = snaps[0].volume_last_hour if snaps else 0
        end_vol = snaps[-1].volume_last_hour if snaps else 0
        
        # Need source and country diversity (we can count unique from Mentions in timeframe)
        mentions_res = await db.execute(
            select(Mention.country_id, Mention.platform)
            .where(Mention.topic_id == tid, Mention.posted_at >= cutoff)
        )
        mentions = mentions_res.all()
        
        unique_countries = len(set(m[0] for m in mentions if m[0]))
        unique_sources = len(set(m[1] for m in mentions if m[1]))
        
        latest_snap = snaps[-1] if snaps else None
        
        summary = {
            "id": t_id_str,
            "name": t.name,
            "mention_volume": len(mentions),
            "trend_score": latest_snap.trend_score if latest_snap else 0.0,
            "growth": latest_snap.growth_rate if latest_snap else 0.0,
            "acceleration": latest_snap.acceleration if latest_snap else 0.0,
            "sentiment": latest_snap.sentiment_avg if latest_snap else 0.0,
            "source_diversity": unique_sources,
            "geographic_spread": unique_countries
        }
        comparisons.append(summary)
        
        for s in snaps:
             topic_timeline[t_id_str].append({
                  "timestamp": s.timestamp.isoformat(),
                  "volume": s.volume_last_hour,
                  "growth": s.growth_rate,
                  "sentiment": s.sentiment_avg
             })
             
    # Format unified timeline
    # Extract all unique timestamps
    all_timestamps = set()
    for tid_data in topic_timeline.values():
         for entry in tid_data:
             all_timestamps.add(entry["timestamp"])
             
    unified = []
    for ts in sorted(list(all_timestamps)):
         row = {"timestamp": ts}
         for t_id_str in topics.keys():
             name = topics[t_id_str].name
             # find closest snapshot
             matched = next((x for x in topic_timeline[t_id_str] if x["timestamp"] == ts), None)
             if matched:
                 row[f"{name}_volume"] = matched["volume"]
                 row[f"{name}_growth"] = matched["growth"]
                 row[f"{name}_sentiment"] = matched["sentiment"]
         unified.append(row)

    return {
        "timeframe": timeframe.upper(),
        "topics": comparisons,
        "timeline": unified
    }


@router.get("/anomalies", summary="Detect unusual spikes and shifts across all topics")
async def get_trend_anomalies(db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)
    
    # We will get all active topics
    topics_res = await db.execute(select(Topic).limit(100))
    topics = topics_res.scalars().all()
    
    anomalies = []
    
    for topic in topics:
        tid = topic.id
        
        # 1. Volume & Sentiment Anomalies (from TrendSnapshot)
        snaps_res = await db.execute(
            select(TrendSnapshot)
            .where(TrendSnapshot.topic_id == tid, TrendSnapshot.timestamp >= cutoff_7d)
            .order_by(TrendSnapshot.timestamp.asc())
        )
        snaps = snaps_res.scalars().all()
        
        if len(snaps) < 2:
             continue
             
        recent_snaps = [s for s in snaps if s.timestamp >= cutoff_24h]
        older_snaps = [s for s in snaps if s.timestamp < cutoff_24h]
        
        if not recent_snaps or not older_snaps:
             continue
             
        # Expected is average of older snaps
        avg_expected_vol = sum(s.volume_last_hour for s in older_snaps) / len(older_snaps) if older_snaps else 0
        avg_recent_vol = sum(s.volume_last_hour for s in recent_snaps) / len(recent_snaps) if recent_snaps else 0
        
        avg_expected_sent = sum(s.sentiment_avg for s in older_snaps) / len(older_snaps) if older_snaps else 0
        avg_recent_sent = sum(s.sentiment_avg for s in recent_snaps) / len(recent_snaps) if recent_snaps else 0
        
        # VOLUME SPIKE / DROP
        if avg_expected_vol > 10:  # Base threshold
             if avg_recent_vol > avg_expected_vol * 2.0:
                  deviation = ((avg_recent_vol - avg_expected_vol) / avg_expected_vol) * 100
                  anomalies.append({
                      "id": f"spike-{tid}",
                      "topic_id": str(tid),
                      "topic_name": topic.name,
                      "type": "SPIKE",
                      "severity": "HIGH" if avg_recent_vol > avg_expected_vol * 3 else "MEDIUM",
                      "description": f"Unusual surge in conversation volume.",
                      "evidence": {
                          "current": int(avg_recent_vol),
                          "expected": int(avg_expected_vol),
                          "deviation_pct": f"+{deviation:.0f}%"
                      }
                  })
             elif avg_recent_vol < avg_expected_vol * 0.3:
                  deviation = ((avg_expected_vol - avg_recent_vol) / avg_expected_vol) * 100
                  anomalies.append({
                      "id": f"drop-{tid}",
                      "topic_id": str(tid),
                      "topic_name": topic.name,
                      "type": "DROP",
                      "severity": "MEDIUM",
                      "description": f"Sudden drop in conversation volume.",
                      "evidence": {
                          "current": int(avg_recent_vol),
                          "expected": int(avg_expected_vol),
                          "deviation_pct": f"-{deviation:.0f}%"
                      }
                  })
                  
        # SENTIMENT SHIFT
        if abs(avg_recent_sent - avg_expected_sent) >= 0.4:
             anomalies.append({
                  "id": f"sent-{tid}",
                  "topic_id": str(tid),
                  "topic_name": topic.name,
                  "type": "SENTIMENT SHIFT",
                  "severity": "HIGH",
                  "description": f"Drastic polarity shift detected in past 24H.",
                  "evidence": {
                      "current": round(avg_recent_sent, 2),
                      "expected": round(avg_expected_sent, 2),
                      "deviation_pct": "Shifted"
                  }
             })

        # 2. Geographic & Source Anomalies (from Mentions)
        mentions_res = await db.execute(
            select(Mention.country_id, Mention.platform, Mention.posted_at)
            .where(Mention.topic_id == tid, Mention.posted_at >= cutoff_7d)
        )
        mentions = mentions_res.all()
        
        recent_m = [m for m in mentions if m[2] >= cutoff_24h]
        older_m = [m for m in mentions if m[2] < cutoff_24h]
        
        older_countries = set(m[0] for m in older_m if m[0])
        recent_countries = set(m[0] for m in recent_m if m[0])
        new_countries = recent_countries - older_countries
        
        if len(new_countries) >= 3:
             anomalies.append({
                  "id": f"geo-{tid}",
                  "topic_id": str(tid),
                  "topic_name": topic.name,
                  "type": "GEOGRAPHIC EXPANSION",
                  "severity": "HIGH",
                  "description": f"Trend has rapidly expanded into new regions.",
                  "evidence": {
                      "current": len(recent_countries),
                      "expected": len(older_countries),
                      "deviation_pct": f"+{len(new_countries)} new"
                  }
             })
             
        older_sources = set(m[1] for m in older_m if m[1])
        recent_sources = set(m[1] for m in recent_m if m[1])
        new_sources = recent_sources - older_sources
        
        if len(new_sources) >= 2:
             anomalies.append({
                  "id": f"src-{tid}",
                  "topic_id": str(tid),
                  "topic_name": topic.name,
                  "type": "SOURCE SURGE",
                  "severity": "MEDIUM",
                  "description": f"New platforms are picking up this trend.",
                  "evidence": {
                      "current": len(recent_sources),
                      "expected": len(older_sources),
                      "deviation_pct": f"+{len(new_sources)} platforms"
                  }
             })
             
    anomalies.sort(key=lambda x: 0 if x["severity"] == "HIGH" else 1)
    return {"anomalies": anomalies[:20]}


@router.get("/{topic_id}/lifecycle", summary="Deterministic Trend Lifecycle")
async def get_trend_lifecycle(topic_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Computes the lifecycle state chronologically from historical snapshots.
    
    Deterministic Threshold Rules:
    - BREAKOUT: score >= 75 AND growth > 0.2 AND acceleration > 0
    - PEAK: score >= 75 AND (growth <= 0.2 OR acceleration <= 0)
    - RISING: score >= 40 AND score < 75 AND growth > 0
    - EMERGING: score >= 15 AND score < 40 AND growth > 0
    - DECLINING: score >= 15 AND growth <= 0
    - FADING: score < 15 AND growth <= 0
    """
    def determine_lifecycle_state(score: float, growth: float, accel: float) -> str:
        if score >= 75 and growth > 0.2 and accel > 0:
            return "BREAKOUT"
        if score >= 75:
            return "PEAK"
        if score >= 40 and growth > 0:
            return "RISING"
        if score >= 15 and growth > 0:
            return "EMERGING"
        if score >= 15 and growth <= 0:
            return "DECLINING"
        return "FADING"
        
    res = await db.execute(
        select(TrendSnapshot)
        .where(TrendSnapshot.topic_id == topic_id)
        .order_by(TrendSnapshot.timestamp.asc())
    )
    snaps = res.scalars().all()
    
    if not snaps:
         return {
             "current_state": "UNKNOWN",
             "time_in_state_seconds": 0,
             "peak_score": 0.0,
             "current_score": 0.0,
             "timeline": []
         }
         
    timeline = []
    peak_score = -999.0
    
    # Compute states chronologically
    for s in snaps:
         if s.trend_score > peak_score:
              peak_score = s.trend_score
              
         state = determine_lifecycle_state(s.trend_score, s.growth_rate, s.acceleration)
         
         timeline.append({
              "timestamp": s.timestamp.isoformat(),
              "score": s.trend_score,
              "volume": s.volume_last_hour,
              "velocity": s.growth_rate, 
              "acceleration": s.acceleration,
              "state": state
         })
         
    # Calculate Time In State via reverse walk
    current_state = timeline[-1]["state"]
    state_start_time = timeline[-1]["timestamp"]
    from dateutil.parser import isoparse
    
    for row in reversed(timeline):
         if row["state"] == current_state:
              state_start_time = row["timestamp"]
         else:
              break
              
    latest_time = isoparse(timeline[-1]["timestamp"])
    start_time = isoparse(state_start_time)
    
    time_in_state_seconds = (latest_time - start_time).total_seconds()
    
    # If there is only one data point or it perfectly just changed, format at least elapsed time
    if time_in_state_seconds == 0 and len(timeline) > 1:
        # Estimate gap between snapshots
        prev = isoparse(timeline[-2]["timestamp"])
        time_in_state_seconds = (latest_time - prev).total_seconds()
        
    return {
        "current_state": current_state,
        "time_in_state_seconds": abs(time_in_state_seconds),
        "peak_score": peak_score,
        "current_score": timeline[-1]["score"],
        "timeline": timeline
    }


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

@router.get("/{topic_id}/sources", summary="Source Intelligence")
async def get_topic_source_intelligence(topic_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models.content import ContentItem
    from collections import defaultdict
    
    # Get mentions for platform/social sources
    m_stmt = select(Mention).where(Mention.topic_id == topic_id)
    m_res = await db.execute(m_stmt)
    mentions = m_res.scalars().all()
    
    # Get content items for news sources
    c_stmt = select(ContentItem).where(cast(ContentItem.topics_json, String).contains(topic_id.hex))
    c_res = await db.execute(c_stmt)
    articles = c_res.scalars().all()
    
    source_stats = defaultdict(lambda: {"count": 0, "types": set(), "earliest": None, "latest": None})
    total_count = 0
    all_countries = set()
    
    for m in mentions:
        src = m.platform.value if m.platform else "Unknown Platform"
        source_stats[src]["count"] += 1
        source_stats[src]["types"].add("Social/Web")
        
        dt = m.posted_at
        if source_stats[src]["earliest"] is None or dt < source_stats[src]["earliest"]: source_stats[src]["earliest"] = dt
        if source_stats[src]["latest"] is None or dt > source_stats[src]["latest"]: source_stats[src]["latest"] = dt
        
        if m.country_id:
             all_countries.add(str(m.country_id))
        total_count += 1
        
    for a in articles:
        src = a.source if a.source else "Unknown Publication"
        source_stats[src]["count"] += 1
        source_stats[src]["types"].add(a.category or "News")
        
        dt = a.published_at
        if source_stats[src]["earliest"] is None or dt < source_stats[src]["earliest"]: source_stats[src]["earliest"] = dt
        if source_stats[src]["latest"] is None or dt > source_stats[src]["latest"]: source_stats[src]["latest"] = dt
        
        if a.country_name:
             all_countries.add(a.country_name)
        total_count += 1
        
    unique_count = len(source_stats)
    
    coverage_type = "UNKNOWN"
    if unique_count == 0:
        coverage_type = "NO SOURCES"
    elif unique_count == 1:
        coverage_type = "SINGLE-SOURCE"
    elif unique_count <= 3:
        coverage_type = "LOW DIVERSITY"
    else:
        if len(all_countries) > 5:
            coverage_type = "GLOBAL COVERAGE"
        else:
            coverage_type = "MULTI-SOURCE"
            
    coverage_list = []
    
    earliest_global = None
    latest_global = None
    
    for src, data in source_stats.items():
        if earliest_global is None or data["earliest"] < earliest_global["date"]:
             earliest_global = {"source": src, "date": data["earliest"]}
        if latest_global is None or data["latest"] > latest_global["date"]:
             latest_global = {"source": src, "date": data["latest"]}
             
        # source concentration: % of total conversation
        concentration = (data["count"] / total_count) if total_count > 0 else 0
        
        coverage_list.append({
             "name": src,
             "volume": data["count"],
             "types": list(data["types"]),
             "concentration_pct": concentration,
             "earliest": data["earliest"],
             "latest": data["latest"]
        })
        
    coverage_list.sort(key=lambda x: x["volume"], reverse=True)
    
    all_types = set()
    for d in source_stats.values():
         all_types.update(d["types"])
    
    return {
         "unique_source_count": unique_count,
         "source_diversity": coverage_type,
         "source_types": list(all_types),
         "earliest_source": earliest_global,
         "latest_source": latest_global,
         "coverage": coverage_list
    }


@router.get("/{topic_id}/news", summary="Latest global news for this topic affecting trend score")
async def get_topic_news(topic_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models.content import ContentItem
    # Using cast to String for universal JSON compatibility
    stmt = select(ContentItem).where(cast(ContentItem.topics_json, String).contains(topic_id.hex)).where(ContentItem.source != "demo").order_by(ContentItem.published_at.desc()).limit(30)
    res = await db.execute(stmt)
    articles = res.scalars().all()
    
    chronological = sorted(articles, key=lambda a: a.published_at)
    contribution_map = {}
    current_seen_sources = set()
    current_seen_countries = set()
    now = datetime.now(timezone.utc)
    
    for item in chronological:
        contributions = []
        dt = item.published_at if item.published_at.tzinfo else item.published_at.replace(tzinfo=timezone.utc)
        if (now - dt).total_seconds() < 86400:
             contributions.append("Recency: Driving the latest momentum")
             
        if item.source and item.source not in current_seen_sources:
             contributions.append(f"Source diversity: Coverage in {item.source}")
             current_seen_sources.add(item.source)
             
        if item.country_name and item.country_name not in current_seen_countries:
             contributions.append(f"Geographic spread: Trend reached {item.country_name}")
             current_seen_countries.add(item.country_name)
             
        if item.engagement > 0:
             contributions.append(f"Engagement: Viral traction")
             
        contributions.append("Volume: Baseline acceleration")
        contribution_map[item.id] = contributions

    results = []
    for item in articles:
        results.append({
             "id": str(item.id),
             "headline": item.title,
             "source": item.source,
             "timestamp": item.published_at,
             "category": item.category,
             "country": item.country_name,
             "image": item.image_url,
             "description": item.description,
             "url": item.url,
             "sentiment": item.sentiment,
             "sentiment_label": item.sentiment_label,
             "trend_contribution": contribution_map.get(item.id, []),
             "topics": item.topics_json
        })
    return {"items": results}


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
