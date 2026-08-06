"""
Default Second Sampler — TrajectorySnapshot → secondSet.

Consumes line_of_score only. Does not modify Snapshot.
Independent of Cue Sampler. Does not read Cue-axis Snapshot fields.
"""

from __future__ import annotations

from generator.trajectory_generator.snapshot import TrajectorySnapshot
from models import StrategyRef

from .exceptions import InvalidSecondSnapshot, SecondSamplingFailure
from .result import SecondSetResult
from .sampling import sample_second_segment


class DefaultSecondSampler:
    """Concrete SecondSampler executing SP-S-01…06."""

    def sample(self, snapshot: TrajectorySnapshot) -> SecondSetResult:
        if snapshot is None:
            raise InvalidSecondSnapshot("TrajectorySnapshot is required")
        if not isinstance(snapshot, TrajectorySnapshot):
            raise InvalidSecondSnapshot("snapshot must be a TrajectorySnapshot")
        if snapshot.strategy_ref is None or snapshot.strategy_ref == "":
            raise InvalidSecondSnapshot("strategy_ref is empty")
        if not snapshot.line_of_score or len(snapshot.line_of_score) < 2:
            raise InvalidSecondSnapshot("line_of_score must have at least 2 points")

        try:
            second_set = sample_second_segment(snapshot.line_of_score)
        except InvalidSecondSnapshot:
            raise
        except Exception as exc:  # noqa: BLE001
            raise SecondSamplingFailure(str(exc), cause=exc) from exc

        if not second_set:
            raise SecondSamplingFailure("secondSet must be non-empty (SP-S-06)")

        return SecondSetResult(
            strategy_ref=StrategyRef(snapshot.strategy_ref),
            second_set=second_set,
        )
