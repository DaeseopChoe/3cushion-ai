"""
Smoke test — Generator Host Strategy → Trajectory Snapshot.

Mission 29 completion gate.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import (  # noqa: E402
    FIXTURE_STRATEGY_REF,
    FixtureGeometryPort,
    make_fixture_strategy,
)
from generator.trajectory_generator import TrajectorySnapshot  # noqa: E402


def test_smoke_strategy_to_snapshot() -> None:
    """
    Strategy (Authoring)
        ↓
    Trajectory Snapshot
    """
    strategy = make_fixture_strategy()
    host = create_generator_host(geometry=FixtureGeometryPort())
    snapshot = host.generate_trajectory_snapshot(strategy)

    assert isinstance(snapshot, TrajectorySnapshot)
    assert snapshot.strategy_ref == FIXTURE_STRATEGY_REF
    assert len(snapshot.cue_trajectory) >= 2
    assert len(snapshot.line_of_score) >= 2
    assert snapshot.impact is not None
    assert snapshot.c3 is not None
    assert snapshot.last_scoring_cushion is not None
    # Sampler-ready endpoints
    assert snapshot.cue_trajectory[0] == strategy.cue
    assert snapshot.cue_trajectory[-1] == snapshot.impact
    assert snapshot.line_of_score[0] == snapshot.c3
    assert snapshot.line_of_score[-1] == snapshot.last_scoring_cushion
