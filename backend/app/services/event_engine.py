import logging
from datetime import datetime, timezone
from collections import Counter
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trend import Topic, Event, Mention
from app.collectors.base import NormalizedArticle
from app.services.topic_clustering import _cluster_keyword, _cluster_embedding, generate_cluster_label, get_embedding_model
from app.services.sentiment_engine import aggregate_sentiment
from app.core.config import settings

logger = logging.getLogger("pulseboard.event_engine")

def _generate_event_timeline(mentions: list[Mention]) -> list[dict]:
    timeline = []
    if not mentions:
        return timeline
        
    sorted_m = sorted(mentions, key=lambda m: m.posted_at)
    
    first = sorted_m[0]
    timeline.append({
        "timestamp": first.posted_at.isoformat(),
        "description": "First report"
    })
    
    seen_platforms = {first.platform.value}
    seen_countries = {str(first.country_id)} if first.country_id else set()
    social_count = 0
    breakout_triggered = False
    major_pub_triggered = False
    intl_triggered = False
    
    for i, m in enumerate(sorted_m[1:]):
        # Major publication
        if not major_pub_triggered and m.platform.value == "news":
            timeline.append({
                "timestamp": m.posted_at.isoformat(),
                "description": "Major publication coverage"
            })
            major_pub_triggered = True
            
        # International coverage
        if m.country_id and str(m.country_id) not in seen_countries:
            seen_countries.add(str(m.country_id))
            if len(seen_countries) > 1 and not intl_triggered:
                timeline.append({
                    "timestamp": m.posted_at.isoformat(),
                    "description": "International coverage"
                })
                intl_triggered = True
                
        # Social discussion increases
        if m.platform.value in ["x", "reddit", "youtube", "tiktok", "bluesky"]:
            social_count += 1
            if social_count == 3: # Arbitrary threshold for "increases"
                timeline.append({
                    "timestamp": m.posted_at.isoformat(),
                    "description": "Social discussion increases"
                })
                
        # Breakout
        if i >= 4 and not breakout_triggered:
            # Check velocity over last 5 posts
            dt = (m.posted_at - sorted_m[i-4].posted_at).total_seconds()
            if dt < 3600 and dt > 0: # 5 posts in less than an hour for an event
                timeline.append({
                    "timestamp": m.posted_at.isoformat(),
                    "description": "Topic becomes breakout"
                })
                breakout_triggered = True
                
    return timeline

async def detect_events_for_topic(db: AsyncSession, topic: Topic) -> list[Event]:
    res = await db.execute(select(Mention).where(Mention.topic_id == topic.id).order_by(Mention.posted_at.asc()))
    mentions = res.scalars().all()
    if not mentions:
        return []

    dummy_articles = []
    mention_map = {}
    for m in mentions:
        art = NormalizedArticle(
            title="", 
            description=m.content or "No content",
            url=m.url,
            published_at=m.posted_at,
            source=m.platform.value,
            source_type=None,
            country=str(m.country_id) if m.country_id else None,
            language=None,
            category=None,
            author=m.author,
            image_url=None,
        )
        dummy_articles.append(art)
        mention_map[id(art)] = m

    method = getattr(settings, "CLUSTERING_METHOD", "keyword")
    
    if method == "embedding" and get_embedding_model() is not None:
        clusters, docs_keywords = _cluster_embedding(dummy_articles, threshold=0.75)
    else:
        clusters, docs_keywords = _cluster_keyword(dummy_articles, threshold=0.45)

    await db.execute(Event.__table__.delete().where(Event.topic_id == topic.id))
    
    events = []
    for cluster_indices in clusters:
        if not cluster_indices:
            continue
            
        term_freq = Counter()
        cluster_mentions = []
        for idx in cluster_indices:
            term_freq.update(docs_keywords[idx])
            cluster_mentions.append(mention_map[id(dummy_articles[idx])])
            
        top_cluster_keywords = [t for t, _ in term_freq.most_common(5)]
        if not top_cluster_keywords:
            top_cluster_keywords = ["Unknown Event"]
            
        label = generate_cluster_label(top_cluster_keywords)
        
        first_seen = min(m.posted_at for m in cluster_mentions)
        latest_seen = max(m.posted_at for m in cluster_mentions)
        
        sources = {m.platform.value for m in cluster_mentions}
        countries = list({str(m.country_id) for m in cluster_mentions if m.country_id})
        
        scores = [m.sentiment_score for m in cluster_mentions]
        sentiment_agg = aggregate_sentiment(scores)
        
        duration_hours = (latest_seen - first_seen).total_seconds() / 3600.0
        if duration_hours < 1:
            duration_hours = 1
        velocity = len(cluster_mentions) / duration_hours
        
        timeline = _generate_event_timeline(cluster_mentions)
        
        event = Event(
            topic_id=topic.id,
            name=label,
            description=f"Event regarding {label}",
            first_seen=first_seen,
            latest_seen=latest_seen,
            article_count=len(cluster_mentions),
            source_count=len(sources),
            countries=countries,
            event_velocity=round(velocity, 2),
            related_entities=top_cluster_keywords,
            related_topics=[], 
            sentiment=round(sentiment_agg.sentiment_score, 2),
            timeline=timeline,
        )
        db.add(event)
        await db.flush()
        
        for m in cluster_mentions:
            m.event_id = event.id
            
        events.append(event)
        
    await db.flush()
    return events
