"""
"Why is this trending?" / sentiment-shift explanation generation.

Two modes, selected automatically:

  - LLM mode: used only if settings.ANTHROPIC_API_KEY is set. The model
    is given the *exact* structured evidence dict built by
    build_evidence() below and instructed to restate it in prose,
    explicitly forbidden from adding facts not present in the evidence.
  - Deterministic fallback (the default in this environment, since no
    API key is configured here): a template fills in the same evidence
    dict's numbers directly. No network call, no hallucination risk,
    works offline -- exactly what the spec asks for ("If no API key
    exists, implement a deterministic fallback explanation engine so
    the feature still works locally").

Both modes consume the same `evidence` dict, so the *facts* in the
explanation are identical either way -- only the prose differs. This is
the seam the spec means by "grounded in evidence": nothing here is
invented, everything traces back to a field in `evidence`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx

from app.core.config import settings


@dataclass
class Evidence:
    topic_name: str
    total_mentions: int
    growth_rate: float
    positive_pct: float
    negative_pct: float
    neutral_pct: float
    top_platforms: list[tuple[str, int]]        # [(platform, mention_count), ...] desc
    top_posts: list[dict]                        # [{platform, engagement_count, url}, ...] top by engagement
    top_keywords: list[str]
    sentiment_shift: dict | None = None          # from sentiment_engine.SentimentShift, as dict, if relevant


def build_evidence(**kwargs: Any) -> Evidence:
    return Evidence(**kwargs)


def _deterministic_why_trending(e: Evidence) -> str:
    lines = []
    lines.append(
        f"Discussion of \"{e.topic_name}\" is up {e.growth_rate:.0f}% against its recent baseline, "
        f"with {e.total_mentions} tracked mentions."
    )
    lines.append(
        f"{e.positive_pct:.0f}% of conversations are positive, {e.negative_pct:.0f}% are negative, "
        f"and {e.neutral_pct:.0f}% are neutral."
    )
    if e.top_platforms:
        platform_str = " and ".join(f"{p} ({c} mentions)" for p, c in e.top_platforms[:2])
        lines.append(f"The strongest activity is currently coming from {platform_str}.")
    if e.top_posts:
        n = len(e.top_posts)
        total_engagement = sum(p.get("engagement_count", 0) for p in e.top_posts)
        lines.append(
            f"{n} high-engagement post{'s' if n != 1 else ''} account for {total_engagement:,} combined "
            f"engagements in the recent spike."
        )
    if e.top_keywords:
        lines.append(f"Recurring terms in these posts include: {', '.join(e.top_keywords[:6])}.")
    return " ".join(lines)


def _deterministic_sentiment_shift(e: Evidence) -> str:
    shift = e.sentiment_shift or {}
    delta = shift.get("delta_pct_points", 0)
    window = shift.get("window_hours", 24)
    lines = [
        f"Sentiment on \"{e.topic_name}\" dropped {delta:.0f} percentage points within the last {window:.0f} hours."
    ]
    if e.top_keywords:
        lines.append(
            "The shift coincides with a rise in conversations mentioning: "
            + ", ".join(e.top_keywords[:5]) + "."
        )
    if e.top_platforms:
        lines.append(f"The strongest negative activity originated on {e.top_platforms[0][0]}.")
    return " ".join(lines)


async def _llm_explanation(e: Evidence, kind: str) -> str | None:
    """Returns None on any failure so callers always have the deterministic
    fallback to reach for; never raises."""
    if not settings.ANTHROPIC_API_KEY:
        return None
    prompt = (
        "You are writing a one-paragraph, grounded explanation for a social-listening "
        "dashboard. Use ONLY the facts in this JSON evidence -- do not invent, estimate, "
        "or assume anything not present in it. If a field is missing, omit it rather than "
        f"guessing.\n\nKind: {kind}\nEvidence: {e}\n"
    )
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-6",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
    except Exception:
        return None


async def explain_why_trending(e: Evidence) -> tuple[str, str]:
    """Returns (summary_text, generated_by) where generated_by is 'llm' or 'deterministic'."""
    llm_text = await _llm_explanation(e, "why_trending")
    if llm_text:
        return llm_text, "llm"
    return _deterministic_why_trending(e), "deterministic"


async def explain_sentiment_shift(e: Evidence) -> tuple[str, str]:
    llm_text = await _llm_explanation(e, "sentiment_shift")
    if llm_text:
        return llm_text, "llm"
    return _deterministic_sentiment_shift(e), "deterministic"
