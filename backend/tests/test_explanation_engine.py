from app.services.explanation_engine import Evidence, _deterministic_why_trending

def test_deterministic_why_trending_format():
    evidence = Evidence(
        topic_name="AI Regulation",
        total_mentions=1500,
        growth_rate=1.82,
        previous_growth_rate=0.34,
        acceleration=1.48,
        geographic_spread=47,
        source_count=312,
        sentiment_avg=-0.18,
        sentiment_baseline=0.12,
        positive_pct=0,
        negative_pct=0,
        neutral_pct=0,
        top_platforms=[],
        top_posts=[],
        top_keywords=[],
        related_topics=["Data Privacy", "AGI"]
    )
    result = _deterministic_why_trending(evidence)
    
    # Must contain exact formatting specs
    assert "WHY IS THIS TRENDING?" in result
    assert "increased 182%" in result
    assert "Detected across 47 countries." in result
    assert "312 unique sources mentioned this topic." in result
    assert "increased from 34% to 182%." in result
    assert "changed from +0.12 to -0.18." in result
    assert "Often discussed alongside: Data Privacy, AGI" in result

def test_deterministic_why_trending_negative_growth():
    evidence = Evidence(
        topic_name="Declining Topic",
        total_mentions=100,
        growth_rate=-0.50,
        previous_growth_rate=0.10,
        acceleration=-0.60,
        geographic_spread=1,
        source_count=1,
        sentiment_avg=0.0,
        sentiment_baseline=0.0,
        positive_pct=0,
        negative_pct=0,
        neutral_pct=0,
        top_platforms=[],
        top_posts=[],
        top_keywords=[]
    )
    result = _deterministic_why_trending(evidence)
    assert "decreased 50%" in result
    assert "declined from 10% to -50%." in result
