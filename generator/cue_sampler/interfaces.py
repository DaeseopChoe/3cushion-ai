"""Cue Sampler protocols."""

from __future__ import annotations

from typing import Protocol

from generator.trajectory_generator.snapshot import TrajectorySnapshot

from .result import CueSetResult


class CueSampler(Protocol):
    """TrajectorySnapshot → cueSet (SP-C-01…05)."""

    def sample(self, snapshot: TrajectorySnapshot) -> CueSetResult:
        ...
