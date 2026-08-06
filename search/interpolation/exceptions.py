"""Interpolation Engine exceptions."""

from __future__ import annotations


class InterpolationError(Exception):
    """Base error for Interpolation Engine."""


class InvalidInterpolationInput(InterpolationError):
    """Interpolation input is missing or invalid."""


class InterpolationFailure(InterpolationError):
    """Interpolation failed unexpectedly."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
