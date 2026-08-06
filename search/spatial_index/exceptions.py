"""Spatial Index exceptions."""

from __future__ import annotations


class SpatialIndexError(Exception):
    """Base error for Spatial Index."""


class InvalidSpatialDataset(SpatialIndexError):
    """PublishedDataset input is missing or invalid."""


class InvalidSpatialQuery(SpatialIndexError):
    """Spatial query input is missing or invalid."""


class SpatialIndexBuildFailure(SpatialIndexError):
    """Spatial index build/query failed unexpectedly."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
