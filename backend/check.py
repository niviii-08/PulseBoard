import asyncio
from sqlalchemy import text
from app.core.database import get_db_context

async def check():
    async with get_db_context() as db:
        res = await db.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'platformenum'::regtype;"))
        print("pg_enum outputs:", [r[0] for r in res.fetchall()])

asyncio.run(check())
