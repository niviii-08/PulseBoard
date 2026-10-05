import asyncio
from sqlalchemy import text
from app.core.database import get_db_context

async def fix_pg():
    async with get_db_context() as db:
        try:
            await db.execute(text("ALTER TYPE platformenum ADD VALUE IF NOT EXISTS 'bluesky'"))
            await db.commit()
            print("Successfully added bluesky to postgres enum")
        except Exception as e:
            print(f"Error (may already exist): {e}")

asyncio.run(fix_pg())
