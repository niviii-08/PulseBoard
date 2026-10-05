import pytest
from app.services.trend_engine import (
    score_trend, TrendInput, compute_growth_rate, determine_label, WEIGHTS
)

def test_compute_growth_rate():
    assert compute_growth_rate(20, 10.0) == 100.0
    assert compute_growth_rate(5, 10.0) == -50.0
    assert compute_growth_rate(10, 0.0) == 100.0
    assert compute_growth_rate(0, 0.0) == 0.0

def test_determine_label():
    assert determine_label(85, 60, 25) == "BREAKOUT"
    assert determine_label(75, 60, 10) == "RISING FAST"
    assert determine_label(55, 10, 5) == "STEADY"
    assert determine_label(45, -5, -2) == "EMERGING"
    assert determine_label(30, -50, -10) == "DECLINING"

def test_score_trend_perfect():
    ti = TrendInput(
        topic_name="AI Gen",
        current_volume=500,
        baseline_volume=100.0, # 400% growth -> 100 components
        previous_growth_rate=200.0, # 200 previous -> 200 acceleration (400-200) -> 100 component
        hours_since_last_mention=0.0, # 100 component
        
        source_count=100,
        max_source_count=100,
        old_source_count=50,
        
        geo_count=50,
        max_geo_count=50,
        old_geo_count=20,
        
        avg_engagement=500.0,
        
        sentiment_now=-0.9,
        sentiment_baseline=0.1, # diff 1.0 -> 100 component
        
        search_interest=100.0
    )
    
    out = score_trend(ti)
    
    assert out.growth == 100.0
    assert out.acceleration == 100.0
    assert out.recency == 100.0
    assert out.source_diversity == 100.0
    assert out.geo_spread == 100.0
    assert out.engagement == 100.0
    assert out.sentiment_shift == 100.0
    assert out.search_interest == 100.0
    
    assert out.trend_score == 100.0
    assert out.label == "BREAKOUT"
    assert "Mention volume increased 400% over its rolling baseline" in out.explanation["why_trending"]
    assert "Coverage expanded from 20 to 50 countries" in out.explanation["why_trending"]
    assert "The number of unique sources increased by 100%" in out.explanation["why_trending"]
    assert "Negative sentiment increased by 100%" in out.explanation["why_trending"]
    assert "Growth is accelerating rapidly (+200 points)" in out.explanation["why_trending"]

def test_score_trend_missing_search():
    ti = TrendInput(
        topic_name="Space Outpost",
        current_volume=20,
        baseline_volume=10.0, # 100% growth -> 25 component
        previous_growth_rate=100.0, # 0 acceleration -> 50 component
        hours_since_last_mention=25.0, # 0 component
        
        source_count=5,
        max_source_count=10, # 50 component
        
        geo_count=1,
        max_geo_count=10, # 10 component
        
        avg_engagement=50.0, # 10 component
        
        sentiment_now=0.1,
        sentiment_baseline=0.0, # 10 component
        
        search_interest=None # handled by normalization
    )
    
    out = score_trend(ti)
    
    expected_score_raw = (
        25.0 * WEIGHTS["growth"] +
        50.0 * WEIGHTS["acceleration"] +
        0.0 * WEIGHTS["recency"] +
        50.0 * WEIGHTS["source_diversity"] +
        10.0 * WEIGHTS["geo_spread"] +
        10.0 * WEIGHTS["engagement"] +
        10.0 * WEIGHTS["sentiment_shift"]
    )
    # expected_score_raw is 5.0 + 7.5 + 0 + 7.5 + 1.5 + 1.0 + 1.0 = 23.5
    # Since search_interest is None, normalized sum weight is 0.95
    expected_score = round(23.5 / 0.95, 1)
    
    assert out.trend_score == expected_score
    assert out.label == "DECLINING"
    assert "why_trending" in out.explanation
