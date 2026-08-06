"""Geometry Metrics Engine models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Tuple

from models import Point, RecordIdentity, StrategyRef
from search.interpolation.models import RefinedCandidate


@dataclass(frozen=True)
class GeometrySearchQuery:
    """Search query coordinates for Geometry Metrics (cue / target / second)."""

    cue: Point
    target: Point
    second: Point


@dataclass(frozen=True)
class GeometryMetric:
    """One independent geometry quality metric."""

    metric_id: str
    value: float
    detail: Mapping[str, float]


@dataclass(frozen=True)
class MetricDetail:
    """
    Aggregated geometry metric breakdown.

    Extensible: additional Metric Providers may add keys without
    changing GeometryEvaluatedCandidate shape.
    """

    engine_id: str
    components: Mapping[str, float]
    total: float
    metrics: Tuple[GeometryMetric, ...]


@dataclass(frozen=True)
class GeometryEvaluatedCandidate:
    """RefinedCandidate after Geometry Metrics evaluation."""

    candidate_id: RecordIdentity
    strategy_ref: StrategyRef
    geometry_score: float
    metric_detail: MetricDetail
    refined: RefinedCandidate
