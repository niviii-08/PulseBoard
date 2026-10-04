"""Unit tests for app.services.propagation_engine."""

from datetime import datetime, timedelta, timezone

from app.services.propagation_engine import PlatformObservation, analyze_propagation


def _obs(platform: str, hours_after_epoch: float, first_hour: int, total: int, epoch: datetime):
    return PlatformObservation(
        platform=platform,
        first_seen_at=epoch + timedelta(hours=hours_after_epoch),
        mentions_in_first_hour=first_hour,
        mentions_total=total,
    )


class TestAnalyzePropagation:
    def test_single_platform_cannot_establish_a_path(self):
        epoch = datetime.now(timezone.utc)
        result = analyze_propagation([_obs("reddit", 0, 5, 20, epoch)])
        assert result.established is False
        assert "cannot be established" in result.reason

    def test_no_platforms_cannot_establish_a_path(self):
        result = analyze_propagation([])
        assert result.established is False

    def test_orders_platforms_by_first_seen_ascending(self):
        epoch = datetime.now(timezone.utc)
        observations = [
            _obs("news", 10, 5, 20, epoch),
            _obs("reddit", 0, 5, 20, epoch),
            _obs("x", 4, 10, 50, epoch),
        ]
        result = analyze_propagation(observations)
        assert result.established is True
        assert [s.platform for s in result.steps] == ["reddit", "x", "news"]
        assert [s.sequence_order for s in result.steps] == [1, 2, 3]

    def test_growth_since_entry_calculated_correctly(self):
        epoch = datetime.now(timezone.utc)
        observations = [
            _obs("reddit", 0, 10, 10, epoch),
            _obs("x", 2, 20, 60, epoch),  # 20 -> 60 = +200%
        ]
        result = analyze_propagation(observations)
        x_step = next(s for s in result.steps if s.platform == "x")
        assert x_step.growth_since_entry_pct == 200.0

    def test_zero_first_hour_mentions_does_not_divide_by_zero(self):
        epoch = datetime.now(timezone.utc)
        observations = [
            _obs("reddit", 0, 0, 5, epoch),
            _obs("x", 1, 0, 10, epoch),
        ]
        result = analyze_propagation(observations)
        assert result.established is True
        assert all(s.growth_since_entry_pct == 0.0 for s in result.steps)
