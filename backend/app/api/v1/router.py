from fastapi import APIRouter

from app.api.v1.endpoints import alerts, auth, brands, dashboard, health, search, sources, trends, websocket, news, countries, analytics, global_overview, system

api_router = APIRouter()

api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(countries.router, prefix="/countries", tags=["countries"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(global_overview.router, prefix="/global", tags=["global"])
api_router.include_router(trends.router, prefix="/trending", tags=["trending"])
api_router.include_router(trends.router, prefix="/trends", tags=["trending-alias"])
api_router.include_router(brands.router, prefix="/brands", tags=["brands"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(sources.collectors_router, prefix="/collectors", tags=["sources"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(websocket.router, tags=["realtime"])
