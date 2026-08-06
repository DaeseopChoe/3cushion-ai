"""Trajectory Generator exceptions."""

from __future__ import annotations

from generator.exceptions import GeneratorError, TrajectoryGenerationFailure


class TrajectoryGeneratorError(GeneratorError):
    """Base error for Trajectory Generator."""


class InvalidGeometryConsume(TrajectoryGeneratorError, TrajectoryGenerationFailure):
    """Geometry consume result is missing or invalid."""


class GeometryConsumeFailure(TrajectoryGeneratorError, TrajectoryGenerationFailure):
    """Geometry consume port failed."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause


class InvalidTrajectorySnapshot(TrajectoryGeneratorError, TrajectoryGenerationFailure):
    """Snapshot assembly failed Architecture / integrity checks."""
