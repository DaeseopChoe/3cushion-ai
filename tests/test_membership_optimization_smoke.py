"""
Smoke tests — optimized Membership path.
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


def test_membership_optimization_smoke() -> None:
    """
    PublishedDataset
        ↓
    Spatial Index
        ↓
    KDTree
        ↓
    Membership Gate
        ↓
    MembershipCandidate
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    candidates = create_membership_engine().evaluate(
        dataset,
        MembershipQuery(
            cue=record.cue_set[0],
            target=record.target,
            second=record.second_set[0],
        ),
    )

    assert len(candidates) == 1
    assert candidates[0].strategy_ref == record.strategy_ref
    assert candidates[0].record_identity == record.strategy_ref
