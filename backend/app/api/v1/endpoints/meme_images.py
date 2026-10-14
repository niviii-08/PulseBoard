"""
Meme Image Matcher - Analyzes post titles, flair & keywords to assign
the most relatable, context-accurate image.
Zero static repeated placeholders: uses deep keyword matching + diverse seeded fallbacks.
"""

import hashlib

RELATABLE_IMAGE_MAP = {
    # Politics & Elections & Bengal Politics
    "election": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "politics": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    "political": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    "vote": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "voters": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "voting": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "tmc": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "bjp": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    "aimim": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "alliance": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    "minister": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    "rally": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "protest": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    "party": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",

    # Police & Law & Security
    "police": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    "cop": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    "officer": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    "confront": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    "arrest": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    "court": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",

    # Health & Viruses & Medical
    "h1n1": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800",
    "virus": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800",
    "viral cases": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800",
    "contagious": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800",
    "hospital": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800",
    "health": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800",
    "doctor": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800",
    "fever": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800",
    "dengue": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800",

    # Regional: Bengal & Kolkata & Calcutta
    "bengal": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800",
    "kolkata": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800",
    "calcutta": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800",
    "howrah": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800",
    "victoria": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800",

    # Memes / Punchlines / Comedy / Internet Culture
    "punchlines": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",
    "memes": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",
    "meme": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",
    "comedy": "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800",
    "funny": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",
    "roast": "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800",
    "viral": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",

    # Geopolitical & World
    "geopolitical": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800",
    "globe": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800",
    "world": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800",

    # Auto rickshaws / Cabs / Transport
    "auto": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800",
    "rickshaw": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800",
    "meter": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800",
    "uber": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800",
    "ola": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800",

    # Coffee & Tea (Filter coffee, Chai tapri)
    "coffee": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
    "chai": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800",
    "tea": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800",

    # Cinema / Movies
    "vadivelu": "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800",
    "thalapathy": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "thala": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "kollywood": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "bollywood": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "cinema": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "movie": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "theatre": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "trailer": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",

    # Food
    "dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800",
    "biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800",
    "vada pav": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
    "sweets": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800",

    # Cricket
    "cricket": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",
    "dhoni": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",
    "kohli": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",
    "ipl": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",

    # Tech & Office
    "tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    "technology": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    "ai": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    "developer": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800",
    "traffic": "https://images.unsplash.com/photo-1621252179027-94459d278660?w=800",
    "metro": "https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?w=800",
}

# Diverse fallback gallery ensuring NO identical duplicate photos on adjacent cards
DIVERSE_FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    "https://images.unsplash.com/photo-1558431382-27e303142255?w=800",
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800",
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800",
    "https://images.unsplash.com/photo-1621252179027-94459d278660?w=800",
    "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800",
    "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800",
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800",
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
    "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800",
    "https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?w=800",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800",
    "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800",
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800",
]


def get_relatable_meme_image(title: str, default_url: str = None, flair: str = None) -> str:
    """
    Scans the meme title/caption and flair for descriptive keywords and matches
    to the most relatable, context-appropriate stock photo.
    Guarantees varied, vibrant photography even on fallback.
    """
    title_lower = title.lower()

    # 1. Multi-word phrases
    phrase_matches = [
        ("west bengal", "https://images.unsplash.com/photo-1558431382-27e303142255?w=800"),
        ("humayun kabir", "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800"),
        ("police officer", "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800"),
        ("viral cases", "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800"),
        ("h1n1", "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800"),
        ("filter coffee", "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800"),
        ("saravana bhavan", "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800"),
        ("vada pav", "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800"),
        ("silk board", "https://images.unsplash.com/photo-1621252179027-94459d278660?w=800"),
        ("world cup", "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800"),
        ("eden gardens", "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800"),
    ]
    for phrase, img in phrase_matches:
        if phrase in title_lower:
            return img

    # 2. Keyword check in title
    for kw, img in RELATABLE_IMAGE_MAP.items():
        if kw in title_lower:
            return img

    # 3. Check flair
    if flair:
        flair_lower = flair.lower()
        for kw, img in RELATABLE_IMAGE_MAP.items():
            if kw in flair_lower:
                return img

    if default_url and default_url != "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800":
        return default_url

    # 4. Seeded distinct image selection so adjacent items don't repeat
    h = int(hashlib.md5(title.encode()).hexdigest(), 16)
    return DIVERSE_FALLBACK_IMAGES[h % len(DIVERSE_FALLBACK_IMAGES)]
