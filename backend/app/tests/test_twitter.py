import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_twitter_categories_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/twitter/categories")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 8
        cat_ids = [c["id"] for c in data]
        assert "all" in cat_ids
        assert "tech" in cat_ids
        assert "pop_culture" in cat_ids
        assert "memes" in cat_ids


@pytest.mark.asyncio
async def test_twitter_feed_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/twitter/feed?category=tech&page=1&limit=5")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert len(data["items"]) == 5
        assert data["total"] > 5
        assert data["page"] == 1
        assert "author" in data["items"][0]
        assert "stats" in data["items"][0]


@pytest.mark.asyncio
async def test_twitter_trends_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/twitter/trends")
        assert res.status_code == 200
        data = res.json()
        assert "trends" in data
        assert len(data["trends"]) >= 10
        assert data["trends"][0]["rank"] == 1


@pytest.mark.asyncio
async def test_twitter_threads_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/twitter/threads")
        assert res.status_code == 200
        data = res.json()
        assert "threads" in data
        assert len(data["threads"]) >= 4
        assert len(data["threads"][0]["tweets"]) >= 5


@pytest.mark.asyncio
async def test_twitter_ratios_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/twitter/ratios")
        assert res.status_code == 200
        data = res.json()
        assert "ratios" in data
        assert len(data["ratios"]) >= 3


@pytest.mark.asyncio
async def test_twitter_resources_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/twitter/resources")
        assert res.status_code == 200
        data = res.json()
        assert "directories" in data
        assert data["total_accounts"] >= 20


@pytest.mark.asyncio
async def test_twitter_slang_and_stats_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        slang_res = await ac.get("/api/v1/twitter/slang")
        assert slang_res.status_code == 200
        assert len(slang_res.json()["slang"]) >= 8

        stats_res = await ac.get("/api/v1/twitter/stats")
        assert stats_res.status_code == 200
        assert stats_res.json()["tracked_tweets_24h"] > 100000
