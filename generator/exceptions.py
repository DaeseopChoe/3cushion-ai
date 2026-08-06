"""Generator Phase exceptions."""

from __future__ import annotations


class GeneratorError(Exception):
    """Base error for Dataset Generator Phase."""


class InvalidAuthoringStrategy(GeneratorError):
    """Authoring Strategy input is missing or invalid."""


class TrajectoryGenerationFailure(GeneratorError):
    """Trajectory Snapshot could not be produced."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
