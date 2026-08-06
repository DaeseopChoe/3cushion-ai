"""Geometry Metrics Engine exceptions."""

from __future__ import annotations


class GeometryMetricsError(Exception):
    """Base error for Geometry Metrics Engine."""


class InvalidGeometryMetricsInput(GeometryMetricsError):
    """Geometry metrics input is missing or invalid."""


class GeometryMetricsFailure(GeometryMetricsError):
    """Geometry metrics evaluation failed unexpectedly."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
