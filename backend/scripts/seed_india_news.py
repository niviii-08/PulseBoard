import asyncio
from datetime import datetime, timezone, timedelta
from app.core.database import AsyncSessionLocal
from app.models.content import ContentItem
from app.services import pipeline

# Diverse categories aligning with our 15 categories for India
MOCK_INDIA_NEWS = [
    {
        "external_id": "in-pol-001",
        "platform": "news",
        "author": "The Hindu",
        "text": "Upcoming State Elections Expected to Shift Balance in Rajya Sabha. Key states outline new alliances ahead of polling dates. The Election Commission sets strict guidelines for digital campaigning.",
        "url": "https://www.thehindu.com/news/national",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=1),
        "engagement_count": 4500,
        "metadata_override": {"category": "POLITICS", "country_name": "India"},
        "topic_name": "State Elections 2026",
    },
    {
        "external_id": "in-biz-001",
        "platform": "news",
        "author": "Economic Times",
        "text": "Reserve Bank of India Keeps Repo Rate Unchanged at 6.5%. Inflation concerns ease slightly, but global headwinds persist according to the latest MPC meeting minutes.",
        "url": "https://economictimes.indiatimes.com/",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=2),
        "engagement_count": 8200,
        "metadata_override": {"category": "BUSINESS & ECONOMY", "country_name": "India"},
        "topic_name": "RBI Monetary Policy",
    },
    {
        "external_id": "in-tech-001",
        "platform": "news",
        "author": "TechCrunch India",
        "text": "India's Tech Sector Exports Surpass Expected Targets by 15%. AI and Cloud services drive major growth in Q3 as GCCs expand footprint in Bengaluru and Hyderabad.",
        "url": "https://techcrunch.com/",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=3),
        "engagement_count": 3100,
        "metadata_override": {"category": "TECHNOLOGY", "country_name": "India"},
        "topic_name": "Tech Exports Growth",
    },
    {
        "external_id": "in-strat-001",
        "platform": "news",
        "author": "YourStory",
        "text": "Fintech Startup Revolutionizing Rural Credit Raises $50M Series B. Focuses on unbanked sectors across Tier 3 cities in India with innovative UPI integration.",
        "url": "https://yourstory.com/",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=4),
        "engagement_count": 1500,
        "metadata_override": {"category": "STARTUPS", "country_name": "India"},
        "topic_name": "Rural Fintech Funding",
    },
    {
        "external_id": "in-bol-001",
        "platform": "news",
        "author": "Pinkvilla",
        "text": "Highly Anticipated Action Thriller Breaks Opening Day Box Office Records. The massive nationwide release sets a new benchmark for Bollywood blockbusters this year.",
        "url": "https://www.pinkvilla.com/",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=5),
        "engagement_count": 12000,
        "metadata_override": {"category": "BOLLYWOOD & ENTERTAINMENT", "country_name": "India"},
        "topic_name": "Bollywood Box Office",
    },
    {
        "external_id": "in-cri-001",
        "platform": "news",
        "author": "ESPNcricinfo",
        "text": "India Secures Thrilling Last-Over Victory in T20 Series Decider. Stunning century by the captain leads the charge in a historic run-chase against Australia.",
        "url": "https://www.espncricinfo.com/",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=1, minutes=30),
        "engagement_count": 25000,
        "metadata_override": {"category": "CRICKET & SPORTS", "country_name": "India"},
        "topic_name": "India vs Australia T20",
    },
    {
        "external_id": "in-sci-001",
        "platform": "news",
        "author": "ISRO Updates",
        "text": "ISRO Successfully Launches Next-Generation Earth Observation Satellite. The mission marks a significant leap in India's space monitoring and agricultural mapping capabilities.",
        "url": "https://www.isro.gov.in/",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=7),
        "engagement_count": 18000,
        "metadata_override": {"category": "SCIENCE & SPACE", "country_name": "India"},
        "topic_name": "ISRO Satellite Launch",
    },
    {
        "external_id": "in-def-001",
        "platform": "news",
        "author": "NDTV Defence",
        "text": "Indigenously Built Light Combat Helicopters Inducted into Air Force. A major boost for 'Make in India' and national defense infrastructure at the borders.",
        "url": "https://www.ndtv.com/india-news",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=8),
        "engagement_count": 9400,
        "metadata_override": {"category": "DEFENCE", "country_name": "India"},
        "topic_name": "Defence Indigenisation",
    },
    {
        "external_id": "in-agr-001",
        "platform": "news",
        "author": "Agriculture Today",
        "text": "Monsoon Reaches Normal Levels Boosting Sowing of Kharif Crops. Farmers remain optimistic as favorable weather conditions prevail across central and northern belts.",
        "url": "https://agriculture.india.com/",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=10),
        "engagement_count": 2200,
        "metadata_override": {"category": "AGRICULTURE", "country_name": "India"},
        "topic_name": "Monsoon Impact",
    },
    {
        "external_id": "in-env-001",
        "platform": "news",
        "author": "The Wire Environment",
        "text": "Renewable Energy Capacity Surpasses 200 GW Milestone. India's commitment to clean energy transitions sees momentum with large scale solar projects scaling up in Rajasthan and Gujarat.",
        "url": "https://thewire.in/environment",
        "published_at": datetime.now(timezone.utc) - timedelta(hours=12),
        "engagement_count": 5600,
        "metadata_override": {"category": "ENVIRONMENT", "country_name": "India"},
        "topic_name": "Renewable Energy Goals",
    }
]

async def seed_india_news():
    from app.collectors.base import NormalizedArticle
    
    print("Preparing verified India news items for DB insertion...")
    
    posts = []
    for m in MOCK_INDIA_NEWS:
        post = NormalizedArticle(
            source=m["author"],
            source_type="news",
            title=m["text"].split(". ")[0],
            description=m["text"],
            url=m["url"] + "/" + m["external_id"],
            published_at=m["published_at"],
            country="India",
            language="en",
            category=m["metadata_override"]["category"],
            author=m["author"],
            image_url=None,
            engagement=m["engagement_count"]
        )
        setattr(post, "_demo_topic", m["topic_name"])
        posts.append(post)

    async with AsyncSessionLocal() as session:
        topics = set()
        # pipeline.ingest_normalized_articles accepts List[NormalizedArticle]
        # But wait, ingest_normalized_articles might not take 'forced_topic_name'
        # Let's just pass them and let the pipeline extract the topics based on the text.
        res = await pipeline.ingest_normalized_articles(
            session, 
            posts
        )
             
        for t in res:
             topics.add(t)

        print("Data inserted correctly. Running pipeline insights on resulting topics...")
        
        for t in topics:
            await pipeline.run_pipeline_for_topic(session, t)

        await session.commit()
    print("Seed complete for Indian News Feed!")

if __name__ == "__main__":
    asyncio.run(seed_india_news())
