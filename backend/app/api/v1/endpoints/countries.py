from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.extensions import Country
from app.models.trend import Mention
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", summary="Get country analytics overview")
async def get_countries_overview(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user)
):
    stmt = select(Country.iso_code, Country.name, func.count(Mention.id).label("volume")).join(Mention, Mention.country_id == Country.id, isouter=True).group_by(Country.id)
    res = await db.execute(stmt)
    return [{"iso_code": r.iso_code, "name": r.name, "volume": r.volume} for r in res.all()]
