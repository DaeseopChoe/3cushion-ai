"""Factory for Ranking Engine."""

from __future__ import annotations

from .engine import DefaultRankingEngine
from .score import MembershipFlagsScoreModel, ScoreModel


def create_ranking_engine(
    *,
    score_model: ScoreModel | None = None,
) -> DefaultRankingEngine:
    """Create DefaultRankingEngine with optional ScoreModel override."""
    return DefaultRankingEngine(
        score_model=score_model if score_model is not None else MembershipFlagsScoreModel()
    )
