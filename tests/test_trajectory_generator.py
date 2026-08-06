"""
Unit tests — Trajectory Generator (Strategy → Trajectory Snapshot).
"""

from __future__ import annotations

import copy
import dataclasses
import importlib
import inspect
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import (  # noqa: E402
    AuthoringStrategy,
    InvalidAuthoringStrategy,
    create_generator_host,
)
from generator.fixtures import (  # noqa: E402
    FIXTURE_STRATEGY_REF,
    FixtureGeometryPort,
    make_fixture_geometry_result,
    make_fixture_strategy,
)
from generator.trajectory_generator import (  # noqa: E402
    GeometryConsumeFailure,
    GeometryConsumeResult,
    InvalidGeometryConsume,
    TrajectorySnapshot,
    create_trajectory_generator,
)
from models import Point, StrategyRef  # noqa: E402


def test_fixture_strategy_identity() -> None:
    strategy = make_fixture_strategy()
    assert strategy.strategy_ref == FIXTURE_STRATEGY_REF
    assert strategy.cue.x == 20.0
    assert strategy.target.x == 40.0


def test_generate_snapshot_from_strategy() -> None:
    strategy = make_fixture_strategy()
    engine = create_trajectory_generator(geometry=FixtureGeometryPort())
    snapshot = engine.generate(strategy)

    assert isinstance(snapshot, TrajectorySnapshot)
    assert snapshot.strategy_ref == strategy.strategy_ref
    assert snapshot.impact == Point(x=35.0, y=18.0)
    assert snapshot.c3 == Point(x=50.0, y=0.0)
    assert snapshot.last_scoring_cushion == Point(x=40.0, y=40.0)
    assert len(snapshot.cue_trajectory) >= 2
    assert snapshot.cue_trajectory[0] == strategy.cue
    assert snapshot.cue_trajectory[-1] == snapshot.impact
    assert snapshot.line_of_score[0] == snapshot.c3
    assert snapshot.line_of_score[-1] == snapshot.last_scoring_cushion


def test_host_entry_generate_trajectory_snapshot() -> None:
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    assert snapshot.strategy_ref == FIXTURE_STRATEGY_REF
    assert snapshot.cue_trajectory
    assert snapshot.line_of_score


def test_snapshot_frozen() -> None:
    snapshot = create_trajectory_generator(geometry=FixtureGeometryPort()).generate(
        make_fixture_strategy()
    )
    assert dataclasses.is_dataclass(snapshot)
    assert snapshot.__dataclass_params__.frozen is True  # type: ignore[attr-defined]
    with pytest.raises(dataclasses.FrozenInstanceError):
        snapshot.strategy_ref = StrategyRef("mutated")  # type: ignore[misc]


def test_no_side_effect_on_strategy() -> None:
    strategy = make_fixture_strategy()
    before = copy.deepcopy(strategy)
    create_trajectory_generator(geometry=FixtureGeometryPort()).generate(strategy)
    assert strategy == before


def test_invalid_strategy() -> None:
    engine = create_trajectory_generator(geometry=FixtureGeometryPort())
    with pytest.raises(InvalidAuthoringStrategy):
        engine.generate(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidAuthoringStrategy):
        engine.generate("not-a-strategy")  # type: ignore[arg-type]
    with pytest.raises(InvalidAuthoringStrategy):
        engine.generate(
            AuthoringStrategy(
                strategy_ref=StrategyRef(""),
                cue=Point(0, 0),
                target=Point(1, 1),
            )
        )


def test_invalid_geometry_consume_empty_cue_trajectory() -> None:
    bad = make_fixture_geometry_result()
    bad_result = GeometryConsumeResult(
        cue=bad.cue,
        impact=bad.impact,
        cue_trajectory=(),
        c3=bad.c3,
        last_scoring_cushion=bad.last_scoring_cushion,
        line_of_score=bad.line_of_score,
    )

    class _BadPort:
        def consume(self, strategy: AuthoringStrategy) -> GeometryConsumeResult:
            return bad_result

    with pytest.raises(InvalidGeometryConsume):
        create_trajectory_generator(geometry=_BadPort()).generate(make_fixture_strategy())


def test_invalid_geometry_endpoints_mismatch() -> None:
    bad = make_fixture_geometry_result()
    bad_result = GeometryConsumeResult(
        cue=bad.cue,
        impact=bad.impact,
        cue_trajectory=(Point(0, 0), bad.impact),  # does not start at cue
        c3=bad.c3,
        last_scoring_cushion=bad.last_scoring_cushion,
        line_of_score=bad.line_of_score,
    )

    class _BadPort:
        def consume(self, strategy: AuthoringStrategy) -> GeometryConsumeResult:
            return bad_result

    with pytest.raises(InvalidGeometryConsume):
        create_trajectory_generator(geometry=_BadPort()).generate(make_fixture_strategy())


def test_geometry_consume_failure_wrap() -> None:
    class _Broken:
        def consume(self, strategy: AuthoringStrategy) -> GeometryConsumeResult:
            raise RuntimeError("upstream geometry failed")

    with pytest.raises(GeometryConsumeFailure) as exc_info:
        create_trajectory_generator(geometry=_Broken()).generate(make_fixture_strategy())
    assert "upstream" in str(exc_info.value).lower()


def test_snapshot_fields_only() -> None:
    snapshot = create_trajectory_generator(geometry=FixtureGeometryPort()).generate(
        make_fixture_strategy()
    )
    fields = set(snapshot.__dataclass_fields__.keys())
    assert fields == {
        "strategy_ref",
        "cue_trajectory",
        "line_of_score",
        "impact",
        "c3",
        "last_scoring_cushion",
    }
    assert not hasattr(snapshot, "path_nodes")
    assert not hasattr(snapshot, "cue_set")
    assert not hasattr(snapshot, "second_set")
    assert not hasattr(snapshot, "envelope")


def test_no_forbidden_layer_calls() -> None:
    # Trajectory Generator package only (Host may orchestrate Cue Sampler).
    modules = (
        "generator.strategy",
        "generator.trajectory_generator.engine",
        "generator.trajectory_generator.snapshot",
        "generator.trajectory_generator.geometry",
        "generator.trajectory_generator.factory",
        "generator.trajectory_generator.interfaces",
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
            "from validation",
            "import validation",
            "PublishedDataset",
            "EnvelopeRecord",
            "KDTree",
            "trajectorySampleBuilder",
            "create_geometry_engine",
        ):
            assert banned not in src, f"{banned} found in {name}"
        assert "def sample_cue" not in src
        assert "def sample_second" not in src
        assert "def build_envelope" not in src