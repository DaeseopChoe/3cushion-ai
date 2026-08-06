"""Fixtures for Ranking Engine tests."""

from __future__ import annotations

from models import (
    DatasetIdentity,
    MembershipCandidate,
    MembershipFlags,
    RecordIdentity,
    StrategyRef,
)


def _candidate(
    sid: str,
    *,
    target: bool = True,
    cue: bool = True,
    second: bool = True,
) -> MembershipCandidate:
    return MembershipCandidate(
        strategy_ref=StrategyRef(sid),
        record_identity=RecordIdentity(sid),
        membership=MembershipFlags(
            target_match=target,
            cue_membership=cue,
            second_membership=second,
        ),
        dataset_identity=DatasetIdentity("ds-rank"),
    )


def make_fixture_candidates() -> list[MembershipCandidate]:
    """
    Mixed scores for ordering tests.

    - alpha: all True → score 3.0
    - beta:  cue False → score 2.0
    - gamma: all True → score 3.0 (tie with alpha; order by id)
    """
    return [
        _candidate("fixture.rank.gamma"),
        _candidate("fixture.rank.beta", cue=False),
        _candidate("fixture.rank.alpha"),
    ]


def make_tie_candidates() -> list[MembershipCandidate]:
    """Same score; deterministic tie-break by record_identity."""
    return [
        _candidate("fixture.rank.zulu"),
        _candidate("fixture.rank.alpha"),
        _candidate("fixture.rank.mike"),
    ]
