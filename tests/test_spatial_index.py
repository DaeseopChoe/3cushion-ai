"""
Unit tests — Spatial Index (PublishedDataset -> SpatialIndex -> candidate ids).
"""

from __future__ import annotations

import copy
import importlib
import inspect
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator.fixtures import make_fixture_corpus, make_fixture_record  # noqa: E402
from models import EnvelopeRecord, Point, PublishedDataset, StrategyRef  # noqa: E402
from search.spatial_index import (  # noqa: E402
    InvalidSpatialDataset,
    InvalidSpatialQuery,
    SpatialCell,
    SpatialIndex,
    SpatialQuery,
    SpatialQueryResult,
    create_spatial_index_builder,
)


def _dataset(records: list[EnvelopeRecord]) -> PublishedDataset:
    return PublishedDataset(records=records)


def test_build_spatial_index_from_dataset() -> None:
    dataset = _dataset(make_fixture_corpus())
    index = create_spatial_index_builder().build(dataset)
    assert isinstance(index, SpatialIndex)
    assert index.record_count == 1
    assert index.target_cells
    assert index.cue_cells
    assert index.second_cells


def test_query_returns_candidate_ids() -> None:
    record = make_fixture_record()
    dataset = _dataset([record])
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
    assert isinstance(result, SpatialQueryResult)
    assert result.candidate_ids == (record.strategy_ref,)


def test_query_miss_returns_empty_tuple() -> None:
    dataset = _dataset(make_fixture_corpus())
    builder = create_spatial_index_builder()
    index = builder.build(dataset)
    result = builder.query(
        index,
        SpatialQuery(
            cue=Point(x=79.9, y=39.9),
            target=Point(x=0.1, y=0.1),
            second=Point(x=79.9, y=0.1),
        ),
    )
    assert result.candidate_ids == ()


def test_spatial_cell_contract_8x4() -> None:
    builder = create_spatial_index_builder()
    index = builder.build(_dataset(make_fixture_corpus()))
    result = builder.query(
        index,
        SpatialQuery(
            cue=Point(x=0.0, y=0.0),
            target=Point(x=80.0, y=40.0),
            second=Point(x=10.0, y=10.0),
        ),
    )
    assert result.cue_cell == SpatialCell(col=0, row=0)
    assert result.target_cell == SpatialCell(col=7, row=3)
    assert result.second_cell == SpatialCell(col=1, row=1)


def test_runtime_derived_only_no_dataset_mutation() -> None:
    dataset = _dataset(make_fixture_corpus())
    before = copy.deepcopy(dataset)
    create_spatial_index_builder().build(dataset)
    assert dataset == before


def test_invalid_dataset() -> None:
    builder = create_spatial_index_builder()
    with pytest.raises(InvalidSpatialDataset):
        builder.build(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidSpatialDataset):
        builder.build("not-dataset")  # type: ignore[arg-type]
    with pytest.raises(InvalidSpatialDataset):
        builder.build(PublishedDataset(records=["bad"]))  # type: ignore[list-item]


def test_invalid_query() -> None:
    builder = create_spatial_index_builder()
    index = builder.build(_dataset(make_fixture_corpus()))
    with pytest.raises(InvalidSpatialQuery):
        builder.query(None, SpatialQuery(cue=Point(0, 0), target=Point(0, 0), second=Point(0, 0)))  # type: ignore[arg-type]
    with pytest.raises(InvalidSpatialQuery):
        builder.query(index, None)  # type: ignore[arg-type]


def test_multiple_records_intersection() -> None:
    record_a = make_fixture_record()
    record_b = EnvelopeRecord(
        strategy_ref=StrategyRef("fixture.other.s2"),
        target=Point(x=70.0, y=35.0),
        cue_set=[Point(x=71.0, y=35.0)],
        second_set=[Point(x=72.0, y=35.0)],
    )
    dataset = _dataset([record_a, record_b])
    builder = create_spatial_index_builder()
    index = builder.build(dataset)
    result = builder.query(
        index,
        SpatialQuery(
            cue=record_b.cue_set[0],
            target=record_b.target,
            second=record_b.second_set[0],
        ),
    )
    assert result.candidate_ids == (record_b.strategy_ref,)


def test_no_forbidden_layer_calls() -> None:
    modules = (
        "search.spatial_index.builder",
        "search.spatial_index.cell",
        "search.spatial_index.contract",
        "search.spatial_index.models",
    )
    for name in modules:
        src = inspect.getsource(importlib.import_module(name))
        for banned in (
            "from generator",
            "import generator",
            "from loader",
            "import loader",
            "from resolve",
            "import resolve",
            "from runtime",
            "import runtime",
            "KDTree",
            "Ranking",
            "Interpolation",
            "Geometry",
        ):
            assert banned not in src, f"{banned} found in {name}"
