"""
Unit / regression tests — Ranking Engine.
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

from models import (  # noqa: E402
    MembershipCandidate,
    MembershipFlags,
    RecordIdentity,
    StrategyRef,
)
from search.ranking import (  # noqa: E402
    InvalidRankingInput,
    MembershipFlagsScoreModel,
    RankedCandidate,
    SCORE_MODEL_ID,
    create_ranking_engine,
)
from search.ranking.fixtures import (  # noqa: E402
    make_fixture_candidates,
    make_tie_candidates,
)


def test_score_model_is_independent_layer() -> None:
    candidate = make_fixture_candidates()[0]
    detail = MembershipFlagsScoreModel().score(candidate)
    assert detail.model_id == SCORE_MODEL_ID
    assert detail.total == 3.0
    assert detail.components["target_match"] == 1.0
    assert detail.components["cue_membership"] == 1.0
    assert detail.components["second_membership"] == 1.0


def test_rank_returns_ranked_candidates() -> None:
    engine = create_ranking_engine()
    ranked = engine.rank(make_fixture_candidates())
    assert len(ranked) == 3
    assert all(isinstance(item, RankedCandidate) for item in ranked)
    assert [item.rank for item in ranked] == [1, 2, 3]
    assert all(item.score_detail is not None for item in ranked)
    assert all(item.candidate_id for item in ranked)
    assert all(item.strategy_ref for item in ranked)


def test_ordering_higher_score_first() -> None:
    ranked = create_ranking_engine().rank(make_fixture_candidates())
    # alpha & gamma score 3.0; beta score 2.0 last
    assert ranked[-1].candidate_id == "fixture.rank.beta"
    assert ranked[-1].score == 2.0
    assert ranked[0].score == 3.0
    assert ranked[1].score == 3.0


def test_tie_break_by_record_identity() -> None:
    ranked = create_ranking_engine().rank(make_tie_candidates())
    assert [str(item.candidate_id) for item in ranked] == [
        "fixture.rank.alpha",
        "fixture.rank.mike",
        "fixture.rank.zulu",
    ]
    assert all(item.score == 3.0 for item in ranked)
    assert [str(item.tie_break_key) for item in ranked] == [
        "fixture.rank.alpha",
        "fixture.rank.mike",
        "fixture.rank.zulu",
    ]


def test_deterministic_same_input_same_output() -> None:
    engine = create_ranking_engine()
    candidates = make_fixture_candidates()
    first = engine.rank(candidates)
    second = engine.rank(candidates)
    assert first == second


def test_stable_sort_preserves_equal_key_relative_order() -> None:
    """
    When score and tie_break_key are identical (duplicate identity),
    stable sort keeps input relative order.
    """
    flags = MembershipFlags(True, True, True)
    a = MembershipCandidate(
        strategy_ref=StrategyRef("dup"),
        record_identity=RecordIdentity("dup"),
        membership=flags,
    )
    b = MembershipCandidate(
        strategy_ref=StrategyRef("dup"),
        record_identity=RecordIdentity("dup"),
        membership=flags,
    )
    # Distinct objects, equal keys — stable sort preserves a before b
    ranked = create_ranking_engine().rank([a, b])
    assert ranked[0].candidate is a
    assert ranked[1].candidate is b


def test_empty_input() -> None:
    assert create_ranking_engine().rank([]) == []


def test_invalid_input() -> None:
    engine = create_ranking_engine()
    with pytest.raises(InvalidRankingInput):
        engine.rank(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidRankingInput):
        engine.rank("bad")  # type: ignore[arg-type]
    with pytest.raises(InvalidRankingInput):
        engine.rank(["bad"])  # type: ignore[list-item]


def test_does_not_mutate_candidates() -> None:
    candidates = make_fixture_candidates()
    before = copy.deepcopy(candidates)
    create_ranking_engine().rank(candidates)
    assert candidates == before


def test_regression_membership_to_ranking_order() -> None:
    """Membership passers with mixed flags keep deterministic ranked order."""
    candidates = make_fixture_candidates()
    ranked = create_ranking_engine().rank(candidates)
    assert [str(item.strategy_ref) for item in ranked] == [
        "fixture.rank.alpha",
        "fixture.rank.gamma",
        "fixture.rank.beta",
    ]
    assert [item.rank for item in ranked] == [1, 2, 3]


def test_no_forbidden_layer_calls() -> None:
    modules = (
        "search.ranking.engine",
        "search.ranking.score",
        "search.ranking.models",
        "search.ranking.contract",
    )
    for name in modules:
        src = inspect.getsource(importlib.import_module(name))
        for banned in (
            "from generator",
            "import generator",
            "from resolve",
            "import resolve",
            "from runtime",
            "import runtime",
            "buildTrajectory",
            "evaluateStrategy",
            "from loader",
            "import loader",
        ):
            assert banned not in src, f"{banned} found in {name}"
