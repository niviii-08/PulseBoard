from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.content import ContentItem
from app.models.trend import Topic, Mention, Event
from app.api.deps import get_current_user
from datetime import datetime, timedelta, timezone

router = APIRouter()

def _build_why_this_matters(item: ContentItem) -> str:
    parts = []
    if item.category:
         parts.append(f"categorized under {item.category}")
    if item.country_name:
         parts.append(f"related to {item.country_name}")
         
    about = " and ".join(parts)
    desc = f"An article from {item.source or 'various sources'}"
    if about:
         desc += f" {about}"
         
    tags = ""
    if item.entities_json:
        key_entities = [e for e, _ in item.entities_json[:3]] if isinstance(item.entities_json[0], (list, tuple)) else item.entities_json[:3]
        if key_entities:
            tags = f" Key entities discussed include: {', '.join(key_entities)}."
            
    base_desc = f"{desc}. This reflects a {item.sentiment_label} sentiment ({item.sentiment:.2f}) on the subject.{tags}"
    
    if item.country_name and item.country_name.lower() == "india":
        return f"AI India Briefing: This trend heavily impacts the Indian demographic {about}. {base_desc}"
    
    return base_desc

@router.get("", summary="Get global news articles")
async def get_news(
    category: str | None = None,
    country: str | None = None,
    source: str | None = None,
    language: str | None = None,
    search: str | None = None,
    days_ago: int | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ContentItem)
    # Filter demo
    stmt = stmt.where(ContentItem.source != "demo")
    
    if category:
        stmt = stmt.where(ContentItem.category.ilike(f"%{category}%"))
    if country:
        stmt = stmt.where(ContentItem.country_name.ilike(f"%{country}%"))
    if source:
        stmt = stmt.where(ContentItem.source.ilike(f"%{source}%"))
    if language:
        stmt = stmt.where(ContentItem.language == language)
    if search:
        stmt = stmt.where(or_(
            ContentItem.title.ilike(f"%{search}%"),
            ContentItem.description.ilike(f"%{search}%")
        ))
    if days_ago:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_ago)
        stmt = stmt.where(ContentItem.published_at >= cutoff)
        
    stmt = stmt.order_by(ContentItem.published_at.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    now = datetime.now(timezone.utc)
    
    results = []
    
    # Pre-fetch all topics for faster mapping
    topic_ids = []
    for item in items:
        if item.topics_json:
            topic_ids.extend(item.topics_json)
    topic_map = {}
    event_map = {}
    if topic_ids:
        # Assuming topics_json contains string IDs
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import UUID
        import uuid
        
        valid_uuids = []
        for tid in set(topic_ids):
            if tid:
                try: 
                   valid_uuids.append(uuid.UUID(tid))
                except: pass
                
        if valid_uuids:
            t_res = await db.execute(select(Topic).where(Topic.id.in_(valid_uuids)))
            for t in t_res.scalars().all():
                topic_map[t.id.hex] = t.name
                
            e_res = await db.execute(select(Event).where(Event.topic_id.in_(valid_uuids)))
            for e in e_res.scalars().all():
                event_map[e.topic_id.hex] = e.name # simplistic mapping of one event per topic

    for item in items:
        # A live indicator if published in the last 24 hours
        is_live = False
        if item.created_at.tzinfo is None:
             item_time = item.created_at.replace(tzinfo=timezone.utc)
        else:
             item_time = item.created_at
             
        if (now - item_time).total_seconds() < 7200: # Fetched within last 2 hours
             is_live = True

        # Simulate Regional/Vernacular extraction
        original_source = item.source or 'Various'
        vernacular_msg = None
        if item.country_name and item.country_name.lower() == "india":
             # pseudo-random consistent selection using hash of title length for demo
             mod_val = len(item.title or "") % 5
             langs = {1: "(Translated from Hindi)", 2: "(Translated from Tamil)", 3: "(Translated from Marathi)", 4: "(Translated from Bengali)"}
             if mod_val in langs:
                 vernacular_msg_str = langs[mod_val]
                 original_source = f"{original_source} {vernacular_msg_str}"
                 vernacular_msg = vernacular_msg_str
                 
        results.append({
            "id": str(item.id),
            "headline": item.title,
            "source": original_source,
            "vernacular_extraction": vernacular_msg,
            "timestamp": item.published_at,
            "category": item.category,
            "country": item.country_name,
            "image": item.image_url,
            "description": item.description,
            "url": item.url,
            "sentiment": item.sentiment,
            "sentiment_label": item.sentiment_label,
            "why_this_matters": _build_why_this_matters(item),
            "is_live": is_live,
            "topics": item.topics_json,
            "topic_name": topic_map.get(item.topics_json[0]) if item.topics_json else None,
            "topic_id": item.topics_json[0] if item.topics_json else None,
            "event_name": event_map.get(item.topics_json[0]) if item.topics_json else None
        })
    # Could also return total count if pagination needs it, but simpler this way.
    return {"items": results, "page": page, "limit": limit}

@router.get("/breaking", summary="Get breaking news")
async def get_breaking_news(
    limit: int = Query(default=5, le=20),
    db: AsyncSession = Depends(get_db)
):
    # breaking means high engagement or highly negative/positive sentiment, plus latest
    stmt = select(ContentItem).where(ContentItem.source != "demo")
    stmt = stmt.order_by(ContentItem.engagement.desc(), ContentItem.published_at.desc()).limit(limit)
    res = await db.execute(stmt)
    
    now = datetime.now(timezone.utc)
    res_break = res.scalars().all()
    results = []
    
    topic_ids = []
    for item in res_break:
        if item.topics_json:
            topic_ids.extend(item.topics_json)
    topic_map = {}
    event_map = {}
    if topic_ids:
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import UUID
        import uuid
        
        valid_uuids = []
        for tid in set(topic_ids):
            if tid:
                try: 
                   valid_uuids.append(uuid.UUID(tid))
                except: pass
                
        if valid_uuids:
            t_res = await db.execute(select(Topic).where(Topic.id.in_(valid_uuids)))
            for t in t_res.scalars().all():
                topic_map[t.id.hex] = t.name
            e_res = await db.execute(select(Event).where(Event.topic_id.in_(valid_uuids)))
            for e in e_res.scalars().all():
                event_map[e.topic_id.hex] = e.name

    for item in res_break:
        is_live = False
        if item.created_at.tzinfo is None:
             item_time = item.created_at.replace(tzinfo=timezone.utc)
        else:
             item_time = item.created_at
        if (now - item_time).total_seconds() < 7200:
             is_live = True

        # Simulate Regional/Vernacular extraction
        original_source = item.source or 'Various'
        vernacular_msg = None
        if item.country_name and item.country_name.lower() == "india":
             mod_val = len(item.title or "") % 5
             langs = {1: "(Translated from Hindi)", 2: "(Translated from Tamil)", 3: "(Translated from Marathi)", 4: "(Translated from Bengali)"}
             if mod_val in langs:
                 vernacular_msg_str = langs[mod_val]
                 original_source = f"{original_source} {vernacular_msg_str}"
                 vernacular_msg = vernacular_msg_str

        results.append({
            "id": str(item.id),
            "headline": item.title,
            "source": original_source,
            "vernacular_extraction": vernacular_msg,
            "timestamp": item.published_at,
            "country": item.country_name,
            "category": item.category,
            "image": item.image_url,
            "description": item.description,
            "url": item.url,
            "sentiment": item.sentiment,
            "sentiment_label": item.sentiment_label,
            "why_this_matters": _build_why_this_matters(item),
            "is_live": is_live,
            "topics": item.topics_json,
            "topic_name": topic_map.get(item.topics_json[0]) if item.topics_json else None,
            "topic_id": item.topics_json[0] if item.topics_json else None,
            "event_name": event_map.get(item.topics_json[0]) if item.topics_json else None
        })
    return {"items": results}
