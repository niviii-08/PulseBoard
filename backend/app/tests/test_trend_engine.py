"""Unit tests for app.services.trend_engine -- pure functions, no DB needed."""

from app.services.trend_engine import TrendInput, compute_growth_rate, score_trend


class TestGrowthRate:
    def test_zero_baseline_with_mentions_is_fresh_topic(self):
        assert compute_growth_rate(current_volume=10, baseline_volume=0) == 100.0

    def test_zero_baseline_with_no_mentions_is_zero(self):
        assert compute_growth_rate(current_volume=0, baseline_volume=0) == 0.0

    def test_standard_growth_calculation(self):
        # 10 -> 34 is +240%
        assert compute_growth_rate(current_volume=34, baseline_volume=10) == 240.0

    def test_decline_is_negative(self):
        assert compute_growth_rate(current_volume=5, baseline_volume=10) == -50.0


class TestScoreTrend:
    def _baseline_input(self, **overrides):
        defaults = dict(
            current_volume=10,
            baseline_volume=10,
            previous_growth_rate=0.0,
            hours_since_last_mention=0.0,
            avg_engagement=10.0,
            platform_count=1,
            max_platform_count=5,
            sentiment_now=0.0,
            sentiment_baseline=0.0,
        )
        defaults.update(overrides)
        return TrendInput(**defaults)

    def test_flat_topic_scores_low(self):
        # Not literally near-zero: recency and "stable" acceleration each
        # contribute their baseline share even for a flat topic (see
        # trend_engine's centering of the acceleration component at 50 and
        # decay of the recency component from 100) -- the invariant that
        # matters is that it stays well clear of the emerging-trend
        # threshold (70), not that it hits an arbitrary near-zero number.
        result = score_trend(self._baseline_input())
        assert result.trend_score < 30

    def test_spiking_topic_scores_high(self):
        result = score_trend(
            self._baseline_input(
                current_volume=100,
                baseline_volume=10,
                previous_growth_rate=50.0,
                avg_engagement=600.0,
                platform_count=4,
                sentiment_now=-0.6,
                sentiment_baseline=0.1,
            )
        )
        assert result.trend_score > 70

    def test_score_never_exceeds_100(self):
        result = score_trend(
            self._baseline_input(
                current_volume=100000,
                baseline_volume=1,
                previous_growth_rate=-500,
                avg_engagement=999999,
                platform_count=10,
                sentiment_now=1.0,
                sentiment_baseline=-1.0,
            )
        )
        assert result.trend_score <= 100.0

    def test_score_never_negative(self):
        result = score_trend(
            self._baseline_input(current_volume=0, baseline_volume=100, hours_since_last_mention=100)
        )
        assert result.trend_score >= 0.0

    def test_acceleration_reflects_growth_rate_delta(self):
        result = score_trend(self._baseline_input(current_volume=20, baseline_volume=10, previous_growth_rate=40.0))
        assert result.growth_rate == 100.0
        assert result.acceleration == 60.0

    def test_score_breakdown_sums_to_trend_score(self):
        result = score_trend(self._baseline_input(current_volume=40, baseline_volume=10))
        assert abs(sum(result.breakdown.values()) - result.trend_score) < 0.2

    def test_higher_growth_always_scores_at_least_as_high(self):
        low = score_trend(self._baseline_input(current_volume=15, baseline_volume=10))
        high = score_trend(self._baseline_input(current_volume=80, baseline_volume=10))
        assert high.trend_score >= low.trend_score
