"""Envelope Builder protocols."""

from __future__ import annotations

from typing import Protocol

from generator.cue_sampler.result import CueSetResult
from generator.second_sampler.result import SecondSetResult
from generator.strategy import AuthoringStrategy
from generator.trajectory_generator.snapshot import TrajectorySnapshot
from models import EnvelopeRecord


class EnvelopeBuilder(Protocol):
    """
    Assemble EnvelopeRecord from Strategy + Snapshot + cueSet + secondSet.

    Sampling / Geometry / Dataset corpus emit are out of scope.
    """

    def build(
        self,
        strategy: AuthoringStrategy,
        snapshot: TrajectorySnapshot,
        cue: CueSetResult,
        second: SecondSetResult,
    ) -> EnvelopeRecord:
        ...
