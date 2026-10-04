"""
Sentiment scoring + sentiment-shift detection.

Scoring a single post uses VADER (app/services -- a lexicon/rule-based
sentiment analyzer distributed as `vaderSentiment`). It was chosen over
calling an LLM per post because:
  - it's local, deterministic, and fast enough to run on every ingested
    post synchronously, whereas an LLM call per post would be slow and
    costly at any real volume (the spec explicitly calls this out:
    "Do not call an arbitrary LLM for every post if a local model can
    handle the task efficiently").
  - it's tuned for short, informal social-media text (slang, emoji,
    intensifiers, negation) rather than long-form prose, which matches
    this domain better than a generic classifier.

The trade-off, stated plainly: VADER is a lexicon model, not a learned
one -- it has no domain adaptation for e.g. sarcasm or brand-specific
slang, and its accuracy on this kind of text tops out around what any
lexicon-based approach can do (~roughly comparable to human-rater
agreement on unambiguous text; not state-of-the-art on ambiguous text).
`score_text` is written as a single seam so swapping in a fine-tuned
transformer classifier later is a one-function change.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()

POSITIVE_THRESHOLD = 0.05
NEGATIVE_THRESHOLD = -0.05

# A sentiment-shift alert fires when the positive share drops by at
# least this many percentage points between the oldest and newest
# snapshot in the lookback window used by detect_shift().
SHIFT_ALERT_THRESHOLD_PCT_POINTS = 25.0


def score_text(text: str) -> tuple[float, str]:
    """
    Returns (compound_score in [-1, 1], label in {"positive","negative","neutral"}).
    Empty/whitespace-only text scores as neutral rather than raising, since
    collectors occasionally hand us posts with no body (e.g. an image-only
    post) and the pipeline should not fall over on that.
    """
    text = (text or "").strip()
    if not text:
        return 0.0, "neutral"

    compound = _analyzer.polarity_scores(text)["compound"]
    if compound >= POSITIVE_THRESHOLD:
        label = "positive"
    elif compound <= NEGATIVE_THRESHOLD:
        label = "negative"
    else:
        label = "neutral"
    return compound, label


@dataclass
class SentimentBreakdown:
    positive_pct: float
    negative_pct: float
    neutral_pct: float
    sentiment_score: float  # mean compound score, -1..1
    sample_size: int


def aggregate_sentiment(scores: list[float]) -> SentimentBreakdown:
    """
    Turns a list of per-post compound scores into the positive/negative/
    neutral percentage breakdown the dashboard and "why trending" panel
    both display. Returns all-zero on an empty list rather than dividing
    by zero.
    """
    n = len(scores)
    if n == 0:
        return SentimentBreakdown(0.0, 0.0, 0.0, 0.0, 0)

    positive = sum(1 for s in scores if s >= POSITIVE_THRESHOLD)
    negative = sum(1 for s in scores if s <= NEGATIVE_THRESHOLD)
    neutral = n - positive - negative

    return SentimentBreakdown(
        positive_pct=round(100.0 * positive / n, 1),
        negative_pct=round(100.0 * negative / n, 1),
        neutral_pct=round(100.0 * neutral / n, 1),
        sentiment_score=round(sum(scores) / n, 4),
        sample_size=n,
    )


@dataclass
class SentimentShift:
    shift_detected: bool
    positive_pct_start: float
    positive_pct_end: float
    delta_pct_points: float
    window_hours: float
    reason: str | None = None


def detect_shift(snapshots: list[dict], window_hours: float = 24.0) -> SentimentShift:
    """
    Compares the oldest and newest TrendSnapshot within `window_hours` of
    the most recent snapshot and flags a shift when the positive-mention
    share dropped by more than SHIFT_ALERT_THRESHOLD_PCT_POINTS.

    `snapshots` must be a list of dicts with "timestamp" (datetime) and
    "positive_pct" (float), ordered oldest -> newest. This takes plain
    dicts rather than ORM objects so it's trivially unit-testable without
    a database.
    """
    if len(snapshots) < 2:
        return SentimentShift(False, 0.0, 0.0, 0.0, window_hours, reason="not enough snapshots")

    newest = snapshots[-1]
    cutoff = newest["timestamp"] - timedelta(hours=window_hours)
    windowed = [s for s in snapshots if s["timestamp"] >= cutoff]
    if len(windowed) < 2:
        windowed = snapshots[-2:]

    start, end = windowed[0], windowed[-1]
    delta = start["positive_pct"] - end["positive_pct"]
    shift = delta >= SHIFT_ALERT_THRESHOLD_PCT_POINTS

    return SentimentShift(
        shift_detected=shift,
        positive_pct_start=start["positive_pct"],
        positive_pct_end=end["positive_pct"],
        delta_pct_points=round(delta, 1),
        window_hours=window_hours,
    )
