"""
Unit / regression tests — Geometry Metrics Engine.
"""

from __future__ import annotations

import copy
import importlib
import inspect
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models import Point  # noqa: E402
from search.geometry import (  # noqa: E402
    DistanceMetricProvider,
    GEOMETRY_METRICS_ENGINE_ID,
    GeometryEvaluatedCandidate,
    GeometrySearchQuery,
    InvalidGeometryMetricsInput,
    MetricProvider,
    SimilarityMetricProvider,
    create_geometry_metrics_engine,
)
from search.geometry.fixtures import (  # noqa: E402
    make_fixture_query,
    make_fixture_refined_candidates,
)
from search.interpolation import create_interpolation_engine  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402
from search.ranking.fixtures import make_fixture_candidates  # noqa: E402


def test_metric_providers_are_independent() -> None:
    query = make_fixture_query()
    refined = make_fixture_refined_candidates()[0]
    distance = DistanceMetricProvider().evaluate(query, refined)
    similarity = SimilarityMetricProvider().evaluate(query, refined)
    assert distance.metric_id == "distance"
    assert similarity.metric_id == "similarity"
    assert 0.0 <= distance.value <= 1.0
    assert 0.0 <= similarity.value <= 1.0
    assert "mean_distance" in distance.detail
    assert "refined_score" in similarity.detail


def test_evaluate_returns_geometry_evaluated_candidates() -> None:
    refined = make_fixture_refined_candidates()
    results = create_geometry_metrics_engine().evaluate(refined, make_fixture_query())
    assert len(results) == len(refined)
    assert all(isinstance(item, GeometryEvaluatedCandidate) for item in results)
    assert all(item.metric_detail is not None for item in results)
    assert all(item.geometry_score >= 0.0 for item in results)
    assert all(item.metric_detail.engine_id == GEOMETRY_METRICS_ENGINE_ID for item in results)
    assert all(len(item.metric_detail.metrics) == 4 for item in results)


def test_preserves_refined_order_no_rerank() -> None:
    refined = make_fixture_refined_candidates()
    results = create_geometry_metrics_engine().evaluate(refined, make_fixture_query())
    assert [str(item.candidate_id) for item in results] == [
        str(item.candidate_id) for item in refined
    ]


def test_similarity_differs_across_candidates() -> None:
    refined = make_fixture_refined_candidates()
    results = create_geometry_metrics_engine().evaluate(refined, make_fixture_query())
    similarity_values = [
        item.metric_detail.components["similarity"] for item in results
    ]
    assert len(set(similarity_values)) > 1


def test_metric_provider_extension() -> None:
    class ExtraMetricProvider:
        metric_id = "extra"

        def evaluate(self, query, refined):
            from search.geometry.models import GeometryMetric

            return GeometryMetric(metric_id="extra", value=1.0, detail={"k": 1.0})

    engine = create_geometry_metrics_engine(
        providers=(DistanceMetricProvider(), ExtraMetricProvider()),
        weights={"distance": 0.5, "extra": 0.5},
    )
    results = engine.evaluate(make_fixture_refined_candidates()[:1], make_fixture_query())
    assert "extra" in results[0].metric_detail.components
    assert isinstance(ExtraMetricProvider(), MetricProvider)


def test_deterministic_same_input_same_output() -> None:
    engine = create_geometry_metrics_engine()
    refined = make_fixture_refined_candidates()
    query = make_fixture_query()
    assert engine.evaluate(refined, query) == engine.evaluate(refined, query)


def test_empty_input() -> None:
    assert create_geometry_metrics_engine().evaluate([], make_fixture_query()) == []


def test_invalid_input() -> None:
    engine = create_geometry_metrics_engine()
    with pytest.raises(InvalidGeometryMetricsInput):
        engine.evaluate(None, make_fixture_query())  # type: ignore[arg-type]
    with pytest.raises(InvalidGeometryMetricsInput):
        engine.evaluate(make_fixture_refined_candidates(), None)  # type: ignore[arg-type]
    with pytest.raises(InvalidGeometryMetricsInput):
        engine.evaluate(["bad"], make_fixture_query())  # type: ignore[list-item]


def test_does_not_mutate_refined_candidates() -> None:
    refined = make_fixture_refined_candidates()
    before = copy.deepcopy(refined)
    create_geometry_metrics_engine().evaluate(refined, make_fixture_query())
    assert refined == before


def test_regression_interpolation_to_geometry_pipeline() -> None:
    membership = make_fixture_candidates()
    ranked = create_ranking_engine().rank(membership)
    refined = create_interpolation_engine().refine(ranked)
    evaluated = create_geometry_metrics_engine().evaluate(refined, make_fixture_query())
    assert len(evaluated) == len(refined)
    assert [str(item.strategy_ref) for item in evaluated] == [
        str(item.strategy_ref) for item in refined
    ]
    assert all("distance" in item.metric_detail.components for item in evaluated)
    assert all("angle" in item.metric_detail.components for item in evaluated)
    assert all("similarity" in item.metric_detail.components for item in evaluated)
    assert all("error" in item.metric_detail.components for item in evaluated)


def test_no_trajectory_or_generator_dependency() -> None:
    modules = (
        "search.geometry.engine",
        "search.geometry.providers",
        "search.geometry.models",
        "search.geometry.contract",
    )
    for name in modules:
        src = inspect.getsource(importlib.import_module(name))
        for banned in (
            "from generator",
            "import generator",
            "buildTrajectory",
            "PathNode",
            "pathNodes",
            "sample_cue",
            "sample_second",
            "from resolve",
            "import resolve",
            "from runtime",
            "import runtime",
            "from loader",
            "import loader",
            "PublishedDataset",
            "create_ranking_engine",
            "create_interpolation_engine",
            "from geometry",
            "import geometry",
        ):
            assert banned not in src, f"{banned} found in {name}"
