"""
X / Twitter Intelligence & Viral Discourse API
Comprehensive multi-category feeds, trending topics, multi-tweet deep threads,
quote-tweet ratios, curated resource directories, and Gen-Z slang decoder.
"""

from __future__ import annotations

from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import random
import math

router = APIRouter()

# ─── Data Definitions & Curated Pools ──────────────────────────────────────────

CATEGORIES = [
    {"id": "all", "label": "All Feeds", "emoji": "🌐", "desc": "Cross-Timeline Firehose"},
    {"id": "tech", "label": "Tech & AI", "emoji": "🤖", "desc": "Silicon Valley, LLMs & Dev"},
    {"id": "pop_culture", "label": "Pop Culture & Stan", "emoji": "☕", "desc": "Celebrity Tea & Cinema"},
    {"id": "memes", "label": "Memes & Shitposts", "emoji": "💀", "desc": "Unhinged Takes & Brainrot"},
    {"id": "news", "label": "Breaking News & Wire", "emoji": "🚨", "desc": "Global Real-Time Alerts"},
    {"id": "crypto", "label": "Finance & Crypto", "emoji": "📈", "desc": "Alpha, Macro & Markets"},
    {"id": "sports", "label": "Sports & Gaming", "emoji": "⚽", "desc": "IPL, Football & Esports"},
    {"id": "culture", "label": "Culture & India", "emoji": "🛺", "desc": "#PeakBengaluru & Desi X"},
]

