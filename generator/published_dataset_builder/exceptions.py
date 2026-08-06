"""Published Dataset Builder exceptions."""

from __future__ import annotations

from generator.exceptions import GeneratorError


class PublishedDatasetBuilderError(GeneratorError):
    """Base error for Published Dataset Builder."""


class InvalidPublishedDatasetInput(PublishedDatasetBuilderError):
    """Corpus input is missing, inconsistent, or unsupported."""


class PublishedDatasetAssemblyFailure(PublishedDatasetBuilderError):
    """PublishedDataset assembly or Validation failed."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
