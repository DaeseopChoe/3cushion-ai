"""Second Sampler protocols."""

from __future__ import annotations

from typing import Protocol

from generator.trajectory_generator.snapshot import TrajectorySnapshot

from .result import SecondSetResult


class SecondSampler(Protocol):
    """TrajectorySnapshot → secondSet (SP-S-01…06)."""

    def sample(self, snapshot: TrajectorySnapshot) -> SecondSetResult:
        ...
