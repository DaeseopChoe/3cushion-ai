"""
Interpolation Engine — refinement of RankedCandidate[].

Ranking remains the ordering authority.
Interpolation only refines scores into RefinedCandidate[].
"""

from .contract import CONTINUITY_ALPHA, REFINEMENT_POLICY_ID
from .engine import DefaultInterpolationEngine
from .exceptions import (
    InterpolationError,
    InterpolationFailure,
    InvalidInterpolationInput,
)
from .factory import create_interpolation_engine
from .models import RefinedCandidate, RefinementDetail
from .policy import RankContinuityRefinementPolicy, RefinementPolicy

__all__ = [
    "CONTINUITY_ALPHA",
    "DefaultInterpolationEngine",
    "InterpolationError",
    "InterpolationFailure",
    "InvalidInterpolationInput",
    "REFINEMENT_POLICY_ID",
    "RankContinuityRefinementPolicy",
    "RefinedCandidate",
    "RefinementDetail",
    "RefinementPolicy",
    "create_interpolation_engine",
]
