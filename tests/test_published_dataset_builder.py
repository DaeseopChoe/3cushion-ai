"""
Unit tests — Published Dataset Builder (EnvelopeRecord[] → PublishedDataset).
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

from generator.fixtures import (  # noqa: E402
    FIXTURE_STRATEGY_REF,
    make_fixture_corpus,
    make_fixture_record,
)
from generator.published_dataset_builder import (  # noqa: E402
    InvalidPublishedDatasetInput,
    PublishedDatasetAssemblyFailure,
    create_published_dataset_builder,
)
from generator.published_dataset_builder.serialize import (  # noqa: E402
    published_dataset_to_json,
)
from models import EnvelopeRecord, Point, PublishedDataset, StrategyRef  # noqa: E402
from validation import validate_dataset  # noqa: E402


def test_build_published_dataset_from_corpus() -> None:
    corpus = make_fixture_corpus()
    dataset = create_published_dataset_builder().build(corpus)

    assert isinstance(dataset, PublishedDataset)
    assert dataset.records == corpus
    assert dataset.dataset_identity is None


def test_validation_gate_passes() -> None:
    corpus = make_fixture_corpus()
    dataset = create_published_dataset_builder().build(corpus)
    payload = published_dataset_to_json(dataset.records)
    validate_dataset(payload)


def test_records_consumed_as_is() -> None:
    record = make_fixture_record()
    dataset = create_published_dataset_builder().build([record])
    assert dataset.records[0] is record


def test_does_not_mutate_records() -> None:
    corpus = make_fixture_corpus()
    before = copy.deepcopy(corpus)
    create_published_dataset_builder().build(corpus)
    assert corpus == before


def test_duplicate_strategy_ref_rejected() -> None:
    record = make_fixture_record()
    dup = EnvelopeRecord(
        strategy_ref=FIXTURE_STRATEGY_REF,
        target=Point(x=41.0, y=21.0),
        cue_set=[Point(x=1.0, y=1.0)],
        second_set=[Point(x=2.0, y=2.0)],
    )
    with pytest.raises(InvalidPublishedDatasetInput):
        create_published_dataset_builder().build([record, dup])


def test_invalid_inputs() -> None:
    builder = create_published_dataset_builder()
    with pytest.raises(InvalidPublishedDatasetInput):
        builder.build(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidPublishedDatasetInput):
        builder.build(["not-a-record"])  # type: ignore[list-item]


def test_validation_failure_wrap() -> None:
    from generator.published_dataset_builder.engine import DefaultPublishedDatasetBuilder
    import generator.published_dataset_builder.engine as eng

    builder = DefaultPublishedDatasetBuilder()
    original = eng.validate_dataset

    def _fail(_data):
        from validation import ValidationFailed

        raise ValidationFailed("published_dataset", errors=["forced"])

    eng.validate_dataset = _fail  # type: ignore[assignment]
    try:
        with pytest.raises(PublishedDatasetAssemblyFailure):
            builder.build(make_fixture_corpus())
    finally:
        eng.validate_dataset = original  # type: ignore[assignment]


def test_no_record_patch_or_geometry_fields() -> None:
    dataset = create_published_dataset_builder().build(make_fixture_corpus())
    record = dataset.records[0]
    assert not hasattr(record, "path_nodes")
    assert not hasattr(record, "modal")
    assert not hasattr(record, "cartesian")
    assert record.strategy_ref == StrategyRef(FIXTURE_STRATEGY_REF)


def test_no_forbidden_layer_calls() -> None:
    modules = (
        "generator.published_dataset_builder.engine",
        "generator.published_dataset_builder.serialize",
        "generator.published_dataset_builder.factory",
        "generator.published_dataset_builder.interfaces",
    )
    for name in modules:
        src = inspect.getsource(importlib.import_module(name))
        for banned in (
            "from membership",
            "import membership",
            "from resolve",
            "import resolve",
            "from runtime",
            "import runtime",
            "from loader",
            "import loader",
            "sample_cue_segment",
            "sample_second_segment",
            "buildTrajectory",
            "KDTree",
            "Interpolation",
            "patch_record",
        ):
            assert banned not in src, f"{banned} found in {name}"
