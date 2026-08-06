"""
Ranking Engine — Ordering Layer.

MembershipCandidate[] → RankedCandidate[]

Does not call Membership, Resolve, Geometry metrics, or Generator.
Does not mutate MembershipCandidate or PublishedDataset.
"""

from __future__ import annotations

from typing import List, Sequence

from models import MembershipCandidate, RecordIdentity

from .exceptions import InvalidRankingInput, RankingFailure
from .models import RankedCandidate, ScoreDetail
from .score import MembershipFlagsScoreModel, ScoreModel


def _tie_break_key(candidate: MembershipCandidate) -> RecordIdentity:
    """Tie-break uses record_identity (stable, lexicographic)."""
    return RecordIdentity(str(candidate.record_identity))


class DefaultRankingEngine:
    """
    Deterministic Ranking Engine.

    Ordering key: (-score, tie_break_key)
    Python sorted() is stable; equal keys preserve relative input order.
    """

    def __init__(self, *, score_model: ScoreModel | None = None) -> None:
        self._score_model = (
            score_model if score_model is not None else MembershipFlagsScoreModel()
        )

    def rank(
        self,
        candidates: Sequence[MembershipCandidate],
    ) -> List[RankedCandidate]:
        if candidates is None:
            raise InvalidRankingInput("MembershipCandidate list is required")
        if not isinstance(candidates, (list, tuple)):
            raise InvalidRankingInput("candidates must be a list or tuple")

        try:
            return self._rank(candidates)
        except InvalidRankingInput:
            raise
        except Exception as exc:  # noqa: BLE001
            raise RankingFailure(str(exc), cause=exc) from exc

    def _rank(
        self,
        candidates: Sequence[MembershipCandidate],
    ) -> List[RankedCandidate]:
        scored: list[tuple[float, str, MembershipCandidate, ScoreDetail]] = []
        for index, candidate in enumerate(candidates):
            if not isinstance(candidate, MembershipCandidate):
                raise InvalidRankingInput(
                    f"candidates[{index}] is not a MembershipCandidate"
                )
            detail = self._score_model.score(candidate)
            tie_key = str(_tie_break_key(candidate))
            scored.append((detail.total, tie_key, candidate, detail))

        # Higher score first; equal score → lexicographic record_identity.
        # sorted is stable for equal (-score, tie_key) pairs.
        ordered = sorted(scored, key=lambda item: (-item[0], item[1]))

        ranked: List[RankedCandidate] = []
        for rank_index, (score, _tie, candidate, detail) in enumerate(ordered, start=1):
            candidate_id = RecordIdentity(str(candidate.record_identity))
            ranked.append(
                RankedCandidate(
                    candidate_id=candidate_id,
                    strategy_ref=candidate.strategy_ref,
                    score=score,
                    rank=rank_index,
                    score_detail=detail,
                    candidate=candidate,
                    tie_break_key=candidate_id,
                )
            )
        return ranked
