"""
Smoke test — TrajectorySnapshot → CueSampler → cueSet.

Mission 30 completion gate.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_cue_sampler, create_generator_host  # noqa: E402
from generator.cue_sampler import CUE_T_MAX, CueSetResult  # noqa: E402
from generator.cue_sampler.sampling import point_at_arc_length, polyline_length  # noqa: E402
from generator.fixtures import (  # noqa: E402
    FixtureGeometryPort,
    make_fixture_snapshot,
    make_fixture_strategy,
)


def test_smoke_snapshot_to_cue_set() -> None:
    """
    TrajectorySnapshot
        ↓
    CueSampler
        ↓
    cueSet
    """
    snapshot = make_fixture_snapshot()
    result = create_cue_sampler().sample(snapshot)

    assert isinstance(result, CueSetResult)
    assert result.strategy_ref == snapshot.strategy_ref
    assert len(result.cue_set) >= 2
    assert result.cue_set[0] == snapshot.cue_trajectory[0]
    end = point_at_arc_length(
        snapshot.cue_trajectory,
        polyline_length(snapshot.cue_trajectory) * CUE_T_MAX,
    )
    assert result.cue_set[-1] == end
    assert result.cue_set[-1] != snapshot.impact


def test_smoke_host_strategy_to_cue_set() -> None:
    """Host: Strategy → Snapshot → cueSet (Mission 29+30 path)."""
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    result = host.sample_cue(snapshot)
    assert isinstance(result, CueSetResult)
    assert result.strategy_ref == strategy.strategy_ref
    assert len(result.cue_set) >= 1
    assert result.cue_set[0] == snapshot.cue_trajectory[0]
