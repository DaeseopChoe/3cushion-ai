"""
Smoke test — TrajectorySnapshot → SecondSampler → secondSet.

Mission 31 completion gate.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import (  # noqa: E402
    create_cue_sampler,
    create_generator_host,
    create_second_sampler,
)
from generator.cue_sampler import CueSetResult  # noqa: E402
from generator.fixtures import (  # noqa: E402
    FixtureGeometryPort,
    make_fixture_snapshot,
    make_fixture_strategy,
)
from generator.second_sampler import SecondSetResult  # noqa: E402


def test_smoke_snapshot_to_second_set() -> None:
    """
    TrajectorySnapshot
        ↓
    SecondSampler
        ↓
    secondSet
    """
    snapshot = make_fixture_snapshot()
    result = create_second_sampler().sample(snapshot)

    assert isinstance(result, SecondSetResult)
    assert result.strategy_ref == snapshot.strategy_ref
    assert len(result.second_set) >= 2
    assert result.second_set[0] == snapshot.c3
    assert result.second_set[-1] == snapshot.last_scoring_cushion


def test_smoke_independent_cue_and_second() -> None:
    """Both Samplers consume the same Snapshot independently."""
    snapshot = make_fixture_snapshot()
    cue = create_cue_sampler().sample(snapshot)
    second = create_second_sampler().sample(snapshot)

    assert isinstance(cue, CueSetResult)
    assert isinstance(second, SecondSetResult)
    assert cue.strategy_ref == second.strategy_ref == snapshot.strategy_ref
    assert cue.cue_set != second.second_set
    assert cue.cue_set[0] == snapshot.cue_trajectory[0]
    assert second.second_set[0] == snapshot.line_of_score[0]


def test_smoke_host_strategy_to_both_sets() -> None:
    """Host: Strategy → Snapshot → cueSet + secondSet."""
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    assert cue.strategy_ref == strategy.strategy_ref
    assert second.strategy_ref == strategy.strategy_ref
    assert len(cue.cue_set) >= 1
    assert len(second.second_set) >= 1
