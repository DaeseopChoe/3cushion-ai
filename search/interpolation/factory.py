"""Factory for Interpolation Engine."""

from __future__ import annotations

from .engine import DefaultInterpolationEngine
from .policy import RankContinuityRefinementPolicy, RefinementPolicy


def create_interpolation_engine(
    *,
    policy: RefinementPolicy | None = None,
) -> DefaultInterpolationEngine:
    """Create DefaultInterpolationEngine with optional RefinementPolicy."""
    return DefaultInterpolationEngine(
        policy=policy if policy is not None else RankContinuityRefinementPolicy()
    )
