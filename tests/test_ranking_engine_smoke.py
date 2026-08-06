"""
Smoke tests — Membership → Ranking.
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
from search.ranking import create_ranking_engine  # noqa: E402


def test_ranking_smoke_membership_to_ranked() -> None:
    """
    PublishedDataset
        ↓
    Membership
        ↓
    MembershipCandidate[]
        ↓
    Ranking
        ↓
    RankedCandidate[]
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

    assert len(ranked) == 1
    assert ranked[0].rank == 1
    assert ranked[0].strategy_ref == record.strategy_ref
    assert ranked[0].candidate_id == record.strategy_ref
    assert ranked[0].score == 3.0
    assert ranked[0].score_detail.total == 3.0
