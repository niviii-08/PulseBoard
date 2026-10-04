"""
Lightweight keyword/phrase extraction -- deliberately not TF-IDF/BERTopic/
embeddings. The spec explicitly warns against over-engineering topic
detection ("A good practical architecture is... Do not over-engineer
unnecessarily"), and at the post volumes a demo/portfolio deployment
actually sees, a stopword-filtered frequency count over 1-2 word phrases
is enough to (a) cluster posts into topics by keyword overlap, (b) name
"complaint clusters" for the risk engine, and (c) find "related topics".

If this were scaled to real production ingestion volume, the natural
upgrade path is: keep this as the fast/cheap first pass, add
sentence-transformer embeddings + cosine-similarity clustering as a
second pass for posts this misses (paraphrases like "late delivery" vs
"delivery delay") -- see docs/architecture.md.
"""

from __future__ import annotations

import re
from collections import Counter

_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "on", "for", "and", "or", "but", "with", "at", "by",
    "this", "that", "these", "those", "it", "its", "i", "you", "we",
    "they", "he", "she", "my", "your", "our", "their", "as", "so", "if",
    "not", "no", "just", "than", "then", "there", "here", "have", "has",
    "had", "do", "does", "did", "will", "would", "can", "could", "should",
    "about", "into", "over", "after", "before", "again", "up", "down",
    "out", "off", "all", "any", "some", "more", "most", "very", "really",
    "im", "its", "amp", "rt", "via", "get", "got", "like",
}

_WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z'-]{2,}")


def extract_keywords(text: str, top_n: int = 8) -> list[str]:
    """
    Lowercases, strips stopwords/short tokens, and returns the top_n most
    frequent surviving unigrams -- good enough to fingerprint a short
    social post for clustering/matching purposes.
    """
    if not text:
        return []
    words = [w.lower() for w in _WORD_RE.findall(text)]
    words = [w for w in words if w not in _STOPWORDS]
    counts = Counter(words)
    return [w for w, _ in counts.most_common(top_n)]


def jaccard_similarity(a: list[str], b: list[str]) -> float:
    """Set-overlap similarity of two keyword lists, in [0, 1]."""
    set_a, set_b = set(a), set(b)
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def top_terms(texts: list[str], top_n: int = 5, exclude: set[str] | None = None) -> list[tuple[str, int]]:
    """
    Frequency count of keywords across many texts -- used to name
    "complaint clusters" (top terms among negative-sentiment mentions)
    and to build the keyword evidence passed to the explanation engine.
    Returns (term, count) pairs, most common first.
    """
    exclude = exclude or set()
    counter: Counter[str] = Counter()
    for text in texts:
        counter.update(k for k in extract_keywords(text, top_n=12) if k not in exclude)
    return counter.most_common(top_n)
