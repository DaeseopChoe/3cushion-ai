"""Interpolation Engine contract constants."""

from __future__ import annotations

REFINEMENT_POLICY_ID = "rank_continuity_v1"

# Shrinkage toward local ranked-score neighborhood (0 = pass-through, 1 = full blend).
CONTINUITY_ALPHA = 0.25
