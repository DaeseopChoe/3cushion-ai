"""
Refinement Policy for Interpolation.

Mission 39 baseline: rank-continuity shrinkage.
Does not re-run Ranking or Membership.
Geometry metrics are out of scope.
"""

from __future__ import annotations

from typing import Protocol, Sequence, runtime_checkable

from search.ranking.models import RankedCandidate

from .contract import CONTINUITY_ALPHA, REFINEMENT_POLICY_ID
from .models import RefinementDetail


@runtime_checkable
class RefinementPolicy(Protocol):
    """Independent refinement policy. Engine consumes details only."""

    def refine(
        self,
        ranked: Sequence[RankedCandidate],
        index: int,
    ) -> RefinementDetail:
        ...


class RankContinuityRefinementPolicy:
    """
    Baseline Refinement Policy.

    Shrink each score toward the local neighborhood mean of Ranking scores:
        refined = (1 - α) * score + α * neighbor_mean

    Input order is preserved by the Engine (no re-sort).
    """

    policy_id = REFINEMENT_POLICY_ID

    def __init__(self, *, alpha: float = CONTINUITY_ALPHA) -> None:
        if not 0.0 <= alpha <= 1.0:
            raise ValueError("alpha must be in [0, 1]")
        self._alpha = alpha

    def refine(
        self,
        ranked: Sequence[RankedCandidate],
        index: int,
    ) -> RefinementDetail:
        current = ranked[index]
        base = float(current.score)
        neighbor_scores = self._neighbor_scores(ranked, index)
        neighbor_mean = sum(neighbor_scores) / len(neighbor_scores)
        refined = (1.0 - self._alpha) * base + self._alpha * neighbor_mean
        return RefinementDetail(
            policy_id=self.policy_id,
            components={
                "base_score": base,
                "neighbor_mean": neighbor_mean,
                "continuity_alpha": self._alpha,
                "continuity_delta": refined - base,
            },
            base_score=base,
            refined_score=refined,
        )

    @staticmethod
    def _neighbor_scores(
        ranked: Sequence[RankedCandidate],
        index: int,
    ) -> list[float]:
        scores = [float(item.score) for item in ranked]
        if len(scores) == 1:
            return [scores[0]]
        left = scores[index - 1] if index > 0 else scores[index + 1]
        right = scores[index + 1] if index + 1 < len(scores) else scores[index - 1]
        return [left, float(ranked[index].score), right]
