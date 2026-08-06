"""Factory for Geometry Metrics Engine."""

from __future__ import annotations

from typing import Sequence

from .engine import DefaultGeometryMetricsEngine
from .providers import MetricProvider


def create_geometry_metrics_engine(
    *,
    providers: Sequence[MetricProvider] | None = None,
    weights: dict[str, float] | None = None,
) -> DefaultGeometryMetricsEngine:
    """Create DefaultGeometryMetricsEngine with optional providers/weights."""
    return DefaultGeometryMetricsEngine(providers=providers, weights=weights)
