"""Unit tests for app.services.sentiment_engine."""

from datetime import datetime, timedelta, timezone

from app.services.sentiment_engine import aggregate_sentiment, detect_shift, score_text


class TestScoreText:
    def test_clearly_positive_text(self):
        score, label = score_text("I absolutely love this, best purchase ever, amazing!")
        assert label == "positive"
        assert score > 0

    def test_clearly_negative_text(self):
        score, label = score_text("This is terrible, worst experience, I hate it and want a refund")
        assert label == "negative"
        assert score < 0

    def test_neutral_text(self):
        score, label = score_text("The package arrived at 3pm on Tuesday.")
        assert label == "neutral"

    def test_empty_text_is_neutral_not_an_error(self):
        score, label = score_text("")
        assert score == 0.0
        assert label == "neutral"

    def test_none_text_is_neutral_not_an_error(self):
        score, label = score_text(None)
        assert label == "neutral"


class TestAggregateSentiment:
    def test_empty_list_returns_zeros(self):
        result = aggregate_sentiment([])
        assert result.sample_size == 0
        assert result.positive_pct == 0.0

    def test_percentages_sum_to_100(self):
        result = aggregate_sentiment([0.8, -0.6, 0.0, 0.3, -0.9])
        assert abs(result.positive_pct + result.negative_pct + result.neutral_pct - 100.0) < 0.1

    def test_all_positive(self):
        result = aggregate_sentiment([0.5, 0.6, 0.7])
        assert result.positive_pct == 100.0
        assert result.negative_pct == 0.0


class TestDetectShift:
    def _snap(self, hours_ago: float, positive_pct: float, now: datetime):
        return {"timestamp": now - timedelta(hours=hours_ago), "positive_pct": positive_pct}

    def test_no_shift_when_stable(self):
        now = datetime.now(timezone.utc)
        snaps = [self._snap(h, 70.0, now) for h in [24, 18, 12, 6, 0]]
        result = detect_shift(snaps)
        assert result.shift_detected is False

    def test_shift_detected_on_large_drop(self):
        now = datetime.now(timezone.utc)
        snaps = [
            self._snap(24, 72.0, now),
            self._snap(18, 68.0, now),
            self._snap(12, 51.0, now),
            self._snap(6, 29.0, now),
            self._snap(0, 25.0, now),
        ]
        result = detect_shift(snaps)
        assert result.shift_detected is True
        assert result.delta_pct_points >= 25.0

    def test_single_snapshot_cannot_detect_a_shift(self):
        now = datetime.now(timezone.utc)
        result = detect_shift([self._snap(0, 50.0, now)])
        assert result.shift_detected is False
        assert result.reason is not None

    def test_rising_sentiment_is_not_a_shift(self):
        now = datetime.now(timezone.utc)
        snaps = [self._snap(h, p, now) for h, p in [(24, 30), (18, 40), (12, 55), (6, 65), (0, 75)]]
        result = detect_shift(snaps)
        assert result.shift_detected is False
