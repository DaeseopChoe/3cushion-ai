"""
Fixture Authoring Strategy + Geometry consume port.

Geometry values stand in for Impact SSOT + buildTrajectory consume results.
They are not produced by reimplemented Formula/Builder inside Generator.
"""

from __future__ import annotations

from dataclasses import dataclass

from generator.strategy import AuthoringStrategy
from generator.trajectory_generator.geometry import GeometryConsumeResult
from generator.trajectory_generator.snapshot import TrajectorySnapshot
from models import EnvelopeRecord, Point, StrategyRef

# Stable fixture identity for Generator Phase tests / Sampler handoff.
FIXTURE_STRATEGY_REF = StrategyRef("fixture.five_half.s1")


def make_fixture_strategy() -> AuthoringStrategy:
    """
    One Authoring Strategy fixture.

    Coordinates are in table Rg space (illustrative, consume-equivalent).
    """
    return AuthoringStrategy(
        strategy_ref=FIXTURE_STRATEGY_REF,
        cue=Point(x=20.0, y=10.0),
        target=Point(x=40.0, y=20.0),
        second=Point(x=60.0, y=15.0),
    )


def make_fixture_geometry_result(
    strategy: AuthoringStrategy | None = None,
) -> GeometryConsumeResult:
    """
    Pre-resolved geometry for the fixture Strategy.

    Represents consume-only output of Impact + buildTrajectory:
    - cue_trajectory: Cue → Impact
    - line_of_score: C3 → C4 → C5 (last scoring cushion = C5)
    Extension is not included.
    """
    s = strategy or make_fixture_strategy()
    cue = s.cue
    impact = Point(x=35.0, y=18.0)
    c3 = Point(x=50.0, y=0.0)
    c4 = Point(x=80.0, y=20.0)
    c5 = Point(x=40.0, y=40.0)  # last scoring cushion

    # Intermediate points on Cue→Impact (Sampler will later take ≤ 1/3).
    mid = Point(
        x=(cue.x + impact.x) / 2.0,
        y=(cue.y + impact.y) / 2.0,
    )
    return GeometryConsumeResult(
        cue=cue,
        impact=impact,
        cue_trajectory=(cue, mid, impact),
        c3=c3,
        last_scoring_cushion=c5,
        line_of_score=(c3, c4, c5),
    )


@dataclass(frozen=True)
class FixtureGeometryPort:
    """
    GeometryConsumePort backed by fixture consume results.

    Does not call Formula/Builder — supplies fixed Impact/trajectory data
    equivalent to a successful consume of existing SSOT.
    """

    result: GeometryConsumeResult | None = None

    def consume(self, strategy: AuthoringStrategy) -> GeometryConsumeResult:
        if strategy.strategy_ref != FIXTURE_STRATEGY_REF:
            # Still allow generation when caller supplies matching fixture result.
            base = self.result or make_fixture_geometry_result(strategy)
            return GeometryConsumeResult(
                cue=strategy.cue,
                impact=base.impact,
                cue_trajectory=(
                    strategy.cue,
                    *base.cue_trajectory[1:-1],
                    base.impact,
                )
                if len(base.cue_trajectory) >= 2
                else (strategy.cue, base.impact),
                c3=base.c3,
                last_scoring_cushion=base.last_scoring_cushion,
                line_of_score=base.line_of_score,
            )
        return self.result or make_fixture_geometry_result(strategy)


def make_fixture_snapshot() -> TrajectorySnapshot:
    """
    TrajectorySnapshot fixture for Cue / Second Sampler tests.

    Built from fixture geometry consume result (Mission 29 handoff shape).
    cue_trajectory length is long enough for multi-step SP-C sampling.
    """
    strategy = make_fixture_strategy()
    # Straight Cue→Impact spanning 18 grid units so L/3 = 6 (> 1.5 step).
    cue = strategy.cue
    impact = Point(x=cue.x + 18.0, y=cue.y)
    mid = Point(x=cue.x + 9.0, y=cue.y)
    c3 = Point(x=50.0, y=0.0)
    c4 = Point(x=80.0, y=20.0)
    c5 = Point(x=40.0, y=40.0)
    return TrajectorySnapshot(
        strategy_ref=strategy.strategy_ref,
        cue_trajectory=(cue, mid, impact),
        line_of_score=(c3, c4, c5),
        impact=impact,
        c3=c3,
        last_scoring_cushion=c5,
    )


def make_fixture_record() -> EnvelopeRecord:
    """
    One validated-shape EnvelopeRecord fixture for corpus assembly tests.

    The record mirrors the single-strategy generator path and remains free of
    Modal, Strategy body, Geometry raw, and Cartesian fields.
    """
    return EnvelopeRecord(
        strategy_ref=FIXTURE_STRATEGY_REF,
        target=Point(x=40.0, y=20.0),
        cue_set=[
            Point(x=20.0, y=10.0),
            Point(x=21.5, y=10.0),
            Point(x=23.0, y=10.0),
            Point(x=24.5, y=10.0),
            Point(x=26.0, y=10.0),
        ],
        second_set=[
            Point(x=50.0, y=0.0),
            Point(x=51.2480754415, y=0.8320502943),
            Point(x=52.4961508830, y=1.6641005887),
            Point(x=53.7442263245, y=2.4961508830),
        ],
    )


def make_fixture_corpus() -> list[EnvelopeRecord]:
    """Fixture corpus for PublishedDatasetBuilder full-regenerate tests."""
    return [make_fixture_record()]
