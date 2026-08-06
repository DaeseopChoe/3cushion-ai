"""
Unit tests — Envelope Builder (assemble EnvelopeRecord + Validation).
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

from generator.cue_sampler import CueSetResult, create_cue_sampler  # noqa: E402
from generator.envelope_builder import (  # noqa: E402
    EnvelopeAssemblyFailure,
    InvalidEnvelopeInput,
    create_envelope_builder,
)
from generator.fixtures import (  # noqa: E402
    make_fixture_snapshot,
    make_fixture_strategy,
)
from generator.second_sampler import SecondSetResult, create_second_sampler  # noqa: E402
from generator.trajectory_generator.snapshot import TrajectorySnapshot  # noqa: E402
from models import EnvelopeRecord, Point, StrategyRef  # noqa: E402
from validation import validate_dataset  # noqa: E402
from generator.envelope_builder.serialize import (  # noqa: E402
    dataset_wrapper_for_record,
    envelope_record_to_json,
)


def _inputs():
    strategy = make_fixture_strategy()
    snapshot = make_fixture_snapshot()
    cue = create_cue_sampler().sample(snapshot)
    second = create_second_sampler().sample(snapshot)
    return strategy, snapshot, cue, second


def test_build_envelope_record_four_fields() -> None:
    strategy, snapshot, cue, second = _inputs()
    record = create_envelope_builder().build(strategy, snapshot, cue, second)

    assert isinstance(record, EnvelopeRecord)
    assert record.strategy_ref == strategy.strategy_ref
    assert record.target == strategy.target
    assert record.cue_set == list(cue.cue_set)
    assert record.second_set == list(second.second_set)
    fields = set(record.__dataclass_fields__.keys())
    assert fields == {"strategy_ref", "target", "cue_set", "second_set"}


def test_validation_layer_gate_passes() -> None:
    strategy, snapshot, cue, second = _inputs()
    record = create_envelope_builder().build(strategy, snapshot, cue, second)
    payload = envelope_record_to_json(
        strategy_ref=str(record.strategy_ref),
        target=record.target,
        cue_set=record.cue_set,
        second_set=record.second_set,
    )
    validate_dataset(dataset_wrapper_for_record(payload))


def test_no_geometry_raw_or_modal_fields() -> None:
    strategy, snapshot, cue, second = _inputs()
    record = create_envelope_builder().build(strategy, snapshot, cue, second)
    assert not hasattr(record, "path_nodes")
    assert not hasattr(record, "line_of_score")
    assert not hasattr(record, "cue_trajectory")
    assert not hasattr(record, "modal")
    assert not hasattr(record, "sys_inputs")
    assert not hasattr(record, "cartesian")


def test_does_not_mutate_inputs() -> None:
    strategy, snapshot, cue, second = _inputs()
    before = (
        copy.deepcopy(strategy),
        copy.deepcopy(snapshot),
        copy.deepcopy(cue),
        copy.deepcopy(second),
    )
    create_envelope_builder().build(strategy, snapshot, cue, second)
    assert strategy == before[0]
    assert snapshot == before[1]
    assert cue == before[2]
    assert second == before[3]


def test_strategy_ref_mismatch_rejected() -> None:
    strategy, snapshot, cue, second = _inputs()
    bad_cue = CueSetResult(strategy_ref=StrategyRef("other"), cue_set=cue.cue_set)
    with pytest.raises(InvalidEnvelopeInput):
        create_envelope_builder().build(strategy, snapshot, bad_cue, second)


def test_empty_cue_set_rejected() -> None:
    strategy, snapshot, cue, second = _inputs()
    bad_cue = CueSetResult(strategy_ref=cue.strategy_ref, cue_set=())
    with pytest.raises(InvalidEnvelopeInput):
        create_envelope_builder().build(strategy, snapshot, bad_cue, second)


def test_invalid_inputs() -> None:
    strategy, snapshot, cue, second = _inputs()
    builder = create_envelope_builder()
    with pytest.raises(InvalidEnvelopeInput):
        builder.build(None, snapshot, cue, second)  # type: ignore[arg-type]
    with pytest.raises(InvalidEnvelopeInput):
        builder.build(strategy, None, cue, second)  # type: ignore[arg-type]
    with pytest.raises(InvalidEnvelopeInput):
        builder.build(strategy, snapshot, None, second)  # type: ignore[arg-type]
    with pytest.raises(InvalidEnvelopeInput):
        builder.build(strategy, snapshot, cue, None)  # type: ignore[arg-type]


def test_validation_failure_wrap() -> None:
    """Force ValidationFailed via empty cue after bypassing early check — use mock."""
    from generator.envelope_builder.engine import DefaultEnvelopeBuilder
    import generator.envelope_builder.engine as eng

    strategy, snapshot, cue, second = _inputs()
    builder = DefaultEnvelopeBuilder()
    original = eng.validate_dataset

    def _fail(_data):
        from validation import ValidationFailed

        raise ValidationFailed("published_dataset", errors=["forced"])

    eng.validate_dataset = _fail  # type: ignore[assignment]
    try:
        with pytest.raises(EnvelopeAssemblyFailure):
            builder.build(strategy, snapshot, cue, second)
    finally:
        eng.validate_dataset = original  # type: ignore[assignment]


def test_snapshot_not_copied_into_record() -> None:
    strategy, snapshot, cue, second = _inputs()
    record = create_envelope_builder().build(strategy, snapshot, cue, second)
    # Snapshot points must not appear as extra fields; target is Authoring target
    assert record.target == strategy.target
    assert record.target != snapshot.impact


def test_no_forbidden_layer_calls() -> None:
    modules = (
        "generator.envelope_builder.engine",
        "generator.envelope_builder.serialize",
        "generator.envelope_builder.factory",
        "generator.envelope_builder.interfaces",
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
            "from session",
            "import session",
            "from loader",
            "import loader",
            "KDTree",
            "trajectorySampleBuilder",
            "sample_cue_segment",
            "sample_second_segment",
            "PublishedDataset(",
            "create_trajectory_generator",
        ):
            assert banned not in src, f"{banned} found in {name}"
        assert "def sample(" not in src or name.endswith("interfaces")
