"""Ranking Engine models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Tuple

from models import MembershipCandidate, RecordIdentity, StrategyRef


@dataclass(frozen=True)
class ScoreDetail:
    """
    Deterministic score breakdown.

    Extensible: future Geometry / Interpolation metrics may add keys
    without changing RankedCandidate shape.
    """

    model_id: str
    components: Mapping[str, float]
    total: float


@dataclass(frozen=True)
class RankedCandidate:
    """Ordered MembershipCandidate with ranking metadata."""

    candidate_id: RecordIdentity
    strategy_ref: StrategyRef
    score: float
    rank: int
    score_detail: ScoreDetail
    candidate: MembershipCandidate
    tie_break_key: RecordIdentity
