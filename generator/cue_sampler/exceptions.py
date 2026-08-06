"""Cue Sampler exceptions."""

from __future__ import annotations

from generator.exceptions import GeneratorError


class CueSamplerError(GeneratorError):
    """Base error for Cue Sampler."""


class InvalidCueSnapshot(CueSamplerError):
    """TrajectorySnapshot input is missing or unusable for Cue Sampling."""


class CueSamplingFailure(CueSamplerError):
    """Cue Sampling Policy execution failed."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
