"""Second Sampler exceptions."""

from __future__ import annotations

from generator.exceptions import GeneratorError


class SecondSamplerError(GeneratorError):
    """Base error for Second Sampler."""


class InvalidSecondSnapshot(SecondSamplerError):
    """TrajectorySnapshot input is missing or unusable for Second Sampling."""


class SecondSamplingFailure(SecondSamplerError):
    """Second Sampling Policy execution failed."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
