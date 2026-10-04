from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.core.database import get_db
from app.api.v1.endpoints.dashboard import get_dashboard

router = APIRouter()

@router.get("/overview", summary="Analytics overview")
async def get_analytics_overview(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return await get_dashboard(db=db, _user=user)
