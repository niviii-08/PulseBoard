from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.core.database import get_db
from app.api.v1.endpoints.dashboard import get_dashboard

router = APIRouter()


@router.get("/overview", summary="Analytics overview")
async def get_analytics_overview(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return await get_dashboard(db=db, _user=user)


# ─── Brand Cancel Risk & Boycott Threat Intelligence ──────────────────────────

CANCEL_PREDICTIONS_DATA = [
    {
        "id": "cancel_ola_electric",
        "entity": "Ola Electric",
        "category": "EV & Mobility",
        "risk_score": 92,
        "risk_level": "CRITICAL",
        "trajectory": "EXPLODING",
        "boycott_hashtag": "#BoycottOlaElectric",
        "headline_trigger": "Massive service center backlog, customer disputes, and regulatory inspection notices",
        "mention_velocity": "+385% in 24h",
        "primary_platform": "𝕏 & YouTube",
        "platforms_affected": ["𝕏 / Twitter", "YouTube Reviews", "Consumer Court Forum", "Reddit"],
        "breakdown": {
            "hostile_sentiment_pct": 89,
            "neutral_pct": 8,
            "defensive_pct": 3,
        },
        "ground_zero": "Viral videos of parked scooters outside overflowing service centers and public spats between brand leadership and consumer advocates sparked an organic boycott movement.",
        "pr_diagnosis": "High risk of sustained brand erosion, customer churn, and regulatory penalties. Immediate public roadmap with transparent turnaround times and direct grievance resolution required.",
        "search_query": "Ola Electric service center controversy",
    },
    {
        "id": "cancel_byjus",
        "entity": "Byju's",
        "category": "EdTech & Education",
        "risk_score": 95,
        "risk_level": "CRITICAL",
        "trajectory": "EXPLODING",
        "boycott_hashtag": "#ByjusScam",
        "headline_trigger": "Aggressive sales loan defaults, NCLT insolvency proceedings, and delayed employee settlements",
        "mention_velocity": "+240% in 24h",
        "primary_platform": "𝕏 & LinkedIn",
        "platforms_affected": ["LinkedIn", "𝕏 / Twitter", "National Press", "Reddit"],
        "breakdown": {
            "hostile_sentiment_pct": 94,
            "neutral_pct": 4,
            "defensive_pct": 2,
        },
        "ground_zero": "Multiple parental complaints regarding predatory subscription auto-debits combined with high-profile insolvency filings have completely compromised consumer trust.",
        "pr_diagnosis": "Existential brand emergency. Standard marketing is ineffective; formal restructuring and transparent consumer dispute resolution are essential for salvage.",
        "search_query": "Byjus NCLT insolvency complaints",
    },
    {
        "id": "cancel_air_india",
        "entity": "Air India",
        "category": "Aviation & Travel",
        "risk_score": 83,
        "risk_level": "CRITICAL",
        "trajectory": "EXPLODING",
        "boycott_hashtag": "#AirIndiaHorror",
        "headline_trigger": "Repeated premium international cabin hardware failures, 20-hour delays, and missing baggage",
        "mention_velocity": "+195% in 24h",
        "primary_platform": "𝕏 & Instagram",
        "platforms_affected": ["𝕏 / Twitter", "Instagram", "Reddit r/India", "DGCA Desk"],
        "breakdown": {
            "hostile_sentiment_pct": 82,
            "neutral_pct": 12,
            "defensive_pct": 6,
        },
        "ground_zero": "High-profile NRI travelers and corporate passengers posting viral videos of broken business-class seats and unsanitary conditions despite expensive ticket pricing.",
        "pr_diagnosis": "High brand equity damage among high-income business travelers. Proactive re-accommodation, immediate fleet refurbishment communication, and executive apologies needed.",
        "search_query": "Air India cabin failure delay backlash",
    },
    {
        "id": "cancel_zomato",
        "entity": "Zomato & Blinkit",
        "category": "Food & Quick Commerce",
        "risk_score": 72,
        "risk_level": "WATCHLIST",
        "trajectory": "SIMMERING",
        "boycott_hashtag": "#BoycottZomato",
        "headline_trigger": "Platform fee increases to ₹10 during peak hours and rider gig welfare protests",
        "mention_velocity": "+85% in 24h",
        "primary_platform": "𝕏 & Reddit",
        "platforms_affected": ["𝕏 / Twitter", "Reddit r/bangalore", "LinkedIn"],
        "breakdown": {
            "hostile_sentiment_pct": 68,
            "neutral_pct": 22,
            "defensive_pct": 10,
        },
        "ground_zero": "Consumer receipts comparing restaurant menu pricing with inflated cart totals, alongside gig-worker union posts regarding monsoon incentives.",
        "pr_diagnosis": "Medium threat. High utility value cushions boycotts, but persistent fee creep is driving users to ONDC and direct restaurant ordering.",
        "search_query": "Zomato platform fee hike backlash",
    },
    {
        "id": "cancel_zepto",
        "entity": "Zepto",
        "category": "Quick Commerce",
        "risk_score": 64,
        "risk_level": "WATCHLIST",
        "trajectory": "SIMMERING",
        "boycott_hashtag": "#UninstallZepto",
        "headline_trigger": "Hidden 'handling charge', 'cart fee', and rain surcharge stacking at checkout",
        "mention_velocity": "+70% in 24h",
        "primary_platform": "𝕏 & Reddit",
        "platforms_affected": ["Reddit r/mumbai", "𝕏 / Twitter", "Tech Forums"],
        "breakdown": {
            "hostile_sentiment_pct": 62,
            "neutral_pct": 25,
            "defensive_pct": 13,
        },
        "ground_zero": "Reddit threads analyzing dark pattern fee additions appearing right before the UPI payment step.",
        "pr_diagnosis": "Simmering customer resentment. Transparent upfront pricing and clear fee breakdowns will quickly dissipate hostility.",
        "search_query": "Zepto handling fee dark pattern backlash",
    },
    {
        "id": "cancel_infosys",
        "entity": "Infosys Leadership",
        "category": "IT & Corporate",
        "risk_score": 59,
        "risk_level": "WATCHLIST",
        "trajectory": "SIMMERING",
        "boycott_hashtag": "#70HourWorkWeek",
        "headline_trigger": "70-hour work week recommendations amidst entry-level fresher salary stagnation",
        "mention_velocity": "+45% in 24h",
        "primary_platform": "LinkedIn & 𝕏",
        "platforms_affected": ["LinkedIn", "𝕏 / Twitter", "Reddit r/developersIndia"],
        "breakdown": {
            "hostile_sentiment_pct": 58,
            "neutral_pct": 27,
            "defensive_pct": 15,
        },
        "ground_zero": "Comparison posts showing executive compensation growing 500% while fresher salaries remained stagnant at ₹3.5 LPA for 15 years.",
        "pr_diagnosis": "Employer brand risk among engineering college graduates. Focus PR on reskilling, wellness policies, and career mobility initiatives.",
        "search_query": "Infosys 70 hour work week salary backlash",
    },
    {
        "id": "cancel_tata_motors",
        "entity": "Tata Motors EV",
        "category": "Automotive",
        "risk_score": 26,
        "risk_level": "LOW",
        "trajectory": "COOLING_OFF",
        "boycott_hashtag": "#TataNexonEV",
        "headline_trigger": "Infotainment screen freeze and minor BMS calibration bugs reported on social forums",
        "mention_velocity": "-30% in 24h",
        "primary_platform": "Team-BHP & 𝕏",
        "platforms_affected": ["Automotive Forums", "YouTube Tech"],
        "breakdown": {
            "hostile_sentiment_pct": 24,
            "neutral_pct": 36,
            "defensive_pct": 40,
        },
        "ground_zero": "Minor forum reports quickly addressed by Tata service team rolling out over-the-air firmware updates.",
        "pr_diagnosis": "Low risk. High customer goodwill and prompt service engineer responses have contained complaints effectively.",
        "search_query": "Tata Nexon EV software update feedback",
    },
    {
        "id": "cancel_starbucks",
        "entity": "Starbucks India",
        "category": "F&B & Retail",
        "risk_score": 32,
        "risk_level": "LOW",
        "trajectory": "COOLING_OFF",
        "boycott_hashtag": "#StarbucksPrices",
        "headline_trigger": "Online memes about ₹450 cold brew vs local ₹20 filter coffee",
        "mention_velocity": "-15% in 24h",
        "primary_platform": "Instagram & 𝕏",
        "platforms_affected": ["Instagram Reels", "𝕏 Memes"],
        "breakdown": {
            "hostile_sentiment_pct": 28,
            "neutral_pct": 42,
            "defensive_pct": 30,
        },
        "ground_zero": "Lighthearted relatable memes rather than genuine boycott mobilization. Aspirational branding retains core customer footfalls.",
        "pr_diagnosis": "Negligible crisis potential. Narrative is primarily humor-driven. Lean into localization and student combo promotions.",
        "search_query": "Starbucks India coffee price memes",
    },
]


@router.get("/cancel-predictions", summary="Get live brand cancel risk and boycott threat analysis")
async def get_cancel_predictions(risk_level: str = Query(default="ALL")):
    items = CANCEL_PREDICTIONS_DATA
    if risk_level and risk_level.upper() != "ALL":
        items = [i for i in items if i["risk_level"].upper() == risk_level.upper()]
    return {
        "items": items,
        "total_monitored": len(CANCEL_PREDICTIONS_DATA),
        "critical_count": sum(1 for i in CANCEL_PREDICTIONS_DATA if i["risk_level"] == "CRITICAL"),
        "watchlist_count": sum(1 for i in CANCEL_PREDICTIONS_DATA if i["risk_level"] == "WATCHLIST"),
        "low_count": sum(1 for i in CANCEL_PREDICTIONS_DATA if i["risk_level"] == "LOW"),
    }


# ─── Echo Chamber vs Real Cultural Shift Intelligence ─────────────────────────

ECHO_CHAMBERS_DATA = [
    {
        "id": "echo_01",
        "topic": "Star Fandom Box Office Manipulation Claims",
        "category": "Cinema & Fandoms",
        "status": "ECHO_CHAMBER",
        "bubble_score": 94,
        "primary_platform": "𝕏 (Twitter)",
        "headline": "Trending war between rival cinema fan-clubs claiming bot-inflated opening day records",
        "platform_distribution": {
            "x": {"pct": 92, "mentions": "1.4M", "label": "𝕏 / Twitter"},
            "reddit": {"pct": 5, "mentions": "24K", "label": "Reddit"},
            "youtube": {"pct": 2, "mentions": "9K", "label": "YouTube"},
            "news": {"pct": 1, "mentions": "2 Articles", "label": "Mainstream News"},
        },
        "diagnosis": "Isolated within rival star fan-club bot clusters on 𝕏. Zero footprint on public review aggregators, zero organic discussion on YouTube, and ignored by real moviegoers.",
        "recommendation": "100% Algorithmic Echo Chamber. Safe to ignore; do not amplify or issue reactive PR statements.",
        "search_query": "Kollywood Tollywood fake box office twitter war",
    },
    {
        "id": "echo_02",
        "topic": "Ragebait Twitter Poll on Western vs Ethnic Corporate Wear",
        "category": "Workplace Culture",
        "status": "ECHO_CHAMBER",
        "bubble_score": 89,
        "primary_platform": "𝕏 (Twitter)",
        "headline": "Heated 40,000-reply thread claiming MNC dress code policies are 'eroding traditional values'",
        "platform_distribution": {
            "x": {"pct": 89, "mentions": "620K", "label": "𝕏 / Twitter"},
            "linkedin": {"pct": 7, "mentions": "48K", "label": "LinkedIn"},
            "reddit": {"pct": 3, "mentions": "18K", "label": "Reddit"},
            "news": {"pct": 1, "mentions": "1 Op-Ed", "label": "Mainstream News"},
        },
        "diagnosis": "Artificial outrage engineered by engagement-farming blue-tick accounts. In actual workplaces, zero policy disputes or HR complaints have been filed.",
        "recommendation": "Algorithmic Bubble. Engagement farming behavior detected. No action required.",
        "search_query": "Twitter MNC dress code traditional debate",
    },
    {
        "id": "echo_03",
        "topic": "Aura Points & Sigma Male Micro-Trend Hysteria",
        "category": "Internet Slang",
        "status": "ECHO_CHAMBER",
        "bubble_score": 86,
        "primary_platform": "Instagram Reels",
        "headline": "Comment sections flooded with '-10000 aura' debates over minor celebrity awkward moments",
        "platform_distribution": {
            "instagram": {"pct": 86, "mentions": "890K", "label": "Instagram Reels"},
            "youtube": {"pct": 10, "mentions": "110K", "label": "YouTube Shorts"},
            "x": {"pct": 3, "mentions": "30K", "label": "𝕏 / Twitter"},
            "news": {"pct": 1, "mentions": "0 Articles", "label": "Mainstream News"},
        },
        "diagnosis": "Confined to short-form meme consumer demographics under age 20. Zero real-world social impact beyond casual humorous comments.",
        "recommendation": "Harmless Gen-Z meme format. Bubble score high, negative impact zero.",
        "search_query": "Aura points meme trend",
    },
    {
        "id": "echo_04",
        "topic": "Tech Influencer AI Doomsday LinkedIn Thread",
        "category": "Technology & Jobs",
        "status": "ECHO_CHAMBER",
        "bubble_score": 88,
        "primary_platform": "LinkedIn",
        "headline": "Viral influencer post claiming 80% of entry-level coding jobs will be eliminated next month",
        "platform_distribution": {
            "linkedin": {"pct": 85, "mentions": "410K", "label": "LinkedIn"},
            "x": {"pct": 10, "mentions": "52K", "label": "𝕏 / Twitter"},
            "reddit": {"pct": 4, "mentions": "16K", "label": "Reddit"},
            "news": {"pct": 1, "mentions": "0 Articles", "label": "Mainstream News"},
        },
        "diagnosis": "Classic LinkedIn viral engagement-bait designed to sell AI certification courses. Engineering managers and real tech hiring show steady hiring pipelines.",
        "recommendation": "Algorithmic Professional Echo Chamber. Unsubstantiated claims; safe to disregard.",
        "search_query": "AI eliminates coding jobs LinkedIn controversy",
    },
    {
        "id": "real_01",
        "topic": "National Competitive Exam Paper Leaks & Reforms",
        "category": "Education & Governance",
        "status": "REAL_TREND",
        "bubble_score": 19,
        "primary_platform": "Multi-Platform Consensus",
        "headline": "Mass student mobilization across states demanding transparent testing audits and computerized proctoring",
        "platform_distribution": {
            "x": {"pct": 34, "mentions": "2.8M", "label": "𝕏 / Twitter"},
            "youtube": {"pct": 31, "mentions": "2.4M", "label": "YouTube Vlogs & News"},
            "reddit": {"pct": 21, "mentions": "820K", "label": "Reddit (r/JEENEETards)"},
            "news": {"pct": 14, "mentions": "450 Articles", "label": "National Press"},
        },
        "diagnosis": "The topic has completely escaped digital bubbles. Students, coaching centers, national news anchors, and parliamentarians are actively driving discourse across all demographics.",
        "recommendation": "Verified Cultural Consensus. Widespread grassroots mobilization. Immediate institutional transparency and legislative attention required.",
        "search_query": "NTA NEET exam paper leak student protests",
    },
    {
        "id": "real_02",
        "topic": "Bengaluru Water Shortage & Urban Infrastructure Scrutiny",
        "category": "Civic & Urban Living",
        "status": "REAL_TREND",
        "bubble_score": 22,
        "primary_platform": "Multi-Platform Consensus",
        "headline": "Resident welfare associations, tech founders, and apartment societies reporting borewell dry-ups",
        "platform_distribution": {
            "reddit": {"pct": 32, "mentions": "490K", "label": "Reddit (r/bangalore)"},
            "x": {"pct": 30, "mentions": "580K", "label": "𝕏 / Twitter"},
            "news": {"pct": 24, "mentions": "280 Articles", "label": "Mainstream News"},
            "youtube": {"pct": 14, "mentions": "160K", "label": "YouTube Local Ground"},
        },
        "diagnosis": "Direct ground-reality impact affecting daily life, commercial real estate, and municipal planning. Crosses all socioeconomic classes and languages.",
        "recommendation": "Real Civic Emergency. Not an echo chamber. Actionable municipal rainwater harvesting and water tanker tariff caps urgently required.",
        "search_query": "Bangalore water crisis borewell tanker rates",
    },
    {
        "id": "real_03",
        "topic": "Quick-Commerce 10-Min Delivery & Gig Rider Welfare",
        "category": "Economy & Labour",
        "status": "REAL_TREND",
        "bubble_score": 25,
        "primary_platform": "Multi-Platform Consensus",
        "headline": "National debate on whether 10-minute grocery delivery targets incentivize hazardous road driving",
        "platform_distribution": {
            "news": {"pct": 33, "mentions": "310 Articles", "label": "Mainstream News & Editorials"},
            "x": {"pct": 31, "mentions": "620K", "label": "𝕏 / Twitter"},
            "youtube": {"pct": 20, "mentions": "390K", "label": "YouTube Podcasts & Shorts"},
            "reddit": {"pct": 16, "mentions": "280K", "label": "Reddit"},
        },
        "diagnosis": "Cross-generational discourse involving state labour departments, traffic police commissioners, and consumers examining gig-economy ethics.",
        "recommendation": "Genuine Social Shift. Brands must publicly emphasize rider safety over marketing speed targets.",
        "search_query": "10 minute delivery gig worker road safety",
    },
    {
        "id": "real_04",
        "topic": "UPI Global Expansion & Cross-Border Payments",
        "category": "FinTech & Digital India",
        "status": "REAL_TREND",
        "bubble_score": 20,
        "primary_platform": "Multi-Platform Consensus",
        "headline": "Indian travelers and international merchant acceptance growing across UAE, France, Singapore, and Sri Lanka",
        "platform_distribution": {
            "news": {"pct": 36, "mentions": "410 Articles", "label": "Mainstream News"},
            "youtube": {"pct": 28, "mentions": "540K", "label": "YouTube Tech & Finance"},
            "x": {"pct": 22, "mentions": "380K", "label": "𝕏 / Twitter"},
            "reddit": {"pct": 14, "mentions": "210K", "label": "Reddit (r/IndiaInvestments)"},
        },
        "diagnosis": "High positive consensus across NRI communities, fintech analysts, and mainstream business journalism.",
        "recommendation": "Broad Cultural & Economic Landmark. Multi-platform verified adoption.",
        "search_query": "UPI international payments acceptance UAE France",
    },
]


@router.get("/echo-chambers", summary="Get algorithmic echo chamber vs cross-platform trend analysis")
async def get_echo_chambers(status: str = Query(default="ALL")):
    items = ECHO_CHAMBERS_DATA
    if status and status.upper() != "ALL":
        items = [i for i in items if i["status"].upper() == status.upper()]
    return {
        "items": items,
        "total_analyzed": len(ECHO_CHAMBERS_DATA),
        "bubble_count": sum(1 for i in ECHO_CHAMBERS_DATA if i["status"] == "ECHO_CHAMBER"),
        "real_trend_count": sum(1 for i in ECHO_CHAMBERS_DATA if i["status"] == "REAL_TREND"),
    }
