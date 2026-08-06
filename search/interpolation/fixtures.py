"""Fixtures for Interpolation Engine tests."""

from __future__ import annotations

from models import (
    MembershipCandidate,
    MembershipFlags,
    RecordIdentity,
    StrategyRef,
)
from search.ranking import create_ranking_engine
from search.ranking.models import RankedCandidate


def _membership_candidate(
    sid: str,
    *,
    cue: bool = True,
) -> MembershipCandidate:
    return MembershipCandidate(
        strategy_ref=StrategyRef(sid),
        record_identity=RecordIdentity(sid),
        membership=MembershipFlags(
            target_match=True,
            cue_membership=cue,
            second_membership=True,
        ),
    )


def make_fixture_ranked_candidates() -> list[RankedCandidate]:
    """Ranked candidates with mixed scores for refinement tests."""
    membership = [
        _membership_candidate("fixture.interp.gamma"),
        _membership_candidate("fixture.interp.beta", cue=False),
        _membership_candidate("fixture.interp.alpha"),
    ]
    return create_ranking_engine().rank(membership)
