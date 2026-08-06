"""
Smoke tests — Interpolation → Geometry Metrics.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import FixtureGeometryPort, make_fixture_strategy  # noqa: E402
from membership import MembershipQuery, create_membership_engine  # noqa: E402
from search.geometry import GeometrySearchQuery, create_geometry_metrics_engine  # noqa: E402
from search.interpolation import create_interpolation_engine  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402


def test_geometry_metrics_smoke_pipeline() -> None:
    """
    Membership
        ↓
    Ranking
        ↓
    Interpolation
        ↓
    Geometry Metrics
        ↓
    GeometryEvaluatedCandidate[]
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    query = MembershipQuery(
        cue=record.cue_set[0],
        target=record.target,
        second=record.second_set[0],
    )
    membership_candidates = create_membership_engine().evaluate(dataset, query)
    ranked = create_ranking_engine().rank(membership_candidates)
    refined = create_interpolation_engine().refine(ranked)
    evaluated = create_geometry_metrics_engine().evaluate(
        refined,
        GeometrySearchQuery(
            cue=query.cue,
            target=query.target,
            second=query.second,
        ),
    )

    assert len(evaluated) == 1
    assert evaluated[0].strategy_ref == record.strategy_ref
    assert evaluated[0].candidate_id == record.strategy_ref
    assert evaluated[0].geometry_score >= 0.0
    assert evaluated[0].metric_detail.total == evaluated[0].geometry_score
    assert len(evaluated[0].metric_detail.metrics) == 4
