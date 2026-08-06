"""
Deterministic Score Model for Ranking.

Mission 38 baseline: Membership flag contributions only.
Future Geometry metric scorers are explicit extension points
(not implemented here).
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from models import MembershipCandidate

from .contract import (
    SCORE_MODEL_ID,
    WEIGHT_CUE_MEMBERSHIP,
    WEIGHT_SECOND_MEMBERSHIP,
    WEIGHT_TARGET_MATCH,
)
from .models import ScoreDetail


@runtime_checkable
class ScoreModel(Protocol):
    """Independent scoring layer. Ranking Engine consumes scores only."""

    def score(self, candidate: MembershipCandidate) -> ScoreDetail:
        ...


class MembershipFlagsScoreModel:
    """
    Baseline Score Model.

    score = Σ (flag * weight) for Target / Cue / Second membership axes.
    Future GeometryMetricScoreModel can implement the same ScoreModel protocol.
    """

    model_id = SCORE_MODEL_ID

    def score(self, candidate: MembershipCandidate) -> ScoreDetail:
        flags = candidate.membership
        components = {
            "target_match": WEIGHT_TARGET_MATCH if flags.target_match else 0.0,
            "cue_membership": WEIGHT_CUE_MEMBERSHIP if flags.cue_membership else 0.0,
            "second_membership": (
                WEIGHT_SECOND_MEMBERSHIP if flags.second_membership else 0.0
            ),
        }
        total = sum(components.values())
        return ScoreDetail(
            model_id=self.model_id,
            components=components,
            total=total,
        )
