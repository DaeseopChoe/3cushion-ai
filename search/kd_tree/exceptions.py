"""KDTree exceptions."""

from __future__ import annotations


class KDTreeError(Exception):
    """Base error for KDTree layer."""


class InvalidKDTreeDataset(KDTreeError):
    """PublishedDataset input is missing or invalid."""


class InvalidKDTreeCandidate(KDTreeError):
    """Candidate id scope is missing or invalid."""


class InvalidKDTreeQuery(KDTreeError):
    """KDTree query input is missing or invalid."""


class KDTreeBuildFailure(KDTreeError):
    """KDTree build/query failed unexpectedly."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
