"""
Ranking Engine — deterministic ordering of MembershipCandidate[].

Membership remains the contract gate.
Ranking only orders candidates that already passed Membership.
"""

from .contract import SCORE_MODEL_ID
from .engine import DefaultRankingEngine
from .exceptions import InvalidRankingInput, RankingError, RankingFailure
from .factory import create_ranking_engine
from .models import RankedCandidate, ScoreDetail
from .score import MembershipFlagsScoreModel, ScoreModel

__all__ = [
    "DefaultRankingEngine",
    "InvalidRankingInput",
    "MembershipFlagsScoreModel",
    "RankedCandidate",
    "RankingError",
    "RankingFailure",
    "SCORE_MODEL_ID",
    "ScoreDetail",
    "ScoreModel",
    "create_ranking_engine",
]
