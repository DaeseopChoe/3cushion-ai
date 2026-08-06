"""
Phase 3 Search Enhancement — Benchmark / Quality Validation.

Measures pipeline health: deterministic results, candidate quality,
full-scan fallback, and stage artifact completeness.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import FixtureGeometryPort, make_fixture_strategy  # noqa: E402
from membership import MembershipQuery, create_membership_engine  # noqa: E402
from membership.engine import DefaultMembershipEngine  # noqa: E402
from models import (  # noqa: E402
    DatasetIdentity,
    EnvelopeRecord,
    Point,
    PublishedDataset,
    StrategyRef,
)
from resolve import Strategy, create_memory_repository  # noqa: E402
from runtime import create_runtime  # noqa: E402
from search.geometry import GeometrySearchQuery, create_geometry_metrics_engine  # noqa: E402
from search.interpolation import create_interpolation_engine  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402
from search.runtime import create_search_enhancement_orchestrator  # noqa: E402


def _fixture_corpus(n: int = 5) -> tuple[PublishedDataset, MembershipQuery, dict]:
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    base = host.build_envelope(strategy, snapshot, cue, second)

    records = [base]
    strategies = {base.strategy_ref: Strategy(strategy_ref=base.strategy_ref)}
    for i in range(1, n):
        sid = StrategyRef(f"bench.extra.s{i}")
        records.append(
            EnvelopeRecord(
                strategy_ref=sid,
                target=base.target,
                cue_set=list(base.cue_set),
                second_set=list(base.second_set),
            )
        )
        strategies[sid] = Strategy(strategy_ref=sid)

    dataset = PublishedDataset(
        records=records,
        dataset_identity=DatasetIdentity("ds-bench"),
    )
    query = MembershipQuery(
        cue=base.cue_set[0],
        target=base.target,
        second=base.second_set[0],
    )
    return dataset, query, strategies


def test_benchmark_pipeline_runs_and_is_deterministic() -> None:
    dataset, query, strategies = _fixture_corpus()
    repo = create_memory_repository(strategies)
    runtime = create_runtime(repository=repo)

    started = time.perf_counter()
    first = runtime.execute(dataset, query)
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    second = runtime.execute(dataset, query)

    assert first.candidates == second.candidates
    assert first.strategies == second.strategies
    assert len(first.candidates) == len(dataset.records)
    assert elapsed_ms >= 0.0  # smoke timing capture for quality report


def test_benchmark_candidate_quality_artifacts() -> None:
    dataset, query, _ = _fixture_corpus(n=3)
    orch = create_search_enhancement_orchestrator(
        membership=create_membership_engine()
    )
    artifacts = orch.run(dataset, query)

    assert len(artifacts.membership_candidates) == 3
    assert len(artifacts.ranked_candidates) == 3
    assert len(artifacts.refined_candidates) == 3
    assert len(artifacts.geometry_candidates) == 3
    assert [c.rank for c in artifacts.ranked_candidates] == [1, 2, 3]
    assert all(r.refinement_detail is not None for r in artifacts.refined_candidates)
    assert all(g.geometry_score >= 0.0 for g in artifacts.geometry_candidates)
    assert all(
        set(g.metric_detail.components) >= {"distance", "angle", "similarity", "error"}
        for g in artifacts.geometry_candidates
    )


def test_benchmark_full_scan_fallback_quality() -> None:
    class _EmptyPrefilter:
        def select_records(self, dataset, query):
            return ()

    dataset, query, _ = _fixture_corpus(n=2)
    fallback = DefaultMembershipEngine(prefilter_adapter=_EmptyPrefilter())
    candidates = fallback.evaluate(dataset, query)
    assert len(candidates) == 2


def test_benchmark_stage_chain_quality() -> None:
    dataset, query, _ = _fixture_corpus(n=2)
    membership = create_membership_engine().evaluate(dataset, query)
    ranked = create_ranking_engine().rank(membership)
    refined = create_interpolation_engine().refine(ranked)
    geometry = create_geometry_metrics_engine().evaluate(
        refined,
        GeometrySearchQuery(cue=query.cue, target=query.target, second=query.second),
    )
    # Ranking order preserved through Interpolation and Geometry
    assert [str(item.strategy_ref) for item in ranked] == [
        str(item.strategy_ref) for item in refined
    ]
    assert [str(item.strategy_ref) for item in refined] == [
        str(item.strategy_ref) for item in geometry
    ]
