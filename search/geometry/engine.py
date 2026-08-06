"""
Geometry Metrics Engine — Metric Producer Layer.

RefinedCandidate[] + GeometrySearchQuery → GeometryEvaluatedCandidate[]

Does not generate trajectories, path nodes, or samples.
Does not mutate Dataset corpus, Ranking, or Interpolation contracts.
Does not call Generator.
"""

from __future__ import annotations

from typing import List, Sequence

from search.interpolation.models import RefinedCandidate

from .contract import (
    GEOMETRY_METRICS_ENGINE_ID,
    WEIGHT_ANGLE,
    WEIGHT_DISTANCE,
    WEIGHT_ERROR,
    WEIGHT_SIMILARITY,
)
from .exceptions import GeometryMetricsFailure, InvalidGeometryMetricsInput
from .models import (
    GeometryEvaluatedCandidate,
    GeometryMetric,
    GeometrySearchQuery,
    MetricDetail,
)
from .providers import DEFAULT_METRIC_PROVIDERS, MetricProvider


_DEFAULT_WEIGHTS = {
    "distance": WEIGHT_DISTANCE,
    "angle": WEIGHT_ANGLE,
    "similarity": WEIGHT_SIMILARITY,
    "error": WEIGHT_ERROR,
}


class DefaultGeometryMetricsEngine:
    """
    Deterministic Geometry Metrics Engine.

    Aggregates independent MetricProvider outputs into geometry_score.
    Preserves RefinedCandidate order (no re-ranking).
    """

    def __init__(
        self,
        *,
        providers: Sequence[MetricProvider] | None = None,
        weights: dict[str, float] | None = None,
    ) -> None:
        self._providers: tuple[MetricProvider, ...] = tuple(
            providers if providers is not None else DEFAULT_METRIC_PROVIDERS
        )
        self._weights = dict(weights) if weights is not None else dict(_DEFAULT_WEIGHTS)

    def evaluate(
        self,
        refined: Sequence[RefinedCandidate],
        query: GeometrySearchQuery,
    ) -> List[GeometryEvaluatedCandidate]:
        if refined is None:
            raise InvalidGeometryMetricsInput("RefinedCandidate list is required")
        if not isinstance(refined, (list, tuple)):
            raise InvalidGeometryMetricsInput("refined must be a list or tuple")
        if query is None or not isinstance(query, GeometrySearchQuery):
            raise InvalidGeometryMetricsInput("GeometrySearchQuery is required")

        try:
            return self._evaluate(refined, query)
        except InvalidGeometryMetricsInput:
            raise
        except Exception as exc:  # noqa: BLE001
            raise GeometryMetricsFailure(str(exc), cause=exc) from exc

    def _evaluate(
        self,
        refined: Sequence[RefinedCandidate],
        query: GeometrySearchQuery,
    ) -> List[GeometryEvaluatedCandidate]:
        for index, item in enumerate(refined):
            if not isinstance(item, RefinedCandidate):
                raise InvalidGeometryMetricsInput(
                    f"refined[{index}] is not a RefinedCandidate"
                )

        results: List[GeometryEvaluatedCandidate] = []
        for item in refined:
            metrics = tuple(
                provider.evaluate(query, item) for provider in self._providers
            )
            detail = self._aggregate(metrics)
            results.append(
                GeometryEvaluatedCandidate(
                    candidate_id=item.candidate_id,
                    strategy_ref=item.strategy_ref,
                    geometry_score=detail.total,
                    metric_detail=detail,
                    refined=item,
                )
            )
        return results

    def _aggregate(self, metrics: tuple[GeometryMetric, ...]) -> MetricDetail:
        components: dict[str, float] = {}
        weighted_sum = 0.0
        weight_sum = 0.0
        for metric in metrics:
            weight = float(self._weights.get(metric.metric_id, 0.0))
            components[metric.metric_id] = metric.value
            weighted_sum += weight * metric.value
            weight_sum += weight
        total = weighted_sum / weight_sum if weight_sum > 0.0 else 0.0
        return MetricDetail(
            engine_id=GEOMETRY_METRICS_ENGINE_ID,
            components=components,
            total=total,
            metrics=metrics,
        )
