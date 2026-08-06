"""
Interpolation Engine — Refinement Layer.

RankedCandidate[] → RefinedCandidate[]

Does not re-run Ranking or Membership.
Does not mutate Dataset corpus, RankedCandidate, or MembershipCandidate.
Does not perform Geometry calculation.
"""

from __future__ import annotations

from typing import List, Sequence

from search.ranking.models import RankedCandidate

from .exceptions import InvalidInterpolationInput, InterpolationFailure
from .models import RefinedCandidate
from .policy import RankContinuityRefinementPolicy, RefinementPolicy


class DefaultInterpolationEngine:
    """
    Deterministic Interpolation / Refinement Engine.

    Preserves Ranking order. Applies RefinementPolicy per candidate only.
    """

    def __init__(self, *, policy: RefinementPolicy | None = None) -> None:
        self._policy = (
            policy if policy is not None else RankContinuityRefinementPolicy()
        )

    def refine(
        self,
        ranked: Sequence[RankedCandidate],
    ) -> List[RefinedCandidate]:
        if ranked is None:
            raise InvalidInterpolationInput("RankedCandidate list is required")
        if not isinstance(ranked, (list, tuple)):
            raise InvalidInterpolationInput("ranked must be a list or tuple")

        try:
            return self._refine(ranked)
        except InvalidInterpolationInput:
            raise
        except Exception as exc:  # noqa: BLE001
            raise InterpolationFailure(str(exc), cause=exc) from exc

    def _refine(
        self,
        ranked: Sequence[RankedCandidate],
    ) -> List[RefinedCandidate]:
        for index, item in enumerate(ranked):
            if not isinstance(item, RankedCandidate):
                raise InvalidInterpolationInput(
                    f"ranked[{index}] is not a RankedCandidate"
                )

        refined: List[RefinedCandidate] = []
        for index, item in enumerate(ranked):
            detail = self._policy.refine(ranked, index)
            refined.append(
                RefinedCandidate(
                    candidate_id=item.candidate_id,
                    strategy_ref=item.strategy_ref,
                    score=item.score,
                    refined_score=detail.refined_score,
                    refinement_detail=detail,
                    ranked=item,
                )
            )
        return refined
