"""
Emerging-trend scoring.

Deliberately NOT "rank by total mention count" (the spec calls this out
explicitly). Instead, trend_score is a weighted combination of:

  - growth        : % increase in volume vs. a rolling baseline
  - acceleration  : is growth itself speeding up or slowing down
  - recency       : how long ago the topic was last active (decays)
  - engagement    : average engagement per mention, normalized
  - cross_platform: how many distinct platforms are carrying it
  - sentiment_move: how much sentiment has moved from its own baseline
                    (a topic can be "trending" by going viral-negative,
                    not just viral-positive)

Each component is normalized to 0-100 before weighting so the weights
below are directly interpretable as "how much this component can move
the final score" rather than depending on the component's raw units.
"""

from __future__ import annotations

from dataclasses import dataclass, field

WEIGHTS = {
    "growth": 0.30,
    "acceleration": 0.20,
    "recency": 0.10,
    "engagement": 0.15,
    "cross_platform": 0.10,
    "sentiment_move": 0.15,
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


@dataclass
class TrendInput:
    current_volume: int
    baseline_volume: float          # rolling average volume per equivalent window, pre-spike
    previous_growth_rate: float     # growth_rate at the last snapshot, for acceleration
    hours_since_last_mention: float
    avg_engagement: float
    platform_count: int             # distinct platforms carrying this topic
    max_platform_count: int         # platforms the whole system tracks (normalizes cross_platform)
    sentiment_now: float            # -1..1
    sentiment_baseline: float       # -1..1, topic's own historical average


@dataclass
class TrendScore:
    trend_score: float
    growth_rate: float
    acceleration: float
    breakdown: dict = field(default_factory=dict)


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def compute_growth_rate(current_volume: int, baseline_volume: float) -> float:
    """% change vs. baseline. A zero baseline with nonzero current volume
    is treated as a fresh topic and reported as a flat 100% (can't divide
    by zero, and "infinite growth" isn't a meaningful number to display)."""
    if baseline_volume <= 0:
        return 100.0 if current_volume > 0 else 0.0
    return round(((current_volume - baseline_volume) / baseline_volume) * 100.0, 1)


def score_trend(t: TrendInput) -> TrendScore:
    growth_rate = compute_growth_rate(t.current_volume, t.baseline_volume)
    acceleration = round(growth_rate - t.previous_growth_rate, 1)

    growth_component = _clamp(growth_rate / 4.0)                      # 400% growth -> maxed out
    acceleration_component = _clamp(50.0 + acceleration / 4.0)         # centered at "no change"=50
    recency_component = _clamp(100.0 - (t.hours_since_last_mention * 4.0))  # fully decayed after 25h
    engagement_component = _clamp((t.avg_engagement / 500.0) * 100.0)  # 500+ avg engagement -> maxed
    cross_platform_component = (
        _clamp((t.platform_count / max(t.max_platform_count, 1)) * 100.0)
    )
    sentiment_move_component = _clamp(abs(t.sentiment_now - t.sentiment_baseline) * 100.0)

    breakdown = {
        "growth": round(growth_component * WEIGHTS["growth"], 1),
        "acceleration": round(acceleration_component * WEIGHTS["acceleration"], 1),
        "recency": round(recency_component * WEIGHTS["recency"], 1),
        "engagement": round(engagement_component * WEIGHTS["engagement"], 1),
        "cross_platform": round(cross_platform_component * WEIGHTS["cross_platform"], 1),
        "sentiment_move": round(sentiment_move_component * WEIGHTS["sentiment_move"], 1),
    }
    trend_score = round(sum(breakdown.values()), 1)

    return TrendScore(
        trend_score=_clamp(trend_score),
        growth_rate=growth_rate,
        acceleration=acceleration,
        breakdown=breakdown,
    )
