"""
Cross-platform propagation analysis.

Computes, purely from each platform's *first-observed* mention
timestamp for a topic, the order platforms picked it up in and how much
each platform's volume grew after it entered. This is intentionally the
only signal used -- the spec is explicit that propagation paths must be
derived from real timestamps ("Do not invent propagation paths") and
that insufficient data must be reported as such rather than guessed at.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

MIN_PLATFORMS_FOR_PATH = 2


@dataclass
class PlatformObservation:
    platform: str
    first_seen_at: datetime
    mentions_in_first_hour: int
    mentions_total: int


@dataclass
class PropagationStep:
    platform: str
    sequence_order: int
    first_seen_at: datetime
    mentions_at_detection: int
    growth_since_entry_pct: float


@dataclass
class PropagationResult:
    established: bool
    steps: list[PropagationStep] = field(default_factory=list)
    reason: str | None = None


def analyze_propagation(observations: list[PlatformObservation]) -> PropagationResult:
    """
    `observations` should have one entry per platform that has carried
    this topic at all, with mentions_in_first_hour capturing how much
    volume it had shortly after first appearing there (used to compute
    growth-since-entry against mentions_total).
    """
    if len(observations) < MIN_PLATFORMS_FOR_PATH:
        return PropagationResult(
            established=False,
            reason="Propagation path cannot be established from available data.",
        )

    ordered = sorted(observations, key=lambda o: o.first_seen_at)
    steps = []
    for i, obs in enumerate(ordered, start=1):
        if obs.mentions_in_first_hour > 0:
            growth = round(
                ((obs.mentions_total - obs.mentions_in_first_hour) / obs.mentions_in_first_hour) * 100.0, 1
            )
        else:
            growth = 0.0
        steps.append(
            PropagationStep(
                platform=obs.platform,
                sequence_order=i,
                first_seen_at=obs.first_seen_at,
                mentions_at_detection=obs.mentions_in_first_hour,
                growth_since_entry_pct=growth,
            )
        )

    return PropagationResult(established=True, steps=steps)
