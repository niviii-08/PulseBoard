"""
Brand crisis early-warning scoring.

risk_score (0-100) is an explicit sum of capped driver points, not a
single opaque formula -- every point on the score maps to a named
driver in `drivers`, which is exactly what FEATURE 5 of the spec asks
for ("This makes the score interpretable instead of a black box").
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Each driver's maximum contribution to the 0-100 score. These sum to
# 100 by construction, so a brand that maxes out every driver scores
# exactly 100.
MAX_POINTS = {
    "negative_sentiment_spike": 25,
    "mention_acceleration": 20,
    "complaint_cluster": 15,
    "high_reach_activity": 15,
    "cross_platform_spread": 15,
    "repeated_issue_keywords": 10,
}
assert sum(MAX_POINTS.values()) == 100

RISK_BANDS = [
    (0, 29, "LOW"),
    (30, 59, "MODERATE"),
    (60, 79, "HIGH"),
    (80, 100, "CRITICAL"),
]


@dataclass
class RiskInput:
    negative_pct: float              # 0-100, share of recent mentions that are negative
    negative_pct_baseline: float     # 0-100, this brand's historical negative share
    mention_growth_rate: float       # % vs baseline, from trend_engine.compute_growth_rate
    complaint_cluster_size: int      # count of mentions in the largest shared-keyword negative cluster
    high_reach_mentions: int         # count of negative mentions above the engagement threshold
    platforms_affected: int
    max_platforms: int
    repeated_keyword_hits: int       # how many of the top complaint keywords recur across the window


@dataclass
class RiskResult:
    risk_score: float
    risk_level: str
    drivers: list[dict] = field(default_factory=list)


def _scale(value: float, full_at: float, cap: int) -> float:
    """Linear scale of `value` to [0, cap], saturating once value >= full_at."""
    if full_at <= 0:
        return 0.0
    return round(min(cap, max(0.0, value) / full_at * cap), 1)


def level_for_score(score: float) -> str:
    for low, high, label in RISK_BANDS:
        if low <= score <= high:
            return label
    return "CRITICAL"


def assess_risk(r: RiskInput) -> RiskResult:
    sentiment_spike = max(0.0, r.negative_pct - r.negative_pct_baseline)
    drivers_points = {
        "negative_sentiment_spike": _scale(sentiment_spike, full_at=40, cap=MAX_POINTS["negative_sentiment_spike"]),
        "mention_acceleration": _scale(r.mention_growth_rate, full_at=200, cap=MAX_POINTS["mention_acceleration"]),
        "complaint_cluster": _scale(r.complaint_cluster_size, full_at=20, cap=MAX_POINTS["complaint_cluster"]),
        "high_reach_activity": _scale(r.high_reach_mentions, full_at=5, cap=MAX_POINTS["high_reach_activity"]),
        "cross_platform_spread": _scale(
            r.platforms_affected, full_at=max(r.max_platforms, 1), cap=MAX_POINTS["cross_platform_spread"]
        ),
        "repeated_issue_keywords": _scale(r.repeated_keyword_hits, full_at=5, cap=MAX_POINTS["repeated_issue_keywords"]),
    }

    score = round(sum(drivers_points.values()), 1)
    labels = {
        "negative_sentiment_spike": "Negative sentiment spike",
        "mention_acceleration": "Mention acceleration",
        "complaint_cluster": "Complaint cluster",
        "high_reach_activity": "High-reach account activity",
        "cross_platform_spread": "Cross-platform spread",
        "repeated_issue_keywords": "Repeated issue keywords",
    }
    drivers = [
        {"driver": labels[k], "points": v, "max_points": MAX_POINTS[k]}
        for k, v in drivers_points.items()
        if v > 0
    ]
    drivers.sort(key=lambda d: d["points"], reverse=True)

    return RiskResult(risk_score=score, risk_level=level_for_score(score), drivers=drivers)
