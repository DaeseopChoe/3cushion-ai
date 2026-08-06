"""
Smoke tests — Spatial Index candidate scope -> KDTree shortlist.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import FixtureGeometryPort, make_fixture_strategy  # noqa: E402
from search.kd_tree import KDTreeQueryInput, create_kd_tree_builder, create_kd_tree_query  # noqa: E402
from search.spatial_index import SpatialQuery, create_spatial_index_builder  # noqa: E402


def test_kd_tree_smoke_from_spatial_candidates() -> None:
    """
    PublishedDataset
        ↓
    Spatial Index
        ↓
    Candidate IDs
        ↓
    KDTree
        ↓
    Top-N shortlist
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    spatial_builder = create_spatial_index_builder()
    spatial_index = spatial_builder.build(dataset)
    spatial_result = spatial_builder.query(
        spatial_index,
        SpatialQuery(
            cue=record.cue_set[0],
            target=record.target,
            second=record.second_set[0],
        ),
    )

    kd_builder = create_kd_tree_builder()
    kd_query = create_kd_tree_query()
    kd_index = kd_builder.build(dataset, spatial_result.candidate_ids)
    shortlist = kd_query.search(
        kd_index,
        KDTreeQueryInput(
            cue=record.cue_set[0],
            target=record.target,
            second=record.second_set[0],
        ),
        top_n=1,
    )

    assert len(shortlist) == 1
    assert shortlist[0].candidate_id == record.strategy_ref
    assert shortlist[0].strategy_ref == record.strategy_ref
