"""Envelope Builder exceptions."""

from __future__ import annotations

from generator.exceptions import GeneratorError


class EnvelopeBuilderError(GeneratorError):
    """Base error for Envelope Builder."""


class InvalidEnvelopeInput(EnvelopeBuilderError):
    """Assembly inputs are missing, inconsistent, or unusable."""


class EnvelopeAssemblyFailure(EnvelopeBuilderError):
    """EnvelopeRecord assembly or Validation failed."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
