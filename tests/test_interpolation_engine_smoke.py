"""
Smoke tests — Ranking → Interpolation.
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
from search.interpolation import create_interpolation_engine  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402


def test_interpolation_smoke_ranking_to_refined() -> None:
    """
    Membership
        ↓
    Ranking
        ↓
    Interpolation
        ↓
    RefinedCandidate[]
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    membership_candidates = create_membership_engine().evaluate(
        dataset,
        MembershipQuery(
            cue=record.cue_set[0],
            target=record.target,
            second=record.second_set[0],
        ),
    )
    ranked = create_ranking_engine().rank(membership_candidates)
    refined = create_interpolation_engine().refine(ranked)

    assert len(refined) == 1
    assert refined[0].strategy_ref == record.strategy_ref
    assert refined[0].candidate_id == record.strategy_ref
    assert refined[0].score == ranked[0].score
    assert refined[0].refined_score == ranked[0].score  # single-item neighborhood
    assert refined[0].refinement_detail.base_score == ranked[0].score
