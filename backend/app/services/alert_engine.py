"""
Threshold-crossing -> Alert generation.

Pure function: given the numbers the other engines already computed for
one topic/brand this run, decide which (if any) Alert rows should be
created. Kept separate from those engines so the thresholds themselves
are one auditable place (and configurable via Settings, not hard-coded).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass
class AlertCandidate:
    alert_type: str
    severity: str
    message: str
    drivers: dict
    threshold_value: float
    observed_value: float


def check_trend_alert(trend_score: float, topic_name: str) -> AlertCandidate | None:
    if trend_score < settings.TREND_SCORE_ALERT_THRESHOLD:
        return None
    severity = "CRITICAL" if trend_score >= 90 else "WARNING"
    return AlertCandidate(
        alert_type="EMERGING_TREND",
        severity=severity,
        message=f'"{topic_name}" is an emerging trend (score {trend_score:.0f}/100).',
        drivers={"trend_score": trend_score},
        threshold_value=settings.TREND_SCORE_ALERT_THRESHOLD,
        observed_value=trend_score,
    )


def check_sentiment_shift_alert(delta_pct_points: float, topic_name: str) -> AlertCandidate | None:
    if delta_pct_points < settings.SENTIMENT_SHIFT_ALERT_THRESHOLD_PCT_POINTS:
        return None
    return AlertCandidate(
        alert_type="SENTIMENT_SHIFT",
        severity="CRITICAL" if delta_pct_points >= 40 else "WARNING",
        message=f'Sentiment on "{topic_name}" dropped {delta_pct_points:.0f} percentage points.',
        drivers={"delta_pct_points": delta_pct_points},
        threshold_value=settings.SENTIMENT_SHIFT_ALERT_THRESHOLD_PCT_POINTS,
        observed_value=delta_pct_points,
    )


def check_brand_risk_alert(risk_score: float, brand_name: str) -> AlertCandidate | None:
    if risk_score < settings.BRAND_RISK_ALERT_THRESHOLD:
        return None
    return AlertCandidate(
        alert_type="BRAND_RISK",
        severity="CRITICAL" if risk_score >= 80 else "WARNING",
        message=f'Brand risk for "{brand_name}" is elevated (score {risk_score:.0f}/100).',
        drivers={"risk_score": risk_score},
        threshold_value=settings.BRAND_RISK_ALERT_THRESHOLD,
        observed_value=risk_score,
    )


def check_mention_spike_alert(growth_rate: float, topic_name: str) -> AlertCandidate | None:
    if growth_rate < settings.MENTION_SPIKE_GROWTH_THRESHOLD_PCT:
        return None
    return AlertCandidate(
        alert_type="MENTION_SPIKE",
        severity="WARNING",
        message=f'Mentions of "{topic_name}" spiked {growth_rate:.0f}% above baseline.',
        drivers={"growth_rate": growth_rate},
        threshold_value=settings.MENTION_SPIKE_GROWTH_THRESHOLD_PCT,
        observed_value=growth_rate,
    )


def check_cross_platform_alert(platform_count: int, topic_name: str) -> AlertCandidate | None:
    if platform_count < settings.CROSS_PLATFORM_SPREAD_MIN_PLATFORMS:
        return None
    return AlertCandidate(
        alert_type="CROSS_PLATFORM_SPREAD",
        severity="INFO",
        message=f'"{topic_name}" is now spreading across {platform_count} platforms.',
        drivers={"platform_count": platform_count},
        threshold_value=float(settings.CROSS_PLATFORM_SPREAD_MIN_PLATFORMS),
        observed_value=float(platform_count),
    )
