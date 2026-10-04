"""
The end-to-end DATA -> PROCESSING -> DATABASE pipeline that ties every
engine together for one topic/brand at a time:

    normalize -> sentiment -> topic assignment -> trend snapshots
    -> propagation -> risk (brand-scoped) -> AI explanation -> alerts

This module is deliberately the only place that both (a) talks to the
database and (b) calls the pure engines in app/services/*_engine.py --
the engines themselves stay DB-free and unit-testable; this module is
the (thin, mostly-plumbing) integration layer, exercised by
app/tasks/ingestion_tasks.py (Celery) and scripts/seed_demo_data.py
(one-shot local seeding).
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.collectors.base import NormalizedPost
from app.models.social import Alert, AlertSeverity, AlertType, Brand, PropagationEvent, RiskAssessment, RiskLevel
from app.models.trend import AIInsight, Mention, PlatformEnum, Topic, TrendSnapshot
from app.services import alert_engine, explanation_engine, risk_engine, sentiment_engine, trend_engine
from app.services.keyword_extraction import extract_keywords, top_terms
from app.services.propagation_engine import PlatformObservation, analyze_propagation
from app.services.realtime_events import EventType, publish_event_from_task
from app.services.topic_service import ExistingTopic, match_or_new_topic_name, matches_brand

logger = logging.getLogger("pulseboard.pipeline")

BUCKET_HOURS = 1.0
BASELINE_WINDOW_BUCKETS = 4
ALL_PLATFORMS = [p.value for p in PlatformEnum]
HIGH_REACH_ENGAGEMENT_THRESHOLD = 500


async def get_or_create_topic(db: AsyncSession, name: str, keywords: list[str], brand_id=None) -> Topic:
    res = await db.execute(select(Topic).where(Topic.name == name))
    topic = res.scalar_one_or_none()
    if topic:
        return topic
    topic = Topic(name=name, description=f"Discussions about {name}", keywords=keywords, brand_id=brand_id)
    db.add(topic)
    await db.flush()
    return topic


async def assign_topic_for_text(db: AsyncSession, text: str) -> Topic:
    """Keyword-overlap topic assignment for organically-collected (non-demo)
    posts -- see app.services.topic_service."""
    res = await db.execute(select(Topic))
    existing = [ExistingTopic(id=str(t.id), keywords=t.keywords or []) for t in res.scalars().all()]
    topic_id, keywords = match_or_new_topic_name(text, existing)
    if topic_id:
        res2 = await db.execute(select(Topic).where(Topic.id == topic_id))
        return res2.scalar_one()
    name = " ".join(keywords[:4]).title() or "Untitled Topic"
    return await get_or_create_topic(db, name, keywords)


async def ingest_normalized_posts(
    db: AsyncSession,
    posts: list[NormalizedPost],
    *,
    source_is_demo: bool,
    forced_topic_name: str | None = None,
    forced_topic_keywords: list[str] | None = None,
    forced_brand_name: str | None = None,
) -> list[Topic]:
    """
    Persists a batch of normalized posts as Mention rows.

    Demo posts (source_is_demo=True) carry their own topic/brand
    assignment (forced_topic_name/forced_brand_name) because the demo
    scenario is scripted to prove specific behavior -- letting fuzzy
    keyword matching reassign them would defeat the point. Real
    collector output has no such hint and goes through
    assign_topic_for_text's keyword-overlap matching instead.
    """
    touched_topics: dict[str, Topic] = {}

    brand_by_name: dict[str, Brand] = {}
    if forced_brand_name:
        res = await db.execute(select(Brand).where(Brand.name == forced_brand_name))
        brand = res.scalar_one_or_none()
        if brand:
            brand_by_name[forced_brand_name] = brand

    for post in posts:
        score, label = sentiment_engine.score_text(post.text)
        keywords = extract_keywords(post.text)

        if forced_topic_name:
            topic = touched_topics.get(forced_topic_name) or await get_or_create_topic(
                db, forced_topic_name, forced_topic_keywords or keywords,
                brand_id=brand_by_name.get(forced_brand_name).id if forced_brand_name in brand_by_name else None,
            )
        else:
            topic = await assign_topic_for_text(db, post.text)
        touched_topics[topic.name] = topic

        brand = brand_by_name.get(forced_brand_name) if forced_brand_name else None

        db.add(
            Mention(
                topic_id=topic.id,
                brand_id=brand.id if brand else None,
                platform=PlatformEnum(post.platform),
                external_id=post.external_id,
                author=post.author,
                content=post.text[:2000] if post.text else None,
                url=post.url,
                sentiment_score=score,
                sentiment_label=label,
                engagement_count=post.engagement_count,
                keywords=keywords,
                posted_at=post.published_at,
                collected_at=datetime.now(timezone.utc),
                source_is_demo=source_is_demo,
            )
        )

    await db.flush()
    return list(touched_topics.values())


def _bucket_floor(dt: datetime, bucket_hours: float) -> datetime:
    epoch = dt.replace(minute=0, second=0, microsecond=0)
    hours_since_epoch = int((epoch - datetime(1970, 1, 1, tzinfo=timezone.utc)).total_seconds() // 3600)
    aligned = hours_since_epoch - (hours_since_epoch % int(bucket_hours))
    return datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(hours=aligned)


async def rebuild_trend_snapshots(db: AsyncSession, topic: Topic, now: datetime | None = None) -> list[TrendSnapshot]:
    """
    Buckets every mention for this topic into BUCKET_HOURS-wide windows and
    computes a real TrendSnapshot per bucket (growth vs. a rolling
    baseline of the preceding buckets, acceleration vs. the previous
    bucket's growth rate, cross-platform spread as of that bucket, and
    sentiment movement vs. the topic's own pre-spike baseline). This is
    what gives the sentiment/trend charts an actual time series instead
    of one static row.

    Existing snapshots for this topic are replaced wholesale -- simpler
    and always internally consistent, and cheap enough at demo/portfolio
    data volumes. At real production volume this would instead append
    only the newest bucket each run.
    """
    now = now or datetime.now(timezone.utc)
    res = await db.execute(select(Mention).where(Mention.topic_id == topic.id).order_by(Mention.posted_at))
    mentions = res.scalars().all()
    if not mentions:
        return []

    start_bucket = _bucket_floor(mentions[0].posted_at, BUCKET_HOURS)
    end_bucket = _bucket_floor(now, BUCKET_HOURS)
    n_buckets = int((end_bucket - start_bucket).total_seconds() // (3600 * BUCKET_HOURS)) + 1

    buckets: list[dict] = []
    for i in range(n_buckets):
        b_start = start_bucket + timedelta(hours=i * BUCKET_HOURS)
        b_end = b_start + timedelta(hours=BUCKET_HOURS)
        bucket_mentions = [m for m in mentions if b_start <= m.posted_at < b_end]
        buckets.append({"start": b_start, "end": b_end, "mentions": bucket_mentions})

    # Pre-spike sentiment baseline: mean sentiment across the first
    # BASELINE_WINDOW_BUCKETS non-empty buckets (i.e. before things heated up).
    pre_spike_scores = []
    for b in buckets:
        if len(pre_spike_scores) >= BASELINE_WINDOW_BUCKETS * 5:
            break
        pre_spike_scores.extend(m.sentiment_score for m in b["mentions"])
    sentiment_baseline = sum(pre_spike_scores) / len(pre_spike_scores) if pre_spike_scores else 0.0

    await db.execute(TrendSnapshot.__table__.delete().where(TrendSnapshot.topic_id == topic.id))

    previous_growth_rate = 0.0
    snapshots: list[TrendSnapshot] = []
    for i, bucket in enumerate(buckets):
        volume = len(bucket["mentions"])
        window = buckets[max(0, i - BASELINE_WINDOW_BUCKETS):i]
        baseline_volumes = [len(w["mentions"]) for w in window]
        baseline_volume = sum(baseline_volumes) / len(baseline_volumes) if baseline_volumes else 0.0

        scores = [m.sentiment_score for m in bucket["mentions"]]
        breakdown = sentiment_engine.aggregate_sentiment(scores)

        platforms_seen = {m.platform.value for w in buckets[:i + 1] for m in w["mentions"]}
        avg_engagement = (sum(m.engagement_count for m in bucket["mentions"]) / volume) if volume else 0.0
        hours_since_last = 0.0 if volume else BUCKET_HOURS * (i - _last_nonempty_index(buckets, i))

        score_result = trend_engine.score_trend(
            trend_engine.TrendInput(
                current_volume=volume,
                baseline_volume=baseline_volume,
                previous_growth_rate=previous_growth_rate,
                hours_since_last_mention=hours_since_last,
                avg_engagement=avg_engagement,
                platform_count=len(platforms_seen),
                max_platform_count=len(ALL_PLATFORMS),
                sentiment_now=breakdown.sentiment_score,
                sentiment_baseline=sentiment_baseline,
            )
        )
        previous_growth_rate = score_result.growth_rate

        snapshot = TrendSnapshot(
            topic_id=topic.id,
            timestamp=bucket["end"],
            volume_last_hour=volume,
            baseline_volume=round(baseline_volume, 2),
            sentiment_avg=breakdown.sentiment_score,
            positive_pct=breakdown.positive_pct,
            negative_pct=breakdown.negative_pct,
            neutral_pct=breakdown.neutral_pct,
            growth_rate=score_result.growth_rate,
            acceleration=score_result.acceleration,
            cross_platform_count=len(platforms_seen),
            trend_score=score_result.trend_score,
            score_breakdown=score_result.breakdown,
        )
        db.add(snapshot)
        snapshots.append(snapshot)

    await db.flush()
    return snapshots


def _last_nonempty_index(buckets: list[dict], upto: int) -> int:
    for i in range(upto - 1, -1, -1):
        if buckets[i]["mentions"]:
            return i
    return 0


async def rebuild_propagation(db: AsyncSession, topic: Topic) -> list[PropagationEvent]:
    res = await db.execute(select(Mention).where(Mention.topic_id == topic.id).order_by(Mention.posted_at))
    mentions = res.scalars().all()

    by_platform: dict[str, list[Mention]] = defaultdict(list)
    for m in mentions:
        by_platform[m.platform.value].append(m)

    observations = []
    for platform, plat_mentions in by_platform.items():
        first_seen = plat_mentions[0].posted_at
        first_hour = [m for m in plat_mentions if m.posted_at < first_seen + timedelta(hours=BUCKET_HOURS)]
        observations.append(
            PlatformObservation(
                platform=platform,
                first_seen_at=first_seen,
                mentions_in_first_hour=len(first_hour),
                mentions_total=len(plat_mentions),
            )
        )

    result = analyze_propagation(observations)
    await db.execute(PropagationEvent.__table__.delete().where(PropagationEvent.topic_id == topic.id))
    events = []
    if result.established:
        for step in result.steps:
            event = PropagationEvent(
                topic_id=topic.id,
                platform=step.platform,
                first_seen_at=step.first_seen_at,
                sequence_order=step.sequence_order,
                mentions_at_detection=step.mentions_at_detection,
                growth_since_entry_pct=step.growth_since_entry_pct,
            )
            db.add(event)
            events.append(event)
    await db.flush()
    return events


async def generate_ai_insight(db: AsyncSession, topic: Topic) -> AIInsight | None:
    res = await db.execute(
        select(TrendSnapshot).where(TrendSnapshot.topic_id == topic.id).order_by(TrendSnapshot.timestamp)
    )
    snapshots = res.scalars().all()
    if not snapshots:
        return None
    latest = snapshots[-1]

    res_m = await db.execute(select(Mention).where(Mention.topic_id == topic.id))
    mentions = res_m.scalars().all()
    platform_counts = defaultdict(int)
    for m in mentions:
        platform_counts[m.platform.value] += 1
    top_platforms = sorted(platform_counts.items(), key=lambda kv: kv[1], reverse=True)

    top_posts = sorted(mentions, key=lambda m: m.engagement_count, reverse=True)[:5]
    top_posts_evidence = [{"platform": m.platform.value, "engagement_count": m.engagement_count, "url": m.url} for m in top_posts]

    keywords = top_terms([m.content or "" for m in mentions], top_n=6)

    shift = sentiment_engine.detect_shift(
        [{"timestamp": s.timestamp, "positive_pct": s.positive_pct} for s in snapshots]
    )

    evidence = explanation_engine.build_evidence(
        topic_name=topic.name,
        total_mentions=len(mentions),
        growth_rate=latest.growth_rate,
        positive_pct=latest.positive_pct,
        negative_pct=latest.negative_pct,
        neutral_pct=latest.neutral_pct,
        top_platforms=top_platforms,
        top_posts=top_posts_evidence,
        top_keywords=[k for k, _ in keywords],
        sentiment_shift=shift.__dict__ if shift.shift_detected else None,
    )

    if shift.shift_detected:
        text, generated_by = await explanation_engine.explain_sentiment_shift(evidence)
        kind = "sentiment_shift"
    else:
        text, generated_by = await explanation_engine.explain_why_trending(evidence)
        kind = "why_trending"

    insight = AIInsight(
        topic_id=topic.id,
        kind=kind,
        summary_text=text,
        key_drivers={"top_keywords": [k for k, _ in keywords], "top_platforms": top_platforms},
        evidence={
            "growth_rate": latest.growth_rate,
            "positive_pct": latest.positive_pct,
            "negative_pct": latest.negative_pct,
            "sentiment_shift": shift.__dict__,
        },
        generated_by=generated_by,
    )
    db.add(insight)
    await db.flush()
    return insight


async def rebuild_brand_risk(db: AsyncSession, brand: Brand) -> RiskAssessment | None:
    res = await db.execute(select(Mention).where(Mention.brand_id == brand.id))
    mentions = res.scalars().all()
    if not mentions:
        return None

    now = max(m.posted_at for m in mentions)
    recent_cutoff = now - timedelta(hours=24)
    baseline_cutoff = now - timedelta(hours=96)
    recent = [m for m in mentions if m.posted_at >= recent_cutoff]
    baseline = [m for m in mentions if baseline_cutoff <= m.posted_at < recent_cutoff]

    def negative_pct(batch: list[Mention]) -> float:
        return sentiment_engine.aggregate_sentiment([m.sentiment_score for m in batch]).negative_pct

    recent_negative_pct = negative_pct(recent)
    baseline_negative_pct = negative_pct(baseline) if baseline else recent_negative_pct

    recent_volume, baseline_volume = len(recent), len(baseline) or 1
    growth_rate = trend_engine.compute_growth_rate(recent_volume, baseline_volume)

    negative_mentions = [m for m in recent if m.sentiment_label == "negative"]
    complaint_terms = top_terms([m.content or "" for m in negative_mentions], top_n=5)
    complaint_cluster_size = complaint_terms[0][1] if complaint_terms else 0

    high_reach = [m for m in negative_mentions if m.engagement_count >= HIGH_REACH_ENGAGEMENT_THRESHOLD]
    platforms_affected = len({m.platform.value for m in recent})

    risk = risk_engine.assess_risk(
        risk_engine.RiskInput(
            negative_pct=recent_negative_pct,
            negative_pct_baseline=baseline_negative_pct,
            mention_growth_rate=growth_rate,
            complaint_cluster_size=complaint_cluster_size,
            high_reach_mentions=len(high_reach),
            platforms_affected=platforms_affected,
            max_platforms=len(ALL_PLATFORMS),
            repeated_keyword_hits=sum(1 for _, c in complaint_terms if c >= 2),
        )
    )

    assessment = RiskAssessment(
        brand_id=brand.id,
        risk_score=risk.risk_score,
        risk_level=RiskLevel(risk.risk_level),
        drivers=risk.drivers,
        negative_mentions_pct=recent_negative_pct,
        mention_growth_rate=growth_rate,
        platforms_affected=platforms_affected,
        complaint_clusters=[t for t, _ in complaint_terms],
    )
    db.add(assessment)
    await db.flush()
    return assessment


async def rebuild_alerts_for_topic(db: AsyncSession, topic: Topic) -> list[Alert]:
    res = await db.execute(
        select(TrendSnapshot).where(TrendSnapshot.topic_id == topic.id).order_by(TrendSnapshot.timestamp)
    )
    snapshots = res.scalars().all()
    if not snapshots:
        return []
    latest = snapshots[-1]

    candidates = [
        alert_engine.check_trend_alert(latest.trend_score, topic.name),
        alert_engine.check_mention_spike_alert(latest.growth_rate, topic.name),
        alert_engine.check_cross_platform_alert(latest.cross_platform_count, topic.name),
    ]
    shift = sentiment_engine.detect_shift(
        [{"timestamp": s.timestamp, "positive_pct": s.positive_pct} for s in snapshots]
    )
    if shift.shift_detected:
        candidates.append(alert_engine.check_sentiment_shift_alert(shift.delta_pct_points, topic.name))

    created = []
    for c in candidates:
        if c is None:
            continue
        alert = Alert(
            alert_type=AlertType(c.alert_type),
            severity=AlertSeverity(c.severity),
            topic_id=topic.id,
            message=c.message,
            drivers=c.drivers,
            threshold_value=c.threshold_value,
            observed_value=c.observed_value,
        )
        db.add(alert)
        created.append(alert)
    await db.flush()

    for alert in created:
        await publish_event_from_task(
            EventType.ALERT_CREATED,
            {"alert_type": alert.alert_type.value, "severity": alert.severity.value, "topic_id": topic.id, "message": alert.message},
        )
    return created


async def rebuild_alerts_for_brand(db: AsyncSession, brand: Brand, assessment: RiskAssessment) -> Alert | None:
    candidate = alert_engine.check_brand_risk_alert(assessment.risk_score, brand.name)
    if not candidate:
        return None
    alert = Alert(
        alert_type=AlertType(candidate.alert_type),
        severity=AlertSeverity(candidate.severity),
        brand_id=brand.id,
        message=candidate.message,
        drivers=candidate.drivers,
        threshold_value=candidate.threshold_value,
        observed_value=candidate.observed_value,
    )
    db.add(alert)
    await db.flush()
    await publish_event_from_task(
        EventType.BRAND_RISK_CHANGED,
        {"brand_id": brand.id, "risk_score": assessment.risk_score, "risk_level": assessment.risk_level.value},
    )
    return alert


async def run_pipeline_for_topic(db: AsyncSession, topic: Topic, now: datetime | None = None) -> None:
    """The full per-topic engine chain, in dependency order."""
    await rebuild_trend_snapshots(db, topic, now=now)
    await rebuild_propagation(db, topic)
    await generate_ai_insight(db, topic)
    await rebuild_alerts_for_topic(db, topic)


async def run_pipeline_for_brand(db: AsyncSession, brand: Brand) -> None:
    assessment = await rebuild_brand_risk(db, brand)
    if assessment:
        await rebuild_alerts_for_brand(db, brand, assessment)
