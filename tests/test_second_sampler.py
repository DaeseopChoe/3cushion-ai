"""
Unit tests — Second Sampler (TrajectorySnapshot → secondSet, SP-S-01…06).
"""

from __future__ import annotations

import copy
import dataclasses
import importlib
import inspect
import math
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator.fixtures import make_fixture_snapshot  # noqa: E402
from generator.second_sampler import (  # noqa: E402
    SECOND_STEP_GRID,
    SECOND_T_MAX,
    InvalidSecondSnapshot,
    SecondSamplingFailure,
    SecondSetResult,
    create_second_sampler,
)
from generator.second_sampler.sampling import (  # noqa: E402
    point_at_arc_length,
    polyline_length,
    sample_second_segment,
)
from generator.trajectory_generator.snapshot import TrajectorySnapshot  # noqa: E402
from models import Point, StrategyRef  # noqa: E402


def _dist(a: Point, b: Point) -> float:
    return math.hypot(b.x - a.x, b.y - a.y)


def test_policy_constants() -> None:
    assert SECOND_T_MAX == 1.0
    assert SECOND_STEP_GRID == 1.5


def test_sample_second_set_from_snapshot() -> None:
    snapshot = make_fixture_snapshot()
    result = create_second_sampler().sample(snapshot)

    assert isinstance(result, SecondSetResult)
    assert result.strategy_ref == snapshot.strategy_ref
    assert len(result.second_set) >= 2
    # SP-S-05 endpoints
    assert result.second_set[0] == snapshot.line_of_score[0]
    assert result.second_set[0] == snapshot.c3
    assert result.second_set[-1] == snapshot.line_of_score[-1]
    assert result.second_set[-1] == snapshot.last_scoring_cushion


def test_sp_s_01_full_line_of_score_domain() -> None:
    snapshot = make_fixture_snapshot()
    result = create_second_sampler().sample(snapshot)
    total = polyline_length(snapshot.line_of_score)
    end = point_at_arc_length(snapshot.line_of_score, total)
    assert result.second_set[-1] == end


def test_sp_s_04_step_spacing() -> None:
    # Straight LOS so Euclidean spacing equals arc step.
    los = (Point(0.0, 0.0), Point(9.0, 0.0))
    second_set = sample_second_segment(los)
    for i in range(1, len(second_set) - 1):
        assert _dist(second_set[i - 1], second_set[i]) == pytest.approx(
            SECOND_STEP_GRID, abs=1e-9
        )
    # Last gap to endpoint may be shorter than step.
    assert _dist(second_set[-2], second_set[-1]) <= SECOND_STEP_GRID + 1e-9


def test_short_segment_endpoints_only() -> None:
    # L = 1.0 < step 1.5 → start + end only
    los = (Point(0.0, 0.0), Point(1.0, 0.0))
    second_set = sample_second_segment(los)
    assert len(second_set) == 2
    assert second_set[0] == Point(0.0, 0.0)
    assert second_set[-1] == Point(1.0, 0.0)


def test_independent_of_cue_trajectory() -> None:
    snapshot = make_fixture_snapshot()
    before = copy.deepcopy(snapshot)
    create_second_sampler().sample(snapshot)
    assert snapshot == before

    other = TrajectorySnapshot(
        strategy_ref=snapshot.strategy_ref,
        cue_trajectory=(Point(0, 0), Point(100, 100)),
        line_of_score=snapshot.line_of_score,
        impact=Point(99, 99),
        c3=snapshot.c3,
        last_scoring_cushion=snapshot.last_scoring_cushion,
    )
    a = create_second_sampler().sample(snapshot)
    b = create_second_sampler().sample(other)
    assert a.second_set == b.second_set


def test_invalid_snapshot() -> None:
    sampler = create_second_sampler()
    with pytest.raises(InvalidSecondSnapshot):
        sampler.sample(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidSecondSnapshot):
        sampler.sample("nope")  # type: ignore[arg-type]
    bad = make_fixture_snapshot()
    with pytest.raises(InvalidSecondSnapshot):
        sampler.sample(
            TrajectorySnapshot(
                strategy_ref=StrategyRef(""),
                cue_trajectory=bad.cue_trajectory,
                line_of_score=bad.line_of_score,
                impact=bad.impact,
                c3=bad.c3,
                last_scoring_cushion=bad.last_scoring_cushion,
            )
        )
    with pytest.raises(InvalidSecondSnapshot):
        sampler.sample(
            TrajectorySnapshot(
                strategy_ref=StrategyRef("x"),
                cue_trajectory=bad.cue_trajectory,
                line_of_score=(Point(1, 1),),
                impact=bad.impact,
                c3=bad.c3,
                last_scoring_cushion=bad.last_scoring_cushion,
            )
        )


def test_result_frozen() -> None:
    result = create_second_sampler().sample(make_fixture_snapshot())
    assert dataclasses.is_dataclass(result)
    assert result.__dataclass_params__.frozen is True  # type: ignore[attr-defined]
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.strategy_ref = StrategyRef("mut")  # type: ignore[misc]


def test_sampling_failure_wrap() -> None:
    from generator.second_sampler.engine import DefaultSecondSampler
    import generator.second_sampler.engine as eng

    sampler = DefaultSecondSampler()
    snap = make_fixture_snapshot()
    original = eng.sample_second_segment

    def _raise(*_a, **_k):
        raise RuntimeError("boom")

    eng.sample_second_segment = _raise  # type: ignore[assignment]
    try:
        with pytest.raises(SecondSamplingFailure):
            sampler.sample(snap)
    finally:
        eng.sample_second_segment = original  # type: ignore[assignment]


def test_no_cue_sampler_dependency() -> None:
    src = inspect.getsource(importlib.import_module("generator.second_sampler.engine"))
    assert "cue_sampler" not in src
    assert "CueSet" not in src
    assert "sample_cue" not in src


def test_no_forbidden_layer_calls() -> None:
    modules = (
        "generator.second_sampler.engine",
        "generator.second_sampler.sampling",
        "generator.second_sampler.policy",
        "generator.second_sampler.result",
        "generator.second_sampler.factory",
        "generator.second_sampler.interfaces",
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
            "from generator.cue_sampler",
            "import cue_sampler",
            "PublishedDataset",
            "EnvelopeRecord",
            "KDTree",
            "trajectorySampleBuilder",
            "create_trajectory_generator",
            "DefaultTrajectoryGenerator",
            "sample_cue",
            "build_envelope",
        ):
            assert banned not in src, f"{banned} found in {name}"
        assert "from generator.cue_sampler" not in src
