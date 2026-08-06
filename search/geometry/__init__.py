"""
Geometry Metrics Engine — search quality Metric Producer.

Produces geometry metrics only.
Does not generate trajectories or modify Generator / Dataset.
"""

from .contract import GEOMETRY_METRICS_ENGINE_ID
from .engine import DefaultGeometryMetricsEngine
from .exceptions import (
    GeometryMetricsError,
    GeometryMetricsFailure,
    InvalidGeometryMetricsInput,
)
from .factory import create_geometry_metrics_engine
from .models import (
    GeometryEvaluatedCandidate,
    GeometryMetric,
    GeometrySearchQuery,
    MetricDetail,
)
from .providers import (
    AngleMetricProvider,
    DistanceMetricProvider,
    ErrorMetricProvider,
    MetricProvider,
    SimilarityMetricProvider,
)

__all__ = [
    "AngleMetricProvider",
    "DefaultGeometryMetricsEngine",
    "DistanceMetricProvider",
    "ErrorMetricProvider",
    "GEOMETRY_METRICS_ENGINE_ID",
    "GeometryEvaluatedCandidate",
    "GeometryMetric",
    "GeometryMetricsError",
    "GeometryMetricsFailure",
    "GeometrySearchQuery",
    "InvalidGeometryMetricsInput",
    "MetricDetail",
    "MetricProvider",
    "SimilarityMetricProvider",
    "create_geometry_metrics_engine",
]
