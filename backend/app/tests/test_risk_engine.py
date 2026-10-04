"""Unit tests for app.services.risk_engine."""

from app.services.risk_engine import MAX_POINTS, RiskInput, assess_risk, level_for_score


class TestLevelForScore:
    def test_bands(self):
        assert level_for_score(0) == "LOW"
        assert level_for_score(29) == "LOW"
        assert level_for_score(30) == "MODERATE"
        assert level_for_score(59) == "MODERATE"
        assert level_for_score(60) == "HIGH"
        assert level_for_score(79) == "HIGH"
        assert level_for_score(80) == "CRITICAL"
        assert level_for_score(100) == "CRITICAL"


class TestAssessRisk:
    def _quiet_input(self, **overrides):
        defaults = dict(
            negative_pct=10.0,
            negative_pct_baseline=10.0,
            mention_growth_rate=0.0,
            complaint_cluster_size=0,
            high_reach_mentions=0,
            platforms_affected=1,
            max_platforms=5,
            repeated_keyword_hits=0,
        )
        defaults.update(overrides)
        return RiskInput(**defaults)

    def test_no_signal_scores_near_zero(self):
        result = assess_risk(self._quiet_input())
        assert result.risk_score < 10
        assert result.risk_level == "LOW"

    def test_full_crisis_scores_critical(self):
        result = assess_risk(
            self._quiet_input(
                negative_pct=90.0,
                negative_pct_baseline=10.0,
                mention_growth_rate=300.0,
                complaint_cluster_size=30,
                high_reach_mentions=10,
                platforms_affected=5,
                repeated_keyword_hits=10,
            )
        )
        assert result.risk_level == "CRITICAL"
        assert result.risk_score >= 80

    def test_score_never_exceeds_100(self):
        result = assess_risk(
            self._quiet_input(
                negative_pct=1000.0,
                negative_pct_baseline=0.0,
                mention_growth_rate=99999.0,
                complaint_cluster_size=99999,
                high_reach_mentions=99999,
                platforms_affected=99999,
                repeated_keyword_hits=99999,
            )
        )
        assert result.risk_score <= 100.0

    def test_drivers_are_explainable_and_capped(self):
        result = assess_risk(
            self._quiet_input(negative_pct=80.0, negative_pct_baseline=10.0, mention_growth_rate=250.0)
        )
        assert len(result.drivers) > 0
        for driver in result.drivers:
            assert driver["points"] <= driver["max_points"]
            assert driver["driver"]  # human-readable label present

    def test_max_points_sum_to_100(self):
        assert sum(MAX_POINTS.values()) == 100

    def test_drivers_sorted_descending_by_points(self):
        result = assess_risk(
            self._quiet_input(negative_pct=70.0, negative_pct_baseline=10.0, mention_growth_rate=180.0, complaint_cluster_size=15)
        )
        points = [d["points"] for d in result.drivers]
        assert points == sorted(points, reverse=True)

    def test_zero_drivers_omitted_from_list(self):
        result = assess_risk(self._quiet_input())
        assert all(d["points"] > 0 for d in result.drivers)
