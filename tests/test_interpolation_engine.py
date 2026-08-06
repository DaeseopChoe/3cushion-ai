"""
Unit / regression tests — Interpolation Engine.
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
    EnvelopeRecord,
    Point,
    PublishedDataset,
    StrategyRef,
)
from search.interpolation import (  # noqa: E402
    CONTINUITY_ALPHA,
    InvalidInterpolationInput,
    REFINEMENT_POLICY_ID,
    RankContinuityRefinementPolicy,
    RefinedCandidate,
    create_interpolation_engine,
)
from search.interpolation.fixtures import make_fixture_ranked_candidates  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402
from search.ranking.fixtures import make_fixture_candidates  # noqa: E402


def test_refine_returns_refined_candidates() -> None:
    ranked = make_fixture_ranked_candidates()
    refined = create_interpolation_engine().refine(ranked)
    assert len(refined) == len(ranked)
    assert all(isinstance(item, RefinedCandidate) for item in refined)
    assert all(item.refinement_detail is not None for item in refined)
    assert all(item.candidate_id for item in refined)
    assert all(item.strategy_ref for item in refined)


def test_preserves_ranking_order_no_rerank() -> None:
    ranked = make_fixture_ranked_candidates()
    refined = create_interpolation_engine().refine(ranked)
    assert [str(item.candidate_id) for item in refined] == [
        str(item.candidate_id) for item in ranked
    ]
    assert [item.score for item in refined] == [item.score for item in ranked]


def test_refinement_detail_and_policy_id() -> None:
    ranked = make_fixture_ranked_candidates()
    refined = create_interpolation_engine().refine(ranked)
    for item in refined:
        assert item.refinement_detail.policy_id == REFINEMENT_POLICY_ID
        assert item.refinement_detail.base_score == item.score
        assert item.refined_score == item.refinement_detail.refined_score
        assert "continuity_alpha" in item.refinement_detail.components
        assert item.refinement_detail.components["continuity_alpha"] == CONTINUITY_ALPHA


def test_rank_continuity_policy_shrinks_toward_neighbors() -> None:
    ranked = make_fixture_ranked_candidates()
    policy = RankContinuityRefinementPolicy(alpha=0.5)
    detail = policy.refine(ranked, 0)
    # With alpha=0.5, refined is midpoint of base and neighbor_mean
    expected = 0.5 * detail.base_score + 0.5 * detail.components["neighbor_mean"]
    assert detail.refined_score == pytest.approx(expected)


def test_deterministic_same_input_same_output() -> None:
    engine = create_interpolation_engine()
    ranked = make_fixture_ranked_candidates()
    assert engine.refine(ranked) == engine.refine(ranked)


def test_empty_input() -> None:
    assert create_interpolation_engine().refine([]) == []


def test_invalid_input() -> None:
    engine = create_interpolation_engine()
    with pytest.raises(InvalidInterpolationInput):
        engine.refine(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidInterpolationInput):
        engine.refine("bad")  # type: ignore[arg-type]
    with pytest.raises(InvalidInterpolationInput):
        engine.refine(["bad"])  # type: ignore[list-item]


def test_does_not_mutate_ranked_candidates() -> None:
    ranked = make_fixture_ranked_candidates()
    before = copy.deepcopy(ranked)
    create_interpolation_engine().refine(ranked)
    assert ranked == before


def test_immutable_published_dataset_rule() -> None:
    """Interpolation never reads or writes PublishedDataset."""
    dataset = PublishedDataset(
        records=[
            EnvelopeRecord(
                strategy_ref=StrategyRef("s1"),
                target=Point(1.0, 2.0),
                cue_set=[Point(0.0, 0.0)],
                second_set=[Point(3.0, 4.0)],
            )
        ]
    )
    before = copy.deepcopy(dataset)
    ranked = create_ranking_engine().rank(make_fixture_candidates())
    create_interpolation_engine().refine(ranked)
    assert dataset == before

    src = inspect.getsource(importlib.import_module("search.interpolation.engine"))
    assert "PublishedDataset" not in src


def test_regression_ranking_to_interpolation_pipeline() -> None:
    membership = make_fixture_candidates()
    ranked = create_ranking_engine().rank(membership)
    refined = create_interpolation_engine().refine(ranked)
    assert len(refined) == len(ranked)
    assert [str(item.strategy_ref) for item in refined] == [
        str(item.strategy_ref) for item in ranked
    ]
    # Lower-score edge candidate is pulled toward neighborhood mean
    last = refined[-1]
    assert last.score == 2.0
    assert last.refined_score > last.score


def test_no_forbidden_layer_calls() -> None:
    modules = (
        "search.interpolation.engine",
        "search.interpolation.policy",
        "search.interpolation.models",
        "search.interpolation.contract",
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
            "from membership",
            "import membership",
            "from loader",
            "import loader",
            "buildTrajectory",
            "create_ranking_engine",
            "DefaultRankingEngine",
            "match_record",
        ):
            assert banned not in src, f"{banned} found in {name}"
