"""
Unit tests — Cue Sampler (TrajectorySnapshot → cueSet, SP-C-01…05).
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

from generator.cue_sampler import (  # noqa: E402
    CUE_STEP_GRID,
    CUE_T_MAX,
    CueSamplingFailure,
    CueSetResult,
    InvalidCueSnapshot,
    create_cue_sampler,
)
from generator.cue_sampler.sampling import (  # noqa: E402
    point_at_arc_length,
    polyline_length,
    sample_cue_segment,
)
from generator.fixtures import make_fixture_snapshot  # noqa: E402
from generator.trajectory_generator.snapshot import TrajectorySnapshot  # noqa: E402
from models import Point, StrategyRef  # noqa: E402


def _dist(a: Point, b: Point) -> float:
    return math.hypot(b.x - a.x, b.y - a.y)


def test_policy_constants() -> None:
    assert CUE_T_MAX == pytest.approx(1.0 / 3.0)
    assert CUE_STEP_GRID == 1.5


def test_sample_cue_set_from_snapshot() -> None:
    snapshot = make_fixture_snapshot()
    result = create_cue_sampler().sample(snapshot)

    assert isinstance(result, CueSetResult)
    assert result.strategy_ref == snapshot.strategy_ref
    assert len(result.cue_set) >= 2
    # SP-C-04 endpoints
    assert result.cue_set[0] == snapshot.cue_trajectory[0]
    expected_end = point_at_arc_length(
        snapshot.cue_trajectory,
        polyline_length(snapshot.cue_trajectory) * CUE_T_MAX,
    )
    assert result.cue_set[-1] == expected_end


def test_sp_c_02_impact_not_in_cue_set() -> None:
    """Full Cue→Impact sampling forbidden — impact must not appear as cueSet end."""
    snapshot = make_fixture_snapshot()
    result = create_cue_sampler().sample(snapshot)
    assert result.cue_set[-1] != snapshot.impact
    for p in result.cue_set:
        assert not (abs(p.x - snapshot.impact.x) < 1e-9 and abs(p.y - snapshot.impact.y) < 1e-9)


def test_sp_c_03_step_spacing() -> None:
    snapshot = make_fixture_snapshot()
    result = create_cue_sampler().sample(snapshot)
    # Interior consecutive samples should be ~1.5 apart along path
    for i in range(1, len(result.cue_set) - 1):
        assert _dist(result.cue_set[i - 1], result.cue_set[i]) == pytest.approx(
            CUE_STEP_GRID, abs=1e-9
        )


def test_short_segment_endpoints_only() -> None:
    # L = 3, L/3 = 1 < step 1.5 → start + end only
    traj = (Point(0.0, 0.0), Point(3.0, 0.0))
    cue_set = sample_cue_segment(traj)
    assert len(cue_set) == 2
    assert cue_set[0] == Point(0.0, 0.0)
    assert cue_set[-1] == Point(1.0, 0.0)


def test_does_not_use_line_of_score_or_mutate_snapshot() -> None:
    snapshot = make_fixture_snapshot()
    before = copy.deepcopy(snapshot)
    create_cue_sampler().sample(snapshot)
    assert snapshot == before
    # line_of_score unused — mutating a copy's line_of_score would not matter;
    # engine only reads cue_trajectory (verified by equal result when LOS differs).
    other = TrajectorySnapshot(
        strategy_ref=snapshot.strategy_ref,
        cue_trajectory=snapshot.cue_trajectory,
        line_of_score=(Point(0, 0), Point(1, 1)),
        impact=snapshot.impact,
        c3=Point(9, 9),
        last_scoring_cushion=Point(8, 8),
    )
    a = create_cue_sampler().sample(snapshot)
    b = create_cue_sampler().sample(other)
    assert a.cue_set == b.cue_set


def test_invalid_snapshot() -> None:
    sampler = create_cue_sampler()
    with pytest.raises(InvalidCueSnapshot):
        sampler.sample(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidCueSnapshot):
        sampler.sample("nope")  # type: ignore[arg-type]
    bad = make_fixture_snapshot()
    with pytest.raises(InvalidCueSnapshot):
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
    with pytest.raises(InvalidCueSnapshot):
        sampler.sample(
            TrajectorySnapshot(
                strategy_ref=StrategyRef("x"),
                cue_trajectory=(Point(1, 1),),
                line_of_score=bad.line_of_score,
                impact=bad.impact,
                c3=bad.c3,
                last_scoring_cushion=bad.last_scoring_cushion,
            )
        )


def test_full_path_sampling_rejected() -> None:
    traj = (Point(0, 0), Point(9, 0))
    with pytest.raises(ValueError):
        sample_cue_segment(traj, t_max=1.0)


def test_result_frozen() -> None:
    result = create_cue_sampler().sample(make_fixture_snapshot())
    assert dataclasses.is_dataclass(result)
    assert result.__dataclass_params__.frozen is True  # type: ignore[attr-defined]
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.strategy_ref = StrategyRef("mut")  # type: ignore[misc]


def test_sampling_failure_wrap() -> None:
    class _Boom:
        cue_trajectory = (Point(0, 0), Point(1, 0))
        strategy_ref = StrategyRef("x")

        def __getattribute__(self, name: str):
            if name == "cue_trajectory":
                raise RuntimeError("boom")
            return object.__getattribute__(self, name)

    # Invalid type still caught first; force engine path via real snapshot + monkeypatch
    from generator.cue_sampler.engine import DefaultCueSampler

    sampler = DefaultCueSampler()
    snap = make_fixture_snapshot()

    import generator.cue_sampler.engine as eng

    original = eng.sample_cue_segment

    def _raise(*_a, **_k):
        raise RuntimeError("boom")

    eng.sample_cue_segment = _raise  # type: ignore[assignment]
    try:
        with pytest.raises(CueSamplingFailure):
            sampler.sample(snap)
    finally:
        eng.sample_cue_segment = original  # type: ignore[assignment]


def test_no_forbidden_layer_calls() -> None:
    modules = (
        "generator.cue_sampler.engine",
        "generator.cue_sampler.sampling",
        "generator.cue_sampler.policy",
        "generator.cue_sampler.result",
        "generator.cue_sampler.factory",
        "generator.cue_sampler.interfaces",
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
            "create_trajectory_generator",
            "DefaultTrajectoryGenerator",
            "line_of_score",
            "sample_second",
            "build_envelope",
        ):
            assert banned not in src, f"{banned} found in {name}"
