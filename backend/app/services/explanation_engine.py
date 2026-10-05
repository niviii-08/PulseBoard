"""
"Why is this trending?" / sentiment-shift explanation generation.
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
    
    # NEW FIELDS:
    acceleration: float = 0.0
    previous_growth_rate: float = 0.0
    source_count: int = 0
    geographic_spread: int = 0
    sentiment_avg: float = 0.0
    sentiment_baseline: float = 0.0
    related_topics: list[str] = field(default_factory=list)


def build_evidence(**kwargs: Any) -> Evidence:
    return Evidence(**kwargs)


def _deterministic_why_trending(e: Evidence) -> str:
    growth_str = f"increased {e.growth_rate * 100:.0f}%" if e.growth_rate >= 0 else f"decreased {abs(e.growth_rate) * 100:.0f}%"
    
    prev_g = e.previous_growth_rate * 100
    curr_g = e.growth_rate * 100
    accel_str = (
        f"The growth rate increased from {prev_g:.0f}% to {curr_g:.0f}%."
        if e.acceleration > 0 else
        f"The growth rate declined from {prev_g:.0f}% to {curr_g:.0f}%."
    )

    lines = [
        "WHY IS THIS TRENDING?\n",
        "🔥 Rapid growth",
        f"Mentions {growth_str} recently.\n",
        "🌍 Global spread",
        f"Detected across {e.geographic_spread} countries.\n",
        "📰 Media coverage",
        f"{e.source_count} unique sources mentioned this topic.\n",
        "📈 Acceleration",
        f"{accel_str}\n",
        "😊 Sentiment shift",
        f"Average sentiment changed from {e.sentiment_baseline:+.2f} to {e.sentiment_avg:+.2f}."
    ]
    
    if e.related_topics:
        lines.append("\n🔗 Related topics")
        lines.append(f"Often discussed alongside: {', '.join(e.related_topics)}")
        
    return "\n".join(lines)


def _deterministic_sentiment_shift(e: Evidence) -> str:
    # Just route sentiment shifts through the new Why Trending format to keep it consistent
    return _deterministic_why_trending(e)


async def _llm_explanation(e: Evidence, kind: str) -> str | None:
    if not settings.ANTHROPIC_API_KEY:
        return None
    prompt = (
        "You are writing a structured 'WHY IS THIS TRENDING?' explanation for a social-listening dashboard. "
        "Use ONLY the facts in this JSON evidence. Do NOT invent or estimate numbers.\n"
        "You MUST output exactly in this format with these headings:\n\n"
        "WHY IS THIS TRENDING?\n\n"
        "🔥 Rapid growth\nMentions increased [X]%...\n\n"
        "🌍 Global spread\nDetected across [X] countries.\n\n"
        "📰 Media coverage\n[X] unique sources mentioned this topic.\n\n"
        "📈 Acceleration\nThe growth rate changed from [X]% to [Y]%.\n\n"
        "😊 Sentiment shift\nAverage sentiment changed from [X] to [Y].\n\n"
        f"Kind: {kind}\nEvidence: {e}\n"
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
                    "model": "claude-3-5-sonnet-20240620",
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
    llm_text = await _llm_explanation(e, "why_trending")
    if llm_text:
        return llm_text, "llm"
    return _deterministic_why_trending(e), "deterministic"


async def explain_sentiment_shift(e: Evidence) -> tuple[str, str]:
    llm_text = await _llm_explanation(e, "sentiment_shift")
    if llm_text:
        return llm_text, "llm"
    return _deterministic_sentiment_shift(e), "deterministic"
