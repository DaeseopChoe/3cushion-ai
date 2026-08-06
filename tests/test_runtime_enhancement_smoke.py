"""
Smoke tests — Search Runtime Enhancement Wiring.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import FixtureGeometryPort, make_fixture_strategy  # noqa: E402
from membership import MembershipQuery  # noqa: E402
from resolve import Strategy, create_memory_repository  # noqa: E402
from runtime import create_runtime  # noqa: E402


def test_runtime_enhancement_smoke_full_pipeline() -> None:
    """
    PublishedDataset
        ↓
    Spatial Index → KDTree → Membership → Ranking
        → Interpolation → Geometry Metrics → Resolve
        ↓
    SearchResult
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy_authoring = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy_authoring)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy_authoring, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    repo = create_memory_repository(
        {
            record.strategy_ref: Strategy(strategy_ref=record.strategy_ref),
        }
    )
    result = create_runtime(repository=repo).execute(
        dataset,
        MembershipQuery(
            cue=record.cue_set[0],
            target=record.target,
            second=record.second_set[0],
        ),
    )

    assert result.candidate is not None
    assert result.strategy is not None
    assert result.candidate.strategy_ref == record.strategy_ref
    assert result.strategy.strategy_ref == record.strategy_ref
