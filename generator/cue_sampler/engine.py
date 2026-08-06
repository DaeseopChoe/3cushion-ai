"""
Default Cue Sampler — TrajectorySnapshot → cueSet.

Consumes cue_trajectory only. Does not modify Snapshot.
Does not read Second-axis Snapshot fields.
"""

from __future__ import annotations

from generator.trajectory_generator.snapshot import TrajectorySnapshot
from models import StrategyRef

from .exceptions import CueSamplingFailure, InvalidCueSnapshot
from .result import CueSetResult
from .sampling import sample_cue_segment


class DefaultCueSampler:
    """Concrete CueSampler executing SP-C-01…05."""

    def sample(self, snapshot: TrajectorySnapshot) -> CueSetResult:
        if snapshot is None:
            raise InvalidCueSnapshot("TrajectorySnapshot is required")
        if not isinstance(snapshot, TrajectorySnapshot):
            raise InvalidCueSnapshot("snapshot must be a TrajectorySnapshot")
        if snapshot.strategy_ref is None or snapshot.strategy_ref == "":
            raise InvalidCueSnapshot("strategy_ref is empty")
        if not snapshot.cue_trajectory or len(snapshot.cue_trajectory) < 2:
            raise InvalidCueSnapshot("cue_trajectory must have at least 2 points")

        try:
            cue_set = sample_cue_segment(snapshot.cue_trajectory)
        except InvalidCueSnapshot:
            raise
        except Exception as exc:  # noqa: BLE001
            raise CueSamplingFailure(str(exc), cause=exc) from exc

        if not cue_set:
            raise CueSamplingFailure("cueSet must be non-empty (SP-C-05)")

        return CueSetResult(
            strategy_ref=StrategyRef(snapshot.strategy_ref),
            cue_set=cue_set,
        )
