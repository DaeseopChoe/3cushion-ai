"""
Default Envelope Builder — assemble EnvelopeRecord + Validation gate.

Does not sample. Does not emit Published Dataset corpus.
Does not store Modal / Strategy body / Geometry raw / Cartesian pairs.
"""

from __future__ import annotations

from typing import List

from generator.cue_sampler.result import CueSetResult
from generator.second_sampler.result import SecondSetResult
from generator.strategy import AuthoringStrategy
from generator.trajectory_generator.snapshot import TrajectorySnapshot
from models import EnvelopeRecord, Point, StrategyRef
from validation import ValidationFailed, validate_dataset

from .exceptions import EnvelopeAssemblyFailure, InvalidEnvelopeInput
from .serialize import dataset_wrapper_for_record, envelope_record_to_json


def _require_points(name: str, points: object) -> List[Point]:
    if points is None:
        raise InvalidEnvelopeInput(f"{name} is required")
    seq = list(points)  # type: ignore[arg-type]
    if len(seq) < 1:
        raise InvalidEnvelopeInput(f"{name} must be non-empty")
    for p in seq:
        if not isinstance(p, Point):
            raise InvalidEnvelopeInput(f"{name} must contain Point values")
    return seq


class DefaultEnvelopeBuilder:
    """Concrete EnvelopeBuilder — Record Assembly + Validation Layer."""

    def build(
        self,
        strategy: AuthoringStrategy,
        snapshot: TrajectorySnapshot,
        cue: CueSetResult,
        second: SecondSetResult,
    ) -> EnvelopeRecord:
        if strategy is None or not isinstance(strategy, AuthoringStrategy):
            raise InvalidEnvelopeInput("AuthoringStrategy is required")
        if snapshot is None or not isinstance(snapshot, TrajectorySnapshot):
            raise InvalidEnvelopeInput("TrajectorySnapshot is required")
        if cue is None or not isinstance(cue, CueSetResult):
            raise InvalidEnvelopeInput("CueSetResult is required")
        if second is None or not isinstance(second, SecondSetResult):
            raise InvalidEnvelopeInput("SecondSetResult is required")

        if strategy.strategy_ref is None or strategy.strategy_ref == "":
            raise InvalidEnvelopeInput("strategy_ref is empty")
        if strategy.target is None:
            raise InvalidEnvelopeInput("Authoring target is required")

        # Identity consistency (Strategy : Snapshot : Samplers)
        refs = (
            strategy.strategy_ref,
            snapshot.strategy_ref,
            cue.strategy_ref,
            second.strategy_ref,
        )
        if len(set(refs)) != 1:
            raise InvalidEnvelopeInput(
                "strategy_ref mismatch across Strategy / Snapshot / Samplers"
            )

        cue_set = _require_points("cueSet", cue.cue_set)
        second_set = _require_points("secondSet", second.second_set)

        # Assembly only — Authoring target copy; Sampler outputs as-is (SP-T / SP-C / SP-S)
        record_json = envelope_record_to_json(
            strategy_ref=str(strategy.strategy_ref),
            target=strategy.target,
            cue_set=cue_set,
            second_set=second_set,
        )

        try:
            validate_dataset(dataset_wrapper_for_record(record_json))
        except ValidationFailed as exc:
            raise EnvelopeAssemblyFailure(
                f"EnvelopeRecord Validation failed: {exc}",
                cause=exc,
            ) from exc
        except Exception as exc:  # noqa: BLE001
            raise EnvelopeAssemblyFailure(str(exc), cause=exc) from exc

        return EnvelopeRecord(
            strategy_ref=StrategyRef(strategy.strategy_ref),
            target=strategy.target,
            cue_set=list(cue_set),
            second_set=list(second_set),
        )
