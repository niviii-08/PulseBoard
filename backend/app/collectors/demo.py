"""
Deterministic-shape demo data generator.

Per the spec's Section 21 ("Do not generate random numbers
independently... the data should have realistic relationships"), this
does not emit independent random posts. It scripts a small number of
named scenarios, each a causal timeline: a topic is first observed on
one platform, then (after a realistic lag) accelerates on a second, then
picks up news coverage, then YouTube commentary -- with volume and
sentiment moving together the way a real story would. This is what lets
the propagation engine show a real, non-trivial Reddit -> X -> News ->
YouTube path and the risk engine show a real negative-sentiment brand
crisis, entirely offline.

Every post this module produces has source_is_demo=True set by the
caller (app/tasks/ingestion_tasks.py), and the frontend is expected to
render a "Demo data" badge wherever these are shown -- see Section 21's
"Clearly label demo/simulated data in the UI."
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.collectors.base import CollectorStatus, NormalizedPost


@dataclass
class DemoPost(NormalizedPost):
    topic_name: str = ""
    brand_name: str | None = None


@dataclass
class TimelineStep:
    platform: str
    hours_after_start: float
    post_count: int
    sentiment_center: float   # -1..1
    sentiment_spread: float   # random jitter around center
    engagement_range: tuple[int, int]
    texts: list[str]


@dataclass
class Scenario:
    topic_name: str
    topic_keywords: list[str]
    brand_name: str | None
    description: str
    steps: list[TimelineStep]


def _step_texts_launch() -> list[str]:
    return [
        "Just unboxed the new device, battery seems to drain fast already",
        "Anyone else noticing the battery drops overnight on the new model?",
        "Battery life on this thing is way worse than advertised",
        "Support says it's a software issue, patch coming next week",
        "Returned mine, battery was unusable by day 3",
    ]


def _step_texts_positive() -> list[str]:
    return [
        "This new release is genuinely impressive, best upgrade in years",
        "Really happy with the new features, worth the wait",
        "The reviews were right, this is a huge step up",
        "Great first impressions after a week of daily use",
    ]


def _step_texts_crisis() -> list[str]:
    return [
        "My order has been delayed 9 days with zero updates from support",
        "Customer service has ignored three emails about my refund",
        "Delivery delay again, this is the second time this month",
        "Asked for a refund two weeks ago, still nothing, ridiculous",
        "The delivery tracking hasn't moved in a week, no response from support",
    ]


def default_scenarios() -> list[Scenario]:
    """
    Two scenarios: a mixed-sentiment product launch that propagates
    Reddit -> X -> News -> YouTube (demonstrates FEATURE 1/2/4), and a
    brand-crisis complaint spiral confined mostly to Reddit/X (demonstrates
    FEATURE 3/5). `hours_after_start` is negative-past, i.e. how many
    hours before "now" that step happened -- the generator anchors the
    whole scenario so its most recent step lands a few hours before now.
    """
    launch = Scenario(
        topic_name="iPhone 18 Battery Issue",
        topic_keywords=["iphone", "battery", "drain", "device"],
        brand_name="Apple",
        description="Product launch battery complaint that spreads across platforms",
        steps=[
            TimelineStep("reddit", 30.0, 6, -0.2, 0.3, (5, 40), _step_texts_launch()),
            TimelineStep("reddit", 24.0, 14, -0.3, 0.3, (10, 80), _step_texts_launch()),
            TimelineStep("x", 22.0, 22, -0.35, 0.3, (20, 400), _step_texts_launch()),
            TimelineStep("x", 16.0, 40, -0.3, 0.35, (30, 900), _step_texts_launch()),
            TimelineStep("news", 12.0, 5, -0.15, 0.2, (100, 2000), _step_texts_launch()),
            TimelineStep("youtube", 8.0, 8, -0.1, 0.3, (50, 1500), _step_texts_launch()),
            TimelineStep("youtube", 3.0, 12, 0.05, 0.3, (50, 1500), _step_texts_positive() + _step_texts_launch()),
            # A near-real-time burst anchored close to generation time, not
            # a fixed lag -- so /trends/emerging shows this topic as
            # actively trending (nonzero current-hour volume, positive
            # growth) whenever the demo is seeded, rather than only in the
            # first few minutes after a seed run.
            TimelineStep("x", 0.4, 18, -0.25, 0.3, (30, 700), _step_texts_launch()),
        ],
    )

    crisis = Scenario(
        topic_name="Nike Delivery Delays",
        topic_keywords=["nike", "delivery", "refund", "support"],
        brand_name="Nike",
        description="Escalating brand-crisis complaint cluster, mostly Reddit/X",
        steps=[
            TimelineStep("x", 20.0, 8, -0.4, 0.2, (5, 60), _step_texts_crisis()),
            TimelineStep("x", 14.0, 26, -0.55, 0.2, (10, 150), _step_texts_crisis()),
            TimelineStep("reddit", 12.0, 10, -0.5, 0.2, (5, 90), _step_texts_crisis()),
            TimelineStep("x", 6.0, 45, -0.6, 0.2, (20, 500), _step_texts_crisis()),
            TimelineStep("news", 3.0, 3, -0.3, 0.2, (100, 1200), _step_texts_crisis()),
            # Near-real-time burst -- see the matching comment on `launch`.
            TimelineStep("x", 0.4, 20, -0.6, 0.2, (20, 600), _step_texts_crisis()),
        ],
    )

    calm = Scenario(
        topic_name="Quantum Computing Breakthrough",
        topic_keywords=["quantum", "computing", "research", "breakthrough"],
        brand_name=None,
        description="Steady, low-volume baseline topic (control group -- should NOT trigger alerts)",
        steps=[
            TimelineStep("reddit", 40.0, 3, 0.2, 0.2, (5, 30), _step_texts_positive()),
            TimelineStep("news", 20.0, 2, 0.15, 0.2, (50, 300), _step_texts_positive()),
            TimelineStep("reddit", 4.0, 3, 0.1, 0.2, (5, 30), _step_texts_positive()),
        ],
    )

    return [launch, crisis, calm]


class DemoCollector:
    """Not a BaseCollector subclass: demo generation produces whole scripted
    scenarios rather than answering a single query, so it exposes
    generate_all() instead of collect(). Kept in the same package because
    it's still a "source" from the /sources status page's point of view."""

    platform = "demo"
    status = CollectorStatus.DEMO

    def __init__(self, seed: int = 42):
        self._rng = random.Random(seed)

    def generate_all(self, now: datetime | None = None) -> list[DemoPost]:
        now = now or datetime.now(timezone.utc)
        posts: list[DemoPost] = []
        for scenario in default_scenarios():
            for step in scenario.steps:
                base_time = now - timedelta(hours=step.hours_after_start)
                for i in range(step.post_count):
                    sentiment = max(-1.0, min(1.0, self._rng.gauss(step.sentiment_center, step.sentiment_spread)))
                    jitter = timedelta(minutes=self._rng.uniform(0, 55))
                    text = self._rng.choice(step.texts)
                    posts.append(
                        DemoPost(
                            platform=step.platform,
                            external_id=None,
                            author=f"user_{self._rng.randint(1000, 9999)}",
                            text=text,
                            url=None,
                            published_at=base_time + jitter,
                            engagement_count=self._rng.randint(*step.engagement_range),
                            topic_name=scenario.topic_name,
                            brand_name=scenario.brand_name,
                        )
                    )
        return posts

    def scenarios(self) -> list[Scenario]:
        return default_scenarios()
