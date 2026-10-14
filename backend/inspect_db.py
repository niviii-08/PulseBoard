import asyncio
from app.core.database import get_db_context
from sqlalchemy import select
from app.models.content import ContentItem
from app.models.trend import Topic

async def main():
    async with get_db_context() as db:
        content_res = await db.execute(select(ContentItem).limit(5))
        contents = content_res.scalars().all()
        for i, c in enumerate(contents):
            print(f"Content {i}: {c.title}")
            print(f"  topics_json: {c.topics_json}")

        topic_res = await db.execute(select(Topic.id, Topic.name))
        topics = topic_res.all()
        print("\n--- Topics ---")
        for t in topics[:10]:
            print(f"{t.id} -> {t.name}")
        print(f"Total topics: {len(topics)}")

if __name__ == "__main__":
    asyncio.run(main())
