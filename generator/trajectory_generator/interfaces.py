"""Trajectory Generator protocols."""

from __future__ import annotations

from typing import Protocol

from generator.strategy import AuthoringStrategy

from .geometry import GeometryConsumeResult
from .snapshot import TrajectorySnapshot


class GeometryConsumePort(Protocol):
    """
    Port that supplies Impact SSOT + buildTrajectory results.

    Implementations must call existing geometry SSOT (or fixture equivalents).
    Must not reimplement Formula / Builder / Reflection / Display Cap / Extension.
    """

    def consume(self, strategy: AuthoringStrategy) -> GeometryConsumeResult:
        """Resolve geometry for Strategy (read-only Authoring)."""
        ...


class TrajectoryGenerator(Protocol):
    """Strategy (Authoring) → Trajectory Snapshot."""

    def generate(self, strategy: AuthoringStrategy) -> TrajectorySnapshot:
        ...
