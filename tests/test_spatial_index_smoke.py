"""
Smoke tests — Spatial Index coarse prefilter.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import FixtureGeometryPort, make_fixture_strategy  # noqa: E402
from search.spatial_index import SpatialQuery, create_spatial_index_builder  # noqa: E402


def test_spatial_index_smoke_from_published_dataset() -> None:
    """
    PublishedDataset
        ↓
    Spatial Index
        ↓
    Query
        ↓
    Candidate IDs
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    builder = create_spatial_index_builder()
    index = builder.build(dataset)
    result = builder.query(
        index,
        SpatialQuery(
            cue=record.cue_set[0],
            target=record.target,
            second=record.second_set[0],
        ),
    )
    assert result.candidate_ids == (record.strategy_ref,)
