"""Minimal test to insert a single news mention directly."""
import asyncio
import logging
logging.basicConfig(level=logging.DEBUG)

from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import get_db_context
from app.models.trend import Mention, PlatformEnum, Topic

async def main():
    async with get_db_context() as db:
        # Find or create a topic
        res = await db.execute(select(Topic).limit(1))
        topic = res.scalar_one_or_none()
        if not topic:
            topic = Topic(name="Test Topic", description="test", keywords=["test"])
            db.add(topic)
            await db.flush()
        
        print(f"Using topic: {topic.name} ({topic.id})")
        
        try:
            mention = Mention(
                topic_id=topic.id,
                platform=PlatformEnum.news,
                external_id="test-123",
                author="test",
                content="This is a test mention",
                url="https://example.com",
                sentiment_score=0.5,
                sentiment_label="positive",
                engagement_count=0,
                keywords=["test"],
                posted_at=datetime.now(timezone.utc),
                collected_at=datetime.now(timezone.utc),
                source_is_demo=False,
            )
            db.add(mention)
            await db.flush()
            print("SUCCESS: Mention inserted!")
            await db.commit()
        except Exception as e:
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

asyncio.run(main())
