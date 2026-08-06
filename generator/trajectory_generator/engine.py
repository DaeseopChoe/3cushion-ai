"""
Default Trajectory Generator.

Assembles Trajectory Snapshot from GeometryConsumePort.
Does not sample, does not write Dataset, does not modify Strategy.
"""

from __future__ import annotations

from generator.exceptions import InvalidAuthoringStrategy
from generator.strategy import AuthoringStrategy
from models import Point, StrategyRef

from .exceptions import (
    GeometryConsumeFailure,
    InvalidGeometryConsume,
    InvalidTrajectorySnapshot,
)
from .geometry import GeometryConsumeResult
from .interfaces import GeometryConsumePort
from .snapshot import TrajectorySnapshot

_EPS = 1e-9


def _points_close(a: Point, b: Point, *, eps: float = _EPS) -> bool:
    return abs(a.x - b.x) <= eps and abs(a.y - b.y) <= eps


def _validate_strategy(strategy: AuthoringStrategy) -> None:
    if strategy is None:
        raise InvalidAuthoringStrategy("AuthoringStrategy is required")
    if not isinstance(strategy, AuthoringStrategy):
        raise InvalidAuthoringStrategy("strategy must be an AuthoringStrategy")
    if strategy.strategy_ref is None or strategy.strategy_ref == "":
        raise InvalidAuthoringStrategy("strategy_ref is empty")
    if strategy.cue is None or strategy.target is None:
        raise InvalidAuthoringStrategy("cue and target are required")


def _validate_consume(result: GeometryConsumeResult) -> None:
    if result is None or not isinstance(result, GeometryConsumeResult):
        raise InvalidGeometryConsume("GeometryConsumeResult is required")
    if not result.cue_trajectory:
        raise InvalidGeometryConsume("cue_trajectory must be non-empty")
    if not result.line_of_score:
        raise InvalidGeometryConsume("line_of_score must be non-empty")
    if result.impact is None or result.c3 is None or result.last_scoring_cushion is None:
        raise InvalidGeometryConsume("impact, c3, and last_scoring_cushion are required")

    if not _points_close(result.cue_trajectory[0], result.cue):
        raise InvalidGeometryConsume("cue_trajectory must start at cue")
    if not _points_close(result.cue_trajectory[-1], result.impact):
        raise InvalidGeometryConsume("cue_trajectory must end at impact")
    if not _points_close(result.line_of_score[0], result.c3):
        raise InvalidGeometryConsume("line_of_score must start at C3")
    if not _points_close(result.line_of_score[-1], result.last_scoring_cushion):
        raise InvalidGeometryConsume(
            "line_of_score must end at last scoring cushion"
        )


class DefaultTrajectoryGenerator:
    """Concrete TrajectoryGenerator — assemble Snapshot from consume port."""

    def __init__(self, geometry: GeometryConsumePort) -> None:
        if geometry is None:
            raise InvalidGeometryConsume("GeometryConsumePort is required")
        self._geometry = geometry

    def generate(self, strategy: AuthoringStrategy) -> TrajectorySnapshot:
        _validate_strategy(strategy)

        try:
            consumed = self._geometry.consume(strategy)
        except (InvalidGeometryConsume, InvalidAuthoringStrategy):
            raise
        except Exception as exc:  # noqa: BLE001
            raise GeometryConsumeFailure(str(exc), cause=exc) from exc

        _validate_consume(consumed)

        try:
            snapshot = TrajectorySnapshot(
                strategy_ref=StrategyRef(strategy.strategy_ref),
                cue_trajectory=tuple(consumed.cue_trajectory),
                line_of_score=tuple(consumed.line_of_score),
                impact=consumed.impact,
                c3=consumed.c3,
                last_scoring_cushion=consumed.last_scoring_cushion,
            )
        except Exception as exc:  # noqa: BLE001
            raise InvalidTrajectorySnapshot(str(exc)) from exc

        if snapshot.strategy_ref != strategy.strategy_ref:
            raise InvalidTrajectorySnapshot("strategy_ref mismatch")

        return snapshot
