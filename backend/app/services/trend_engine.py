"""
Emerging-trend scoring for PulseBoard Global Trend Intelligence Platform.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional

WEIGHTS = {
    "growth": 0.20,
    "acceleration": 0.15,
    "recency": 0.10,
    "source_diversity": 0.15,
    "geo_spread": 0.15,
    "engagement": 0.10,
    "sentiment_shift": 0.10,
    "search_interest": 0.05,
}

# Make sure weights sum to 1.0
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9

@dataclass
class TrendInput:
    topic_name: str
    current_volume: int
    baseline_volume: float
    previous_growth_rate: float
    hours_since_last_mention: float
    
    source_count: int
    max_source_count: int
    
    geo_count: int
    max_geo_count: int
    
    avg_engagement: float
    
    sentiment_now: float
    sentiment_baseline: float
    
    old_source_count: int = 0
    old_geo_count: int = 0
    search_interest: Optional[float] = None # 0-100 when available
    max_event_velocity: float = 0.0

@dataclass
class TrendOutput:
    topic: str
    trend_score: float
    label: str
    
    # Normalized 0-100 components for the UI display
    growth: float
    acceleration: float
    recency: float
    source_diversity: float
    geo_spread: float
    engagement: float
    sentiment_shift: float
    search_interest: float
    
    # Raw values for explainability
    raw_growth_rate: float
    raw_acceleration: float
    velocity: float
    baseline_deviation: float
    event_impact: float
    
    explanation: Dict[str, List[str]] = field(default_factory=dict)

def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))

def compute_growth_rate(current_volume: int, baseline_volume: float) -> float:
    if baseline_volume <= 0:
        return 100.0 if current_volume > 0 else 0.0
    return round(((current_volume - baseline_volume) / baseline_volume) * 100.0, 1)

def determine_label(score: float, growth_rate: float, acceleration: float) -> str:
    if score >= 80 and acceleration > 20:
        return "BREAKOUT"
    elif score >= 70 and growth_rate > 50:
        return "RISING FAST"
    elif score >= 50 and growth_rate > 10:
        return "RISING"
    elif score >= 40 and growth_rate > -10:
        return "STABLE"
    elif score >= 20:
        return "DECLINING"
    else:
        return "FADING"

def score_trend(t: TrendInput) -> TrendOutput:
    # 1. Raw computations
    growth_rate = compute_growth_rate(t.current_volume, t.baseline_volume)
    acceleration = round(growth_rate - t.previous_growth_rate, 1)
    
    # velocity multiplier (e.g. 3.4x)
    velocity = round(t.current_volume / max(t.baseline_volume, 1.0), 1)
    baseline_deviation = round(t.current_volume - t.baseline_volume, 1)
    
    # 2. Normalized Components (0-100)
    c_growth = _clamp(growth_rate / 4.0) # 400% -> max
    c_accel = _clamp(50.0 + acceleration / 4.0) # 0 acceleration -> 50
    c_recency = _clamp(100.0 - (t.hours_since_last_mention * 4.0)) # 25h -> 0
    c_source = _clamp((t.source_count / max(t.max_source_count, 1)) * 100.0)
    c_geo = _clamp((t.geo_count / max(t.max_geo_count, 1)) * 100.0)
    c_engage = _clamp((t.avg_engagement / 500.0) * 100.0)
    c_sentiment = _clamp(abs(t.sentiment_now - t.sentiment_baseline) * 100.0)
    c_search = _clamp(t.search_interest) if t.search_interest is not None else 0.0
    
    # 3. Weighted Final Score
    total_score = (
        c_growth * WEIGHTS["growth"] +
        c_accel * WEIGHTS["acceleration"] +
        c_recency * WEIGHTS["recency"] +
        c_source * WEIGHTS["source_diversity"] +
        c_geo * WEIGHTS["geo_spread"] +
        c_engage * WEIGHTS["engagement"] +
        c_sentiment * WEIGHTS["sentiment_shift"] +
        (c_search * WEIGHTS["search_interest"] if t.search_interest is not None else 0.0)
    )
    
    # Event acceleration contribution:
    # High max_event_velocity significantly bumps the trend score.
    # An event with sudden acceleration should contribute strongly to trend detection.
    event_impact = 0.0
    if t.max_event_velocity > 5.0:
        # e.g. velocity of 10 articles/hour gives a +10 bump, up to +30 max limit.
        event_impact = _clamp(t.max_event_velocity * 2.0, 0, 30.0)
        total_score += event_impact
    
    # If search_interest is None, we need to redistribute its weight or just normalize up
    if t.search_interest is None:
        total_score = total_score / (1.0 - WEIGHTS["search_interest"])
        
    trend_score = _clamp(round(total_score, 1))
    
    # 4. Generate Deterministic Explanations
    explanations = []
    if growth_rate > 20:
        explanations.append(f"Mentions increased {growth_rate:.0f}% in the last 2 hours.")
        
    if t.geo_count > t.old_geo_count and t.old_geo_count > 0:
        explanations.append(f"Coverage expanded from {t.old_geo_count} to {t.geo_count} countries.")
    elif t.geo_count > 10:
        explanations.append(f"Topic is being discussed across {t.geo_count} different countries.")
        
    if t.source_count > t.old_source_count and t.old_source_count > 0:
        inc = ((t.source_count - t.old_source_count) / t.old_source_count) * 100
        explanations.append(f"The number of unique sources increased by {inc:.0f}%.")
        
    s_diff = t.sentiment_now - t.sentiment_baseline
    if abs(s_diff) > 0.1:
        dir_str = "Negative" if s_diff < 0 else "Positive"
        explanations.append(f"{dir_str} sentiment shifted strongly.")
        
    if velocity > 1.5:
        explanations.append(f"Topic velocity is {velocity}× above its baseline.")
        
    if t.max_event_velocity > 5.0:
        explanations.append(f"A specific event is accelerating rapidly (velocity: {t.max_event_velocity:.1f}).")
        
    if acceleration > 20:
        explanations.append(f"Growth is accelerating rapidly (+{acceleration:.0f} points).")

    label = determine_label(trend_score, growth_rate, acceleration)
    
    return TrendOutput(
        topic=t.topic_name,
        trend_score=trend_score,
        label=label,
        growth=round(c_growth, 1),
        acceleration=round(c_accel, 1),
        recency=round(c_recency, 1),
        source_diversity=round(c_source, 1),
        geo_spread=round(c_geo, 1),
        engagement=round(c_engage, 1),
        sentiment_shift=round(c_sentiment, 1),
        search_interest=round(c_search, 1),
        raw_growth_rate=growth_rate,
        raw_acceleration=acceleration,
        velocity=velocity,
        baseline_deviation=baseline_deviation,
        event_impact=event_impact,
        explanation={"why_trending": explanations}
    )
