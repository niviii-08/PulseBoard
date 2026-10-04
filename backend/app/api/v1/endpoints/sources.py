"""
GET /sources -- honest connector status (Section 22 of the spec: "Do not
falsely claim a connector is active"). POST /collectors/run triggers a
collection pass on demand instead of waiting for the Celery Beat schedule.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.collectors.registry import collector_statuses
from app.core.database import get_db
from app.models.trend import Mention, PlatformEnum
from app.tasks.ingestion_tasks import collect_and_process, refresh_demo_data

router = APIRouter()
collectors_router = APIRouter()


@router.get("", summary="Data source connector status")
async def get_sources(db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    out = []
    for entry in collector_statuses():
        platform = entry["platform"]
        if platform == "demo":
            stmt = select(func.count(Mention.id), func.max(Mention.collected_at)).where(Mention.source_is_demo.is_(True))
        else:
            stmt = select(func.count(Mention.id), func.max(Mention.collected_at)).where(
                Mention.platform == PlatformEnum(platform), Mention.source_is_demo.is_(False)
            )
        res = await db.execute(stmt)
        count, last_collected = res.first()
        out.append(
            {
                "source": entry["source"],
                "platform": platform,
                "status": entry["status"],
                "records": count or 0,
                "last_collection": last_collected,
            }
        )
    return out


@collectors_router.post("/run", summary="Trigger a collection pass now")
async def run_collectors(source: str = Query(default="live", pattern="^(live|demo)$"), _user=Depends(get_current_user)):
    if source == "demo":
        task = refresh_demo_data.delay()
    else:
        task = collect_and_process.delay()
    return {"queued": True, "task_id": task.id, "source": source, "queued_at": datetime.now(timezone.utc)}
