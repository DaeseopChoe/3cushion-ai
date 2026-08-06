"""
Independent Geometry Metric Providers.

Each provider computes one quality metric.
Providers do not generate trajectories, path nodes, or samples.
"""

from __future__ import annotations

import math
from typing import Protocol, runtime_checkable

from models import Point
from search.interpolation.models import RefinedCandidate

from .contract import TABLE_DIAGONAL
from .models import GeometryMetric, GeometrySearchQuery


def _distance(a: Point, b: Point) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


@runtime_checkable
class MetricProvider(Protocol):
    """Independent metric producer. Engine aggregates provider outputs."""

    metric_id: str

    def evaluate(
        self,
        query: GeometrySearchQuery,
        refined: RefinedCandidate,
    ) -> GeometryMetric:
        ...


class DistanceMetricProvider:
    """Distance quality from cue/target/second pairwise distances."""

    metric_id = "distance"

    def evaluate(
        self,
        query: GeometrySearchQuery,
        refined: RefinedCandidate,
    ) -> GeometryMetric:
        d_ct = _distance(query.cue, query.target)
        d_ts = _distance(query.target, query.second)
        d_cs = _distance(query.cue, query.second)
        mean = (d_ct + d_ts + d_cs) / 3.0
        # Closer, well-spread configurations score higher when normalized.
        value = _clamp01(1.0 - (mean / TABLE_DIAGONAL))
        return GeometryMetric(
            metric_id=self.metric_id,
            value=value,
            detail={
                "cue_target": d_ct,
                "target_second": d_ts,
                "cue_second": d_cs,
                "mean_distance": mean,
            },
        )


class AngleMetricProvider:
    """Angle quality at target between cue and second vectors."""

    metric_id = "angle"

    def evaluate(
        self,
        query: GeometrySearchQuery,
        refined: RefinedCandidate,
    ) -> GeometryMetric:
        vx = query.cue.x - query.target.x
        vy = query.cue.y - query.target.y
        wx = query.second.x - query.target.x
        wy = query.second.y - query.target.y
        norm_v = math.hypot(vx, vy)
        norm_w = math.hypot(wx, wy)
        if norm_v == 0.0 or norm_w == 0.0:
            angle = 0.0
            value = 0.0
        else:
            cos = max(-1.0, min(1.0, (vx * wx + vy * wy) / (norm_v * norm_w)))
            angle = math.acos(cos)
            # Prefer non-degenerate angles near 90° for baseline quality.
            value = _clamp01(1.0 - abs(angle - (math.pi / 2.0)) / (math.pi / 2.0))
        return GeometryMetric(
            metric_id=self.metric_id,
            value=value,
            detail={
                "angle_radians": angle,
                "angle_degrees": math.degrees(angle),
            },
        )


class SimilarityMetricProvider:
    """Similarity quality from refined ranking score (candidate-sensitive)."""

    metric_id = "similarity"

    def evaluate(
        self,
        query: GeometrySearchQuery,
        refined: RefinedCandidate,
    ) -> GeometryMetric:
        # Membership-flags max score is 3.0 in Ranking baseline.
        base = float(refined.refined_score)
        value = _clamp01(base / 3.0)
        return GeometryMetric(
            metric_id=self.metric_id,
            value=value,
            detail={
                "refined_score": base,
                "ranking_score": float(refined.score),
            },
        )


class ErrorMetricProvider:
    """Error / degeneracy metric from triangle inequality slack."""

    metric_id = "error"

    def evaluate(
        self,
        query: GeometrySearchQuery,
        refined: RefinedCandidate,
    ) -> GeometryMetric:
        a = _distance(query.cue, query.target)
        b = _distance(query.target, query.second)
        c = _distance(query.cue, query.second)
        sides = sorted((a, b, c))
        slack = sides[0] + sides[1] - sides[2]
        # Larger positive slack → lower degeneracy → higher quality.
        error = max(0.0, -slack)
        value = _clamp01(1.0 - (error / TABLE_DIAGONAL))
        if slack >= 0.0:
            value = _clamp01(slack / (sides[2] + 1e-12))
        return GeometryMetric(
            metric_id=self.metric_id,
            value=value,
            detail={
                "triangle_slack": slack,
                "degeneracy_error": error,
                "side_a": a,
                "side_b": b,
                "side_c": c,
            },
        )


DEFAULT_METRIC_PROVIDERS: tuple[MetricProvider, ...] = (
    DistanceMetricProvider(),
    AngleMetricProvider(),
    SimilarityMetricProvider(),
    ErrorMetricProvider(),
)
