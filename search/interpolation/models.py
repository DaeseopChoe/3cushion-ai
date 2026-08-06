"""Interpolation Engine models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from models import RecordIdentity, StrategyRef
from search.ranking.models import RankedCandidate


@dataclass(frozen=True)
class RefinementDetail:
    """
    Deterministic refinement breakdown.

    Extensible: future Geometry metrics may add keys without
    changing RefinedCandidate shape.
    """

    policy_id: str
    components: Mapping[str, float]
    base_score: float
    refined_score: float


@dataclass(frozen=True)
class RefinedCandidate:
    """RankedCandidate after Interpolation refinement."""

    candidate_id: RecordIdentity
    strategy_ref: StrategyRef
    score: float
    refined_score: float
    refinement_detail: RefinementDetail
    ranked: RankedCandidate
