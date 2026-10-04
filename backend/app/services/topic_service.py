"""
Topic assignment + brand matching.

Both are keyword-overlap operations rather than ML classification --
see app/services/keyword_extraction.py's module docstring for the
rationale. This module is the pure-function core (no DB access) so it's
directly unit-testable; app/tasks/ingestion_tasks.py is the thin layer
that calls this against the database.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.services.keyword_extraction import extract_keywords, jaccard_similarity

# Two posts are considered the same topic if their keyword sets overlap
# at least this much. Chosen empirically low enough that "delivery delay"
# and "late delivery" cluster together (they share "delivery" + one of
# "delay"/"late" is not required) but high enough that unrelated posts
# don't collide.
TOPIC_MATCH_THRESHOLD = 0.15


@dataclass
class ExistingTopic:
    id: str
    keywords: list[str]


def match_or_new_topic_name(
    post_text: str,
    existing_topics: list[ExistingTopic],
) -> tuple[str | None, list[str]]:
    """
    Returns (matched_topic_id_or_None, keywords_for_this_post).

    If no existing topic clears TOPIC_MATCH_THRESHOLD, the caller is
    expected to create a new Topic using the returned keywords (joined
    into a human-readable name) -- this function does not talk to the
    database, so it can't do that itself.
    """
    keywords = extract_keywords(post_text)
    if not keywords:
        return None, keywords

    best_id, best_score = None, 0.0
    for topic in existing_topics:
        score = jaccard_similarity(keywords, topic.keywords or [])
        if score > best_score:
            best_id, best_score = topic.id, score

    if best_score >= TOPIC_MATCH_THRESHOLD:
        return best_id, keywords
    return None, keywords


def matches_brand(text: str, brand_keywords: list[str]) -> bool:
    """
    Whether `text` mentions a brand, by simple case-insensitive substring
    match against the brand's configured keyword/alias list. Deliberately
    simple and auditable: a user who asks "why did this count as a Nike
    mention" gets a literal, inspectable answer (the matched keyword),
    not a similarity score they have to trust.
    """
    if not brand_keywords:
        return False
    lowered = (text or "").lower()
    return any(kw.lower() in lowered for kw in brand_keywords if kw)


def related_topics(target_keywords: list[str], candidates: list[ExistingTopic], top_n: int = 5) -> list[tuple[str, float]]:
    """Ranks candidate topics by keyword overlap with target_keywords."""
    scored = [(c.id, jaccard_similarity(target_keywords, c.keywords or [])) for c in candidates]
    scored = [s for s in scored if s[1] > 0]
    scored.sort(key=lambda s: s[1], reverse=True)
    return scored[:top_n]