AUTHORS_POOL = {
    "tech": [
        {"name": "Paul Graham", "handle": "paulg", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "verified": True, "followers": "1.8M", "bio": "Y Combinator cofounder"},
        {"name": "Andrej Karpathy", "handle": "karpathy", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "verified": True, "followers": "1.2M", "bio": "Building Eureka Labs, ex-Tesla, ex-OpenAI"},
        {"name": "Rowan Cheung", "handle": "rowancheung", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", "verified": True, "followers": "850K", "bio": "Writing The Rundown AI"},
        {"name": "Swyx", "handle": "swyx", "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150", "verified": True, "followers": "210K", "bio": "AI Engineer World & Latent Space"},
        {"name": "Suhail", "handle": "Suhail", "avatar": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150", "verified": True, "followers": "320K", "bio": "Founder of Playground & Mixpanel"},
        {"name": "Guillermo Rauch", "handle": "rauchg", "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150", "verified": True, "followers": "450K", "bio": "CEO of Vercel"},
    ],
    "pop_culture": [
        {"name": "Pop Base", "handle": "PopBase", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", "verified": True, "followers": "2.4M", "bio": "Pop culture news & real-time updates"},
        {"name": "Film Updates", "handle": "FilmUpdates", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "verified": True, "followers": "1.9M", "bio": "Cinema scoops, trailers & box office"},
        {"name": "Stan Ground Zero", "handle": "stan_tea_central", "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150", "verified": False, "followers": "420K", "bio": "Chronically online pop commentary"},
        {"name": "DiscussingFilm", "handle": "DiscussingFilm", "avatar": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150", "verified": True, "followers": "3.1M", "bio": "Leading pop culture & cinema media"},
    ],
    "memes": [
        {"name": "shitpost gateway", "handle": "unhinged_feed", "avatar": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150", "verified": False, "followers": "1.1M", "bio": "I post what everyone is secretly thinking"},
        {"name": "No Context Internet", "handle": "nocontext_net", "avatar": "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150", "verified": True, "followers": "2.8M", "bio": "Unedited moments from the timeline"},
        {"name": "Certified Brainrot", "handle": "brainrot_archive", "avatar": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150", "verified": False, "followers": "680K", "bio": "Documenting timeline degeneration daily"},
        {"name": "Wholesome Memes", "handle": "wholesome_m", "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", "verified": True, "followers": "1.5M", "bio": "Restoring your faith in humanity"},
    ],
    "news": [
        {"name": "BNO News Live", "handle": "BNONews", "avatar": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150", "verified": True, "followers": "1.4M", "bio": "Fast, verified breaking news reports"},
        {"name": "The Spectator Index", "handle": "spectatorindex", "avatar": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150", "verified": True, "followers": "3.2M", "bio": "Global politics, economy, science & stats"},
        {"name": "Disclose.tv", "handle": "disclosetv", "avatar": "https://images.unsplash.com/photo-1572945281869-826b8e485e07?w=150", "verified": True, "followers": "1.1M", "bio": "Observing geopolitical developments"},
        {"name": "World Affairs Wire", "handle": "global_wire", "avatar": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150", "verified": True, "followers": "780K", "bio": "Real-time geopolitical flashpoints"},
    ],
    "crypto": [
        {"name": "Cobie", "handle": "cobie", "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150", "verified": True, "followers": "750K", "bio": "Retired crypto commentator & podcast host"},
        {"name": "Balaji", "handle": "balajis", "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", "verified": True, "followers": "1.0M", "bio": "The Network State, ex-CTO Coinbase"},
        {"name": "Unusual Whales", "handle": "unusual_whales", "avatar": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=150", "verified": True, "followers": "1.8M", "bio": "Tracking congressional trades & market flow"},
        {"name": "Tier10k", "handle": "tier10k", "avatar": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150", "verified": True, "followers": "490K", "bio": "Fastest market headlines on X"},
    ],
    "sports": [
        {"name": "Fabrizio Romano", "handle": "FabrizioRomano", "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", "verified": True, "followers": "22.5M", "bio": "Here we go! Football transfer insider"},
        {"name": "Cricbuzz Wire", "handle": "cricbuzz_x", "avatar": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=150", "verified": True, "followers": "6.2M", "bio": "Live cricket coverage, IPL stats & scoops"},
        {"name": "Dexerto Gaming", "handle": "Dexerto", "avatar": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150", "verified": True, "followers": "1.9M", "bio": "Esports, gaming leaks & creator culture"},
        {"name": "B/R Football", "handle": "brfootball", "avatar": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150", "verified": True, "followers": "4.8M", "bio": "Champions League, World Cup & viral edits"},
    ],
    "culture": [
        {"name": "Peak Bengaluru", "handle": "peakbengaluru", "avatar": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=150", "verified": True, "followers": "410K", "bio": "Chronicling Bangalore's startup tech absurdity"},
        {"name": "Gabbbar", "handle": "GabbbarSingh", "avatar": "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150", "verified": True, "followers": "1.4M", "bio": "Humor, advertising observations & cricket"},
        {"name": "Sagarcasm", "handle": "sagarcasm", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "verified": True, "followers": "1.1M", "bio": "Sarcastic takes on trending Indian culture"},
        {"name": "Chennai Confessions", "handle": "chennai_times_x", "avatar": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=150", "verified": False, "followers": "180K", "bio": "Kollywood tea, Marina breeze & filter coffee takes"},
    ],
}

# ─── Master Tweet Templates by Category ───────────────────────────────────────

CATEGORY_TWEETS = {
    "tech": [
        {
            "text": "The gap between people who treat AI as a glorified autocomplete vs people building multi-agent autonomous workflows with recursive tool-calling is now wider than the gap between programmers and non-programmers in 2010.",
            "hashtags": ["#AI", "#SoftwareEngineering", "#TechTrends"],
            "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
            "likes": 24500, "retweets": 4120, "quotes": 890, "replies": 730,
            "sentiment": {"label": "Bullish", "score": 0.72}
        },
        {
            "text": "Hot take: 90% of meetings in tech could have been a 30-second Loom, which itself could have been a 2-line slack message, which itself could have simply never happened with zero business consequence.",
            "hashtags": ["#SiliconValley", "#RemoteWork", "#Productivity"],
            "image": None,
            "likes": 58200, "retweets": 9340, "quotes": 1420, "replies": 1280,
            "sentiment": {"label": "Spicy", "score": -0.28}
        },
        {
            "text": "Open-source local LLMs running with zero quantization on consumer Macbooks with unified memory is genuinely one of the biggest quiet revolutions in software of this decade.",
            "hashtags": ["#OpenSource", "#MachineLearning", "#Hardware"],
            "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
            "likes": 19400, "retweets": 3200, "quotes": 410, "replies": 390,
            "sentiment": {"label": "Bullish", "score": 0.85}
        },
        {
            "text": "Why do engineers rewrite entire production systems in Rust? Not because of memory safety, but because the compiler error messages give you that sweet feeling of validation you never received in school.",
            "hashtags": ["#RustLang", "#DevHumor"],
            "image": None,
            "likes": 31200, "retweets": 4890, "quotes": 760, "replies": 580,
            "sentiment": {"label": "Positive", "score": 0.45}
        },
        {
            "text": "We just benchmarked our new inference cluster: latency dropped by 64% while cuting per-token costs by half. Clean code wins, but optimized memory layouts win harder.",
            "hashtags": ["#Inference", "#HighPerformance", "#CloudCompute"],
            "image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800",
            "likes": 12800, "retweets": 1840, "quotes": 230, "replies": 310,
            "sentiment": {"label": "Bullish", "score": 0.91}
        },
        {
            "text": "Stop adding 'AI-Powered' to your B2B SaaS landing page like it's a seasoning. Tell users what problem you actually solve in 5 words or less.",
            "hashtags": ["#Startups", "#SaaS", "#ProductDesign"],
            "image": None,
            "likes": 42100, "retweets": 6500, "quotes": 1150, "replies": 940,
            "sentiment": {"label": "Spicy", "score": -0.35}
        },
    ],
    "pop_culture": [
        {
            "text": "The way this entire film was marketed purely through 15-second viral TikTok sounds and unhinged Twitter fan wars needs to be studied by Harvard Business School immediately.",
            "hashtags": ["#Cinema", "#BoxOffice", "#PopCulture"],
            "image": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
            "likes": 84200, "retweets": 12400, "quotes": 3100, "replies": 1820,
            "sentiment": {"label": "Bullish", "score": 0.65}
        },
        {
            "text": "Stan Twitter fighting for 72 straight hours over who had the best album roll-out while both artists are literally laughing on FaceTime together on a yacht in Amalfi.",
            "hashtags": ["#StanTwitter", "#MusicNews", "#Grammys"],
            "image": None,
            "likes": 98100, "retweets": 16700, "quotes": 4200, "replies": 2100,
            "sentiment": {"label": "Spicy", "score": -0.15}
        },
        {
            "text": "A live orchestra playing the soundtrack of Interstellar inside an empty cathedral. The audio compression on this app cannot do this justice, I am weeping.",
            "hashtags": ["#Soundtracks", "#HansZimmer", "#Masterpiece"],
            "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
            "likes": 142000, "retweets": 24900, "quotes": 5100, "replies": 2840,
            "sentiment": {"label": "Positive", "score": 0.94}
        },
        {
            "text": "The Met Gala theme was right there and 80% of the men still showed up wearing the exact same black tuxedo rented from Men's Wearhouse. Jail.",
            "hashtags": ["#MetGala", "#FashionTwitter"],
            "image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800",
            "likes": 112000, "retweets": 18400, "quotes": 6200, "replies": 3400,
            "sentiment": {"label": "Spicy", "score": -0.42}
        },
    ],
    "memes": [
        {
            "text": "bro thought he was the main character until the quote tweets started rolling in 💀💀💀 not a single positive reply in 14 hours this is generational embarrassment",
            "hashtags": ["#Cooked", "#Ratio", "#Timeline"],
            "image": None,
            "likes": 134000, "retweets": 21000, "quotes": 8900, "replies": 4100,
            "sentiment": {"label": "Spicy", "score": -0.65}
        },
        {
            "text": "My bank account looking at me opening Zomato for the 4th time today after swearing I was going to meal-prep and achieve financial discipline this month.",
            "hashtags": ["#Adulting", "#Foodie", "#Relatable"],
            "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
            "likes": 76500, "retweets": 11200, "quotes": 2400, "replies": 1540,
            "sentiment": {"label": "Neutral", "score": 0.05}
        },
        {
            "text": "new reaction image just dropped save this immediately before the corporate brand accounts find it and make it cringe in 48 hours",
            "hashtags": ["#MemeArchive", "#ReactionImage"],
            "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
            "likes": 92400, "retweets": 14500, "quotes": 3100, "replies": 1890,
            "sentiment": {"label": "Positive", "score": 0.58}
        },
        {
            "text": "we really got corporate AI avatars doing apology videos before GTA 6 I want off this timeline fr 😭",
            "hashtags": ["#BlackMirror", "#GTA6", "#ChronicallyOnline"],
            "image": None,
            "likes": 165000, "retweets": 28900, "quotes": 7300, "replies": 3200,
            "sentiment": {"label": "Spicy", "score": -0.32}
        },
    ],
    "news": [
        {
            "text": "BREAKING: Global shipping corridors report major maritime rerouting following fresh naval security advisories. Freight insurance premiums surge 38% across European and Asian lanes.",
            "hashtags": ["#BreakingNews", "#GlobalTrade", "#SupplyChain"],
            "image": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
            "likes": 18200, "retweets": 7400, "quotes": 1890, "replies": 940,
            "sentiment": {"label": "Spicy", "score": -0.52}
        },
        {
            "text": "JUST IN: International energy consortium completes historic cross-border green hydrogen pipeline connection, establishing zero-carbon electricity transmission between Scandinavia and Central Europe.",
            "hashtags": ["#CleanEnergy", "#Infrastructure", "#WorldNews"],
            "image": "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800",
            "likes": 34100, "retweets": 8900, "quotes": 1200, "replies": 810,
            "sentiment": {"label": "Bullish", "score": 0.88}
        },
        {
            "text": "UPDATE: Cybersecurity watchdogs issue emergency patch notice for zero-day vulnerability affecting enterprise DNS infrastructure. Over 40,000 corporate gateways exposed.",
            "hashtags": ["#CyberSecurity", "#Infosec", "#Alert"],
            "image": None,
            "likes": 15400, "retweets": 9200, "quotes": 1650, "replies": 620,
            "sentiment": {"label": "Spicy", "score": -0.68}
        },
    ],
    "crypto": [
        {
            "text": "The macro divergence between central bank balance sheet expansion and fixed-supply scarce digital assets is playing out precisely as projected in 2020. The math does not care about your sentiment.",
            "hashtags": ["#Bitcoin", "#Macro", "#Markets"],
            "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
            "likes": 29800, "retweets": 5200, "quotes": 1100, "replies": 1400,
            "sentiment": {"label": "Bullish", "score": 0.82}
        },
        {
            "text": "Remember: when the timeline is euphoria, take profit. When the timeline is declaring crypto dead for the 412th time, that is when generational wealth is quietly accumulated.",
            "hashtags": ["#CryptoTrading", "#Alpha", "#Ethereum"],
            "image": None,
            "likes": 44300, "retweets": 7800, "quotes": 1450, "replies": 1200,
            "sentiment": {"label": "Positive", "score": 0.55}
        },
        {
            "text": "Treasury yield curve inversion just clocked its 24th month. Market pricing in 3 rate cuts before year end while labor data remains sticky. Buckle up for Q4 volatility.",
            "hashtags": ["#Economy", "#Fed", "#WallStreet"],
            "image": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
            "likes": 16900, "retweets": 3400, "quotes": 890, "replies": 650,
            "sentiment": {"label": "Neutral", "score": -0.08}
        },
    ],
    "sports": [
        {
            "text": "HERE WE GO: 19-year-old wonderkid completes record €120M transfer package. 5-year contract agreed, medical tests booked in London for tomorrow morning. Historic signing.",
            "hashtags": ["#Transfers", "#PremierLeague", "#Football"],
            "image": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800",
            "likes": 88400, "retweets": 14200, "quotes": 3800, "replies": 2900,
            "sentiment": {"label": "Bullish", "score": 0.86}
        },
        {
            "text": "Rinku Singh smacking 3 consecutive sixes in the 20th over when 18 were required from 4 balls. Cricket is not a sport, it is a clinical cardiology test.",
            "hashtags": ["#IPL", "#CricketTwitter", "#Clutch"],
            "image": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",
            "likes": 121000, "retweets": 23400, "quotes": 5100, "replies": 3400,
            "sentiment": {"label": "Positive", "score": 0.95}
        },
        {
            "text": "The defense on that final Champions League counter-attack was pure footballing poetry. Slide tackle timed to the millimeter in the 94th minute.",
            "hashtags": ["#UCL", "#FootballMemes"],
            "image": None,
            "likes": 54200, "retweets": 7900, "quotes": 1400, "replies": 1100,
            "sentiment": {"label": "Bullish", "score": 0.78}
        },
    ],
    "culture": [
        {
            "text": "Auto anna in Indiranagar just handed me his QR code laminated on the back of an iPad Pro running a custom Flutter billing app. Peak Bengaluru has reached terminal velocity.",
            "hashtags": ["#PeakBengaluru", "#BangaloreTech", "#Indiranagar"],
            "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800",
            "likes": 64200, "retweets": 9800, "quotes": 2100, "replies": 1400,
            "sentiment": {"label": "Positive", "score": 0.74}
        },
        {
            "text": "Chennai Marina beach 6:00 AM: Filter coffee steam rising, uncle jogging in formal trousers and Bata sandals, fishermen pulling nets, and 2 IT guys debugging a Jenkins pipeline on a park bench.",
            "hashtags": ["#NammaChennai", "#MarinaBeach", "#FilterCoffee"],
            "image": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800",
            "likes": 48900, "retweets": 7300, "quotes": 1600, "replies": 1150,
            "sentiment": {"label": "Positive", "score": 0.89}
        },
        {
            "text": "Mumbai local train at Dadar 8:50 AM is not public transit. It is an annual company offsite where 400 strangers coordinate breath cycles to let one man exit with his tiffin box intact.",
            "hashtags": ["#MumbaiLocal", "#Dadar", "#AamchiMumbai"],
            "image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800",
            "likes": 73400, "retweets": 11800, "quotes": 2900, "replies": 1850,
            "sentiment": {"label": "Positive", "score": 0.62}
        },
        {
            "text": "Every North Indian wedding reception has that one group of uncles who migrate to the tandoori counter like birds seeking warm climate in winter.",
            "hashtags": ["#DesiWeddings", "#ShaadiSeason", "#DelhiTwitter"],
            "image": None,
            "likes": 52100, "retweets": 7400, "quotes": 1800, "replies": 1250,
            "sentiment": {"label": "Positive", "score": 0.70}
        },
    ],
}

# ─── Multi-Tweet Threads Directory ────────────────────────────────────────────

LONG_FORM_THREADS = [
    {
        "id": "thread-ai-reasoning",
        "title": "How Modern LLMs Actually Reason: An Engineering Teardown [1/8]",
        "category": "tech",
        "read_time": "4 min read",
        "bookmarks": 18400,
        "author": AUTHORS_POOL["tech"][1],
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
        "tweets": [
            "Most people still think 'reasoning models' just have more parameters. That is fundamentally incorrect. The breakthrough lies in chain-of-thought reinforcement learning over long generation trajectories. Here is the architectural teardown 🧵👇 [1/8]",
            "When a model outputs tokens sequentially, each token becomes conditioning context for the next token. By training specifically on reward-guided verification steps, the model learns to backtrack when a logic branch collapses. [2/8]",
            "Think of it like Monte Carlo Tree Search, but instead of evaluating chess board states, the search tree is composed of natural language arguments and formal code assertions. [3/8]",
            "The trade-off: test-time compute. We are moving from 'fixed-cost per query' to 'elastic inference'. A math proof can take 30 seconds of internal scratchpad exploration before emitting the final answer. [4/8]",
            "What does this mean for developers? You don't prompt with 'think step by step' anymore. You design verification sandboxes and evaluation harnesses that let models self-correct in closed feedback loops. [5/8]",
            "The next frontier is tool-use within the scratchpad: running Python code, querying databases, and parsing JSON schemas mid-thought. [6/8]",
            "If your product architecture assumes latency must always be <200ms, you are optimizing for the wrong paradigm. Deep reasoning requires cognitive budget. [7/8]",
            "Full open-source benchmark scripts and reproducible test notebooks linked below. Save this thread and follow for more systems engineering breakdowns. [8/8]"
        ]
    },
    {
        "id": "thread-startup-collapse",
        "title": "Inside the Sudden Collapse & 48h Revival of a Viral AI Startup [1/7]",
        "category": "tech",
        "read_time": "3 min read",
        "bookmarks": 14200,
        "author": AUTHORS_POOL["tech"][0],
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=7)).isoformat(),
        "tweets": [
            "48 hours ago, a startup with $12M ARR woke up to find their entire cloud infrastructure terminated due to an automated billing fraud flag. What followed is the wildest founder sprint of 2026. 🧵 [1/7]",
            "Day 1, 04:00 UTC: Automated sentinel triggers false positive. 60 enterprise clients get 502 Bad Gateway. The support desk receives 1,200 urgent tickets in 20 minutes. [2/7]",
            "Instead of waiting for an enterprise support ticket to bounce through 4 tiers of offshore support, the CEO took to Twitter with exact timestamps and system architecture logs. [3/7]",
            "Within 90 minutes, the tweet reached 4.2M views. Engineering VPs from competing cloud providers were in DMs offering free migration credits and dedicated cluster instances. [4/7]",
            "By hour 18, their 5 engineers rebuilt the database replication layer on an independent bare-metal provider, zero data loss, fully restored. [5/7]",
            "The takeaway: opacity kills SaaS companies during crises. Radical transparency and public technical honesty turn a catastrophic outage into an overwhelming brand loyalty moat. [6/7]",
            "Never depend on a single vendor's automated algorithmic trust-and-safety engine for your core livelihood. Multi-cloud failover is no longer an enterprise luxury. [7/7]"
        ]
    },
    {
        "id": "thread-meme-evolution",
        "title": "How One Unhinged Meme Hijacked Global Fortune 500 Marketing in 48h [1/6]",
        "category": "pop_culture",
        "read_time": "3 min read",
        "bookmarks": 21900,
        "author": AUTHORS_POOL["pop_culture"][0],
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
        "tweets": [
            "A high school kid in Ohio posted a 3-second pixelated audio clip on a Tuesday night. By Thursday afternoon, Nike, Duolingo, Ryanair, and the official UN account were all posting variations. Here is how viral mechanics work on X 🧵 [1/6]",
            "Phase 1: The Timeline Spark. Early adopters and meme curators quote-tweet the original with inside-joke remixes. Engagement ratio exceeds 40% quote-to-like. [2/6]",
            "Phase 2: Stan Twitter crossover. Fandom accounts adapt the audio format to celebrate their favorite pop icons and cinema releases. Volume jumps from 10k to 400k posts. [3/6]",
            "Phase 3: The 22-year-old Brand Social Media Intern. The moment a junior community manager posts an unhinged adaptation and it hits 100k likes, executive approval barriers evaporate. [4/6]",
            "Phase 4: The Cringe Cliff. When legacy banking institutions start posting the meme on LinkedIn, the format officially dies on Twitter. Total lifecycle: 72 hours. [5/6]",
            "Speed to culture is the only marketing advantage left. If your creative review process takes more than 4 hours, you've already missed the trend wave. [6/6]"
        ]
    },
    {
        "id": "thread-peak-bengaluru",
        "title": "10 Things You Only Experience as an Engineer in HSR Layout, Bengaluru [1/10]",
        "category": "culture",
        "read_time": "5 min read",
        "bookmarks": 31000,
        "author": AUTHORS_POOL["culture"][0],
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=16)).isoformat(),
        "tweets": [
            "If Silicon Valley is the brain of global tech, HSR Layout Sector 4 is the hyper-caffeinated nervous system. A thread on surviving India's startup ground zero 🧵🛺 [1/10]",
            "1. You cannot walk 50 meters on 27th Main without overhearing two people debating whether to migrate from PostgreSQL to ClickHouse while eating Podi Dosa. [2/10]",
            "2. Your landlord asks for your GitHub profile and LinkedIn before discussing rent. If you have fewer than 200 stars on open-source, your security deposit increases by ₹50,000. [3/10]",
            "3. The chai tapri guy knows which seed-stage startup raised from Peak XV before TechCrunch does because the founders were pacing outside his stall on the phone. [4/10]",
            "4. Silk Board junction is not a traffic intersection. It is a spiritual retreat where you reflect on your life choices while stationary in an auto for 45 minutes. [5/10]",
            "5. Coworking spaces have more acoustic podcast booths than actual desks. Everyone is either recording an AI episode or pitching a YC founder. [6/10]",
            "6. It rains for 8 minutes and 4,000 delivery riders appear like magical rain guardians to bring hot biryani to your doorstep. [7/10]",
            "7. Every gym conversation starts with bench press and ends with someone giving you feedback on your Dockerfile configuration. [8/10]",
            "8. The sheer density of ambitious, relentless 22-year-olds working on high-conviction ideas is completely unmatched anywhere else in Asia. [9/10]",
            "Never change, Bengaluru. You are chaotic, broken, brilliant, and completely irreplaceable. 🇮🇳❤️ [10/10]"
        ]
    }
]

# ─── Viral Hot Takes & Quote-Tweet Ratios ──────────────────────────────────────

VIRAL_RATIOS = [
    {
        "id": "ratio-1",
        "author": {"name": "Hustle Mindset Bro", "handle": "founder_grind_99", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "verified": True},
        "tweet": "If you are sleeping more than 4 hours a night in your 20s, you simply do not want success badly enough. Sleep is a luxury for people who have already arrived.",
        "likes": 840,
        "quotes": 14200,
        "ratio_multiple": "16.9x Ratio",
        "verdict": "Demolished by Quote Tweets",
        "category": "tech",
        "counter_tweets": [
            {"author": "@karpathy", "text": "Sleep is literally when memory consolidation and neural plasticity happen. Depriving yourself of sleep to write worse code is like removing your car's oil to save weight."},
            {"author": "@unhinged_feed", "text": "bro is hallucinating from chronic sleep deprivation and tweeting his hallucinations to 2,000 bots 😭💀"},
            {"author": "@dr_matthew", "text": "As a neuroscientist: this is the fastest way to permanently impair executive function, immune health, and cardiovascular longevity. Please go to bed."}
        ]
    },
    {
        "id": "ratio-2",
        "author": {"name": "Corporate PR Executive", "handle": "brand_purist", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", "verified": True},
        "tweet": "We are thrilled to announce that beginning next Monday, our team will be mandating 5 days in office for optimal synergy, organic hallway serendipity, and company culture.",
        "likes": 1200,
        "quotes": 18900,
        "ratio_multiple": "15.7x Ratio",
        "verdict": "Timeline in Shambles",
        "category": "tech",
        "counter_tweets": [
            {"author": "@swyx", "text": "'Organic hallway serendipity' translates to 'we signed a 10-year commercial lease in 2019 and our board won't write it off' fr"},
            {"author": "@remote_advocate", "text": "Best of luck to your competitors who are currently drafting recruitment offers for your top 20% senior engineers."},
            {"author": "@brainrot_archive", "text": "the only serendipity happening in that hallway is 40 people queuing for the single working Keurig machine 💀"}
        ]
    },
    {
        "id": "ratio-3",
        "author": {"name": "Film Critic Elite", "handle": "cinema_snob_x", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "verified": False},
        "tweet": "Commercial cinema is dead. Any movie with action scenes, catchy music, and crowd-pleasing moments is not art, it is sensory junk food for the uneducated masses.",
        "likes": 2100,
        "quotes": 22400,
        "ratio_multiple": "10.6x Ratio",
        "verdict": "Certified Ratio",
        "category": "pop_culture",
        "counter_tweets": [
            {"author": "@PopBase", "text": "Audiences cheering together in a dark theater is literally the purest form of communal human storytelling since cave fires."},
            {"author": "@FilmUpdates", "text": "Shakespeare literally wrote dick jokes and ghost fight scenes to entertain rowdy groundlings in 1600. Relax."},
            {"author": "@kollywood_tea", "text": "Bro watched one 4-hour silent black-and-white Hungarian documentary about a turnip and thinks he is Aristotle 😭"}
        ]
    }
]

# ─── Curated Twitter Resources & Accounts Directory ───────────────────────────

CURATED_RESOURCES = [
    {
        "category": "Tech & AI Pioneers",
        "items": [
            {"name": "Andrej Karpathy", "handle": "@karpathy", "followers": "1.2M", "desc": "Eureka Labs, deep learning education, neural net insights", "verified": True, "url": "https://x.com/karpathy", "tags": ["AI", "Education", "Deep Learning"]},
            {"name": "Paul Graham", "handle": "@paulg", "followers": "1.8M", "desc": "Y Combinator essays, startup philosophy & founder advice", "verified": True, "url": "https://x.com/paulg", "tags": ["Startups", "Venture", "Essays"]},
            {"name": "Yann LeCun", "handle": "@ylecun", "followers": "890K", "desc": "Chief AI Scientist at Meta, Turing Award winner, open source advocate", "verified": True, "url": "https://x.com/ylecun", "tags": ["Open Source", "Meta", "AI Research"]},
            {"name": "Rowan Cheung", "handle": "@rowancheung", "followers": "850K", "desc": "The Rundown AI founder, daily curated AI breakthroughs", "verified": True, "url": "https://x.com/rowancheung", "tags": ["AI News", "Curated", "Tools"]},
            {"name": "Swyx", "handle": "@swyx", "followers": "210K", "desc": "AI Engineering podcast, Latent Space community, ecosystem trends", "verified": True, "url": "https://x.com/swyx", "tags": ["AI Engineer", "Podcast", "Agents"]},
            {"name": "Guillermo Rauch", "handle": "@rauchg", "followers": "450K", "desc": "CEO of Vercel, Next.js, web performance, frontend infrastructure", "verified": True, "url": "https://x.com/rauchg", "tags": ["Vercel", "Web", "Next.js"]},
        ]
    },
    {
        "category": "Breaking News & Global OSINT",
        "items": [
            {"name": "BNO News Live", "handle": "@BNONews", "followers": "1.4M", "desc": "Lightning fast, verified breaking alerts with zero sensationalism", "verified": True, "url": "https://x.com/BNONews", "tags": ["Breaking", "Real-Time", "Verified"]},
            {"name": "The Spectator Index", "handle": "@spectatorindex", "followers": "3.2M", "desc": "Global economic indicators, world politics, health & demographic stats", "verified": True, "url": "https://x.com/spectatorindex", "tags": ["Macro", "Geopolitics", "Stats"]},
            {"name": "Disclose.tv", "handle": "@disclosetv", "followers": "1.1M", "desc": "Fast-moving geopolitical reports, press conferences, and alerts", "verified": True, "url": "https://x.com/disclosetv", "tags": ["OSINT", "World News"]},
            {"name": "Reuters Live Wire", "handle": "@Reuters", "followers": "25.8M", "desc": "Global news organization delivering trusted international coverage", "verified": True, "url": "https://x.com/Reuters", "tags": ["Wire", "International", "Journalism"]},
        ]
    },
    {
        "category": "Meme & Internet Culture Royalty",
        "items": [
            {"name": "Pop Base", "handle": "@PopBase", "followers": "2.4M", "desc": "The beating heart of modern internet and celebrity culture updates", "verified": True, "url": "https://x.com/PopBase", "tags": ["Pop Culture", "Entertainment"]},
            {"name": "Know Your Meme", "handle": "@knowyourmeme", "followers": "840K", "desc": "Official historians of internet virality, templates, and lore", "verified": True, "url": "https://x.com/knowyourmeme", "tags": ["Meme History", "Origins", "Lore"]},
            {"name": "No Context Internet", "handle": "@nocontext_net", "followers": "2.8M", "desc": "Pure timeline screenshots highlighting daily digital comedy", "verified": True, "url": "https://x.com/nocontext_net", "tags": ["Humor", "No Context"]},
            {"name": "Wholesome Memes", "handle": "@wholesome_m", "followers": "1.5M", "desc": "Uplifting community content to reset your timeline sentiment", "verified": True, "url": "https://x.com/wholesome_m", "tags": ["Wholesome", "Feel Good"]},
        ]
    },
    {
        "category": "Finance, Macro & Crypto Alpha",
        "items": [
            {"name": "Cobie", "handle": "@cobie", "followers": "750K", "desc": "Candid crypto commentary, liquidity analysis, industry retrospectives", "verified": True, "url": "https://x.com/cobie", "tags": ["Crypto", "Podcast", "Culture"]},
            {"name": "Unusual Whales", "handle": "@unusual_whales", "followers": "1.8M", "desc": "Options flow, congressional portfolio tracking, market transparency", "verified": True, "url": "https://x.com/unusual_whales", "tags": ["Options", "Congress", "Trading"]},
            {"name": "Balaji Srinivasan", "handle": "@balajis", "followers": "1.0M", "desc": "The Network State, technological sovereignty, global macro trends", "verified": True, "url": "https://x.com/balajis", "tags": ["Network State", "Macro", "Tech"]},
            {"name": "Tier10k", "handle": "@tier10k", "followers": "490K", "desc": "Algorithmic-speed financial headlines and regulatory filings", "verified": True, "url": "https://x.com/tier10k", "tags": ["Headlines", "Fast", "Sec Filings"]},
        ]
    },
    {
        "category": "Indian Discourse & Cultural Wires",
        "items": [
            {"name": "Peak Bengaluru", "handle": "@peakbengaluru", "followers": "410K", "desc": "Bangalore startup ecosystem quirks, auto anecdotes & tech irony", "verified": True, "url": "https://x.com/peakbengaluru", "tags": ["Bangalore", "Startups", "Culture"]},
            {"name": "Gabbbar", "handle": "@GabbbarSingh", "followers": "1.4M", "desc": "Witty social commentary on cricket, Indian advertising & daily life", "verified": True, "url": "https://x.com/GabbbarSingh", "tags": ["Desi Humor", "Cricket", "Advertising"]},
            {"name": "Sagarcasm", "handle": "@sagarcasm", "followers": "1.1M", "desc": "Relatable Indian middle-class humor, cinema memes & nostalgia", "verified": True, "url": "https://x.com/sagarcasm", "tags": ["Satire", "Relatable", "Nostalgia"]},
        ]
    },
    {
        "category": "Public RSS & Nitter Syndication Feeds",
        "items": [
            {"name": "Nitter Poast Instance", "handle": "poast.org", "followers": "Public", "desc": "Decentralized Twitter syndication mirror for public RSS feeds", "verified": False, "url": "https://nitter.poast.org", "tags": ["RSS", "Syndication", "Open"]},
            {"name": "Nitter PrivacyDev", "handle": "privacydev.net", "followers": "Public", "desc": "High-throughput European proxy endpoint for live Twitter search feeds", "verified": False, "url": "https://nitter.privacydev.net", "tags": ["Proxy", "RSS", "Search"]},
            {"name": "Nitter LucaBrunox", "handle": "lucabrunox.com", "followers": "Public", "desc": "Clean JSON and RSS syndication gateway for trend scraping", "verified": False, "url": "https://nitter.lucabrunox.com", "tags": ["Mirror", "Live RSS"]},
        ]
    }
]

# ─── Gen-Z Slang & Discourse Decoder ──────────────────────────────────────────

SLANG_DICTIONARY = [
    {"term": "Cooked", "status": "Viral", "momentum": 98, "meaning": "Completely done for, defeated, or in severe trouble. When quote tweets destroy a post.", "example": "The quote tweets are absolutely cooking them right now 💀"},
    {"term": "Rent Free", "status": "Evergreen", "momentum": 88, "meaning": "Occupying someone's thoughts incessantly without them admitting it.", "example": "Living in their head rent free and it's not even close fr."},
    {"term": "Aura Points", "status": "High Velocity", "momentum": 95, "meaning": "A fictional currency of cool, charisma, and dignity gained or lost by actions.", "example": "Tripped on the subway stairs: -10,000 aura points instantly."},
    {"term": "Ate and Left No Crumbs", "status": "High Velocity", "momentum": 92, "meaning": "Executed a performance, argument, or outfit with flawless perfection.", "example": "She really ate and left NO crumbs, generational performance."},
    {"term": "Generational Ratio", "status": "Peak", "momentum": 94, "meaning": "When replies and quote tweets outnumber likes by 5x+, signifying timeline rejection.", "example": "12k quote tweets to 300 likes... generational ratio unlocked."},
    {"term": "Chronically Online", "status": "Evergreen", "momentum": 86, "meaning": "Possessing hyper-awareness of internet memes and drama that no normal person knows.", "example": "Only chronically online people understand why this 3-word tweet is funny."},
    {"term": "Unhinged", "status": "Evergreen", "momentum": 90, "meaning": "Wildly eccentric, boundary-pushing, chaotic, or entertaining.", "example": "Corporate brand accounts are becoming completely unhinged and I love it."},
    {"term": "Main Character Syndrome", "status": "High Velocity", "momentum": 85, "meaning": "Behaving as if the entire world revolves around your dramatic narrative.", "example": "Bro walked into the coffee shop with severe main character syndrome today."}
]

# ─── Trending Topics & Hashtags Pool ──────────────────────────────────────────

TRENDING_HASHTAGS = [
    {"rank": 1, "hashtag": "#GPT5", "category": "Tech & AI", "volume": "384.2K Posts", "velocity": "+142% past 2h", "sentiment": {"label": "Bullish", "score": 0.88}, "summary": "Speculation and leaked benchmark charts trigger viral developer debates", "top_quote": "If this benchmark is verified, entire software pipelines change next month."},
    {"rank": 2, "hashtag": "#PeakBengaluru", "category": "Culture & India", "volume": "145.8K Posts", "volume_num": 145800, "velocity": "+78% past 1h", "sentiment": {"label": "Positive", "score": 0.74}, "summary": "Auto driver with custom Flutter terminal and landlord coding interviews", "top_quote": "HSR Layout Sector 4 is the most caffeinated square kilometer on earth."},
    {"rank": 3, "hashtag": "#MetGala2026", "category": "Pop Culture", "volume": "520.1K Posts", "volume_num": 520100, "velocity": "+210% past 3h", "sentiment": {"label": "Divided", "score": 0.12}, "summary": "Red carpet arrivals, avant-garde couture breakdowns & tuxedo roasts", "top_quote": "The contrast between the theme and the actual outfits is magnificent comedy."},
    {"rank": 4, "hashtag": "#ChampionsLeague", "category": "Sports", "volume": "412.0K Posts", "volume_num": 412000, "velocity": "+95% past 1h", "sentiment": {"label": "Bullish", "score": 0.82}, "summary": "Dramatic 94th minute stoppage-time winner sends stadium into pandemonium", "top_quote": "Pure footballing cinema. You cannot write scripts like this."},
    {"rank": 5, "hashtag": "#Bitcoin100K", "category": "Finance & Crypto", "volume": "289.4K Posts", "volume_num": 289400, "velocity": "+64% past 2h", "sentiment": {"label": "Bullish", "score": 0.91}, "summary": "Macro hedge against fiat depreciation hits historic psychological milestone", "top_quote": "The fixed supply math has played out cleanly across 16 years."},
    {"rank": 6, "hashtag": "#GTA6Trailer3", "category": "Sports & Gaming", "volume": "345.0K Posts", "volume_num": 345000, "velocity": "+180% past 4h", "sentiment": {"label": "Bullish", "score": 0.96}, "summary": "Rockstar Games drops new Vice City gameplay teasers and physics demos", "top_quote": "We really lived to see this graphic fidelity in our lifetime."},
    {"rank": 7, "hashtag": "#TamilCinema", "category": "Culture & India", "volume": "198.5K Posts", "volume_num": 198500, "velocity": "+52% past 1h", "sentiment": {"label": "Bullish", "score": 0.84}, "summary": "Kollywood audio launch announcement and star fan clubs trending worldwide", "top_quote": "Anirudh has cooked another chartbuster for the entire generation."},
    {"rank": 8, "hashtag": "#AuraPoints", "category": "Memes & Gen-Z", "volume": "230.1K Posts", "volume_num": 230100, "velocity": "+115% past 2h", "sentiment": {"label": "Spicy", "score": 0.35}, "summary": "Timeline ranks daily embarrassing vs legendary public encounters", "top_quote": "+10,000 aura points for walking out of that awkward meeting gracefully."},
    {"rank": 9, "hashtag": "#SupplyChainAlert", "category": "Breaking News", "volume": "112.3K Posts", "volume_num": 112300, "velocity": "+45% past 1h", "sentiment": {"label": "Critical", "score": -0.58}, "summary": "Global maritime shipping reroutes increase freight times by 12 days", "top_quote": "Insurance rates on red sea transit have jumped 38% since yesterday."},
    {"rank": 10, "hashtag": "#RustLang", "category": "Tech & AI", "volume": "88.6K Posts", "volume_num": 88600, "velocity": "+38% past 3h", "sentiment": {"label": "Positive", "score": 0.68}, "summary": "High-performance memory safety adoption in Linux kernel and cloud backends", "top_quote": "Zero-cost abstractions make high-throughput servers a genuine pleasure."},
    {"rank": 11, "hashtag": "#BollyBlinds", "category": "Pop Culture", "volume": "142.0K Posts", "volume_num": 142000, "velocity": "+62% past 2h", "sentiment": {"label": "Spicy", "score": -0.22}, "summary": "Celebrity casting rumors and unseen airport look paparazzi videos", "top_quote": "The timeline is dissecting every frame of that airport departure video."},
    {"rank": 12, "hashtag": "#RemoteWorkDebate", "category": "Tech & Work", "volume": "164.2K Posts", "volume_num": 164200, "velocity": "+74% past 2h", "sentiment": {"label": "Spicy", "score": -0.34}, "summary": "Executive RTO mandates face organized engineer backlash and counter-offers", "top_quote": "The best developers will always prioritize autonomy over commercial leases."}
]


# ─── API Helper: Synthetic Rich Post Generator for Vast Pages ─────────────────

def _generate_tweet_item(idx: int, category: str, base_time: datetime) -> Dict[str, Any]:
    cat_key = category if category in CATEGORY_TWEETS else random.choice(list(CATEGORY_TWEETS.keys()))
    author_list = AUTHORS_POOL.get(cat_key, AUTHORS_POOL["tech"])
    author = author_list[idx % len(author_list)]
    
    templates = CATEGORY_TWEETS[cat_key]
    template = templates[idx % len(templates)]
    
    # Deterministic yet diverse variations
    delta_minutes = idx * 11 + (idx % 7) * 3
    pub_time = base_time - timedelta(minutes=delta_minutes)
    
    likes = template["likes"] + (idx * 143) % 8000
    retweets = template["retweets"] + (idx * 37) % 1500
    quotes = template["quotes"] + (idx * 19) % 800
    replies = template["replies"] + (idx * 23) % 600
    bookmarks = int(likes * 0.18) + (idx * 41) % 400
    
    tweet_id = f"18392{idx:04d}{random.randint(1000, 9999)}"
    
    # Generate optional quoted tweet for variety
    quoted_tweet = None
    if idx % 3 == 0:
        quote_authors = AUTHORS_POOL["pop_culture"] if cat_key != "pop_culture" else AUTHORS_POOL["tech"]
        q_author = quote_authors[(idx + 1) % len(quote_authors)]
        quoted_tweet = {
            "id": f"q_{tweet_id}",
            "author": q_author,
            "text": f"Original premise being debated: \"Is this the defining paradigm shift of the year?\"",
            "published_at": (pub_time - timedelta(hours=2)).isoformat()
        }
    
    return {
        "id": tweet_id,
        "author": author,
        "text": template["text"],
        "category": cat_key,
        "category_label": next((c["label"] for c in CATEGORIES if c["id"] == cat_key), "Tech"),
        "hashtags": template["hashtags"],
        "image_url": template["image"],
        "published_at": pub_time.isoformat(),
        "stats": {
            "likes": likes,
            "retweets": retweets,
            "quotes": quotes,
            "replies": replies,
            "bookmarks": bookmarks
        },
        "engagement_score": likes + retweets * 2 + quotes * 3,
        "sentiment": template["sentiment"],
        "url": f"https://x.com/{author['handle']}/status/{tweet_id}",
        "is_thread": idx % 4 == 0,
        "thread_length": 5 if idx % 4 == 0 else 1,
        "quoted_tweet": quoted_tweet
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/categories", summary="List all supported Twitter discourse categories")
async def get_categories():
    return CATEGORIES


@router.get("/feed", summary="Vast multi-page Twitter discourse feed with rich filters")
async def get_twitter_feed(
    category: str = Query(default="all", description="Category ID (e.g. all, tech, pop_culture, memes, news, crypto, sports, culture)"),
    page: int = Query(default=1, ge=1, description="Page number for vast pagination"),
    limit: int = Query(default=12, ge=1, le=50, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search keyword, hashtag, or handle"),
    sort: str = Query(default="viral", pattern="^(viral|latest|engagement|quotes)$"),
    verified_only: bool = Query(default=False),
    media_only: bool = Query(default=False),
):
    """
    Returns high-variety Twitter feed items. Supports vast pages (up to 25+ pages)
    and full dynamic sorting, search, category filtering, and media filters.
    """
    base_time = datetime.now(timezone.utc)
    total_pool_size = 180  # Generates 180 rich items across vast pages

    cat = category if isinstance(category, str) else "all"
    p = page if isinstance(page, int) and page >= 1 else 1
    lim = limit if isinstance(limit, int) and 1 <= limit <= 50 else 12
    s_sort = sort if isinstance(sort, str) else "viral"
    v_only = verified_only is True
    m_only = media_only is True
    s_query = search.strip().lower() if isinstance(search, str) and search.strip() else None
    
    all_items = []
    
    for i in range(total_pool_size):
        # Assign category
        if cat != "all":
            item_cat = cat
        else:
            cat_keys = list(CATEGORY_TWEETS.keys())
            item_cat = cat_keys[i % len(cat_keys)]
            
        item = _generate_tweet_item(i, item_cat, base_time)
        
        # Apply filters
        if v_only and not item["author"].get("verified", False):
            continue
            
        if m_only and not item.get("image_url"):
            continue
            
        if s_query:
            text_match = s_query in item["text"].lower()
            author_match = s_query in item["author"]["name"].lower() or s_query in item["author"]["handle"].lower()
            tag_match = any(s_query in t.lower() for t in item["hashtags"])
            if not (text_match or author_match or tag_match):
                continue
                
        all_items.append(item)
    
    # Sorting
    if s_sort == "viral":
        all_items.sort(key=lambda x: x["stats"]["likes"] + x["stats"]["retweets"] * 2, reverse=True)
    elif s_sort == "latest":
        all_items.sort(key=lambda x: x["published_at"], reverse=True)
    elif s_sort == "engagement":
        all_items.sort(key=lambda x: x["engagement_score"], reverse=True)
    elif s_sort == "quotes":
        all_items.sort(key=lambda x: x["stats"]["quotes"], reverse=True)
        
    total_count = len(all_items)
    total_pages = max(1, math.ceil(total_count / lim))
    
    start_idx = (p - 1) * lim
    end_idx = start_idx + lim
    paginated_items = all_items[start_idx:end_idx]
    
    return {
        "items": paginated_items,
        "total": total_count,
        "page": p,
        "limit": lim,
        "total_pages": total_pages,
        "category": cat,
        "sort": s_sort,
        "has_next": p < total_pages,
        "has_prev": p > 1,
        "as_of": base_time.isoformat()
    }


@router.get("/trends", summary="Top 20 live trending topics & hashtags with velocity")
async def get_trending_topics():
    return {
        "trends": TRENDING_HASHTAGS,
        "total": len(TRENDING_HASHTAGS),
        "as_of": datetime.now(timezone.utc).isoformat(),
        "firehose_status": "ONLINE",
        "velocity_leader": TRENDING_HASHTAGS[0]["hashtag"]
    }


@router.get("/threads", summary="Curated long-form multi-tweet threads with reader view")
async def get_viral_threads(category: Optional[str] = Query(default=None)):
    threads = LONG_FORM_THREADS
    cat = category if isinstance(category, str) and category.strip() else None
    if cat and cat != "all":
        threads = [t for t in threads if t["category"] == cat]
    return {
        "threads": threads,
        "total": len(threads),
        "as_of": datetime.now(timezone.utc).isoformat()
    }


@router.get("/ratios", summary="Viral quote-tweet ratio battles and community verdicts")
async def get_viral_ratios():
    return {
        "ratios": VIRAL_RATIOS,
        "total": len(VIRAL_RATIOS),
        "as_of": datetime.now(timezone.utc).isoformat()
    }


@router.get("/resources", summary="Curated directory of top Twitter accounts & syndication feeds")
async def get_curated_resources():
    return {
        "directories": CURATED_RESOURCES,
        "total_categories": len(CURATED_RESOURCES),
        "total_accounts": sum(len(c["items"]) for c in CURATED_RESOURCES),
        "as_of": datetime.now(timezone.utc).isoformat()
    }


@router.get("/slang", summary="Gen-Z Twitter slang and discourse decoder")
async def get_slang_dictionary():
    return {
        "slang": SLANG_DICTIONARY,
        "total": len(SLANG_DICTIONARY),
        "as_of": datetime.now(timezone.utc).isoformat()
    }


@router.get("/stats", summary="Real-time Twitter stream intelligence stats")
async def get_twitter_stats():
    return {
        "tracked_tweets_24h": 184500,
        "active_monitored_handles": 4820,
        "viral_velocity_score": 96.4,
        "cross_platform_quotient": 8.7,
        "top_trending_hashtag": "#GPT5",
        "positive_sentiment_pct": 54,
        "spicy_critical_pct": 32,
        "neutral_pct": 14,
        "stream_uptime_pct": 99.98,
        "as_of": datetime.now(timezone.utc).isoformat()
    }
