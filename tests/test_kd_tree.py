"""
Unit tests — KDTree candidate retrieval.
"""

from __future__ import annotations

import copy
import importlib
import inspect
import math
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models import EnvelopeRecord, Point, PublishedDataset, RecordIdentity, StrategyRef  # noqa: E402
from search.kd_tree import (  # noqa: E402
    InvalidKDTreeCandidate,
    InvalidKDTreeDataset,
    InvalidKDTreeQuery,
    KD_TREE_DIMENSIONS,
    KDTreeIndex,
    KDTreeQueryInput,
    create_kd_tree_builder,
    create_kd_tree_query,
    encode_query_to_vector,
    encode_record_to_vector,
)
from search.kd_tree.fixtures import (  # noqa: E402
    make_fixture_candidate_ids,
    make_fixture_dataset,
    make_fixture_query,
)


def test_encode_query_to_fixed_6d() -> None:
    vector = encode_query_to_vector(make_fixture_query())
    assert vector == (15.0, 10.0, 22.0, 10.0, 35.0, 10.0)
    assert len(vector) == KD_TREE_DIMENSIONS


def test_encode_record_to_fixed_6d_centroid() -> None:
    record = make_fixture_dataset().records[0]
    vector = encode_record_to_vector(record)
    assert vector == (11.0, 10.0, 20.0, 10.0, 31.0, 10.0)


def test_build_kd_tree_from_candidate_scope() -> None:
    dataset = make_fixture_dataset()
    index = create_kd_tree_builder().build(dataset, make_fixture_candidate_ids())
    assert isinstance(index, KDTreeIndex)
    assert index.dimensions == 6
    assert len(index.candidates) == 3
    assert index.root is not None


def test_top_n_nearest_shortlist() -> None:
    dataset = make_fixture_dataset()
    builder = create_kd_tree_builder()
    query_api = create_kd_tree_query()
    index = builder.build(dataset, make_fixture_candidate_ids())
    shortlist = query_api.search(index, make_fixture_query(), top_n=2)
    assert [str(item.candidate_id) for item in shortlist] == [
        "fixture.kd.beta",
        "fixture.kd.gamma",
    ]
    assert shortlist[0].distance == 0.0
    assert shortlist[1].distance == 0.0


def test_tie_break_is_deterministic_by_candidate_id() -> None:
    dataset = make_fixture_dataset()
    builder = create_kd_tree_builder()
    query_api = create_kd_tree_query()
    index = builder.build(dataset, make_fixture_candidate_ids())
    first = query_api.search(index, make_fixture_query(), top_n=3)
    second = query_api.search(index, make_fixture_query(), top_n=3)
    assert [str(item.tie_break_key) for item in first[:2]] == [
        "fixture.kd.beta",
        "fixture.kd.gamma",
    ]
    assert first == second


def test_top_n_truncates_and_orders_by_distance_then_id() -> None:
    dataset = make_fixture_dataset()
    builder = create_kd_tree_builder()
    query_api = create_kd_tree_query()
    index = builder.build(dataset, make_fixture_candidate_ids())
    shortlist = query_api.search(index, make_fixture_query(), top_n=3)
    assert [str(item.candidate_id) for item in shortlist] == [
        "fixture.kd.beta",
        "fixture.kd.gamma",
        "fixture.kd.alpha",
    ]
    assert math.isclose(shortlist[2].distance, math.sqrt(36.0))


def test_runtime_only_no_dataset_mutation() -> None:
    dataset = make_fixture_dataset()
    before = copy.deepcopy(dataset)
    create_kd_tree_builder().build(dataset, make_fixture_candidate_ids())
    assert dataset == before


def test_invalid_dataset_and_candidate_scope() -> None:
    builder = create_kd_tree_builder()
    with pytest.raises(InvalidKDTreeDataset):
        builder.build(None, make_fixture_candidate_ids())  # type: ignore[arg-type]
    with pytest.raises(InvalidKDTreeDataset):
        builder.build("bad", make_fixture_candidate_ids())  # type: ignore[arg-type]
    with pytest.raises(InvalidKDTreeCandidate):
        builder.build(make_fixture_dataset(), None)  # type: ignore[arg-type]
    with pytest.raises(InvalidKDTreeCandidate):
        builder.build(make_fixture_dataset(), [RecordIdentity("missing.id")])


def test_invalid_query_inputs() -> None:
    builder = create_kd_tree_builder()
    query_api = create_kd_tree_query()
    index = builder.build(make_fixture_dataset(), make_fixture_candidate_ids())
    with pytest.raises(InvalidKDTreeQuery):
        query_api.search(None, make_fixture_query(), top_n=1)  # type: ignore[arg-type]
    with pytest.raises(InvalidKDTreeQuery):
        query_api.search(index, None, top_n=1)  # type: ignore[arg-type]
    with pytest.raises(InvalidKDTreeQuery):
        query_api.search(index, make_fixture_query(), top_n=0)


def test_empty_candidate_scope_returns_empty_shortlist() -> None:
    builder = create_kd_tree_builder()
    query_api = create_kd_tree_query()
    index = builder.build(make_fixture_dataset(), [])
    assert index.root is None
    assert query_api.search(index, make_fixture_query(), top_n=1) == ()


def test_no_legacy_position_record_dependency() -> None:
    modules = (
        "search.kd_tree.builder",
        "search.kd_tree.encoding",
        "search.kd_tree.models",
        "search.kd_tree.query",
    )
    for name in modules:
        src = inspect.getsource(importlib.import_module(name))
        for banned in (
            "PositionRecord",
            "positionId",
            "from frontend",
            "import frontend",
            "MembershipCandidate",
            "Ranking",
            "Interpolation",
            "Geometry",
            "Resolve",
        ):
            assert banned not in src, f"{banned} found in {name}"
