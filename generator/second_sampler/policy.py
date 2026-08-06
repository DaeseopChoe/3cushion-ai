"""
Second Sampling Policy constants (SP-S-*).

Policy is Architecture Rule SSOT executed by Second Sampler.
Sampler owns execution only — not Policy authorship (AR-07).
"""

from __future__ import annotations

# SP-S-01 — Line of Score domain is the full C3 → last scoring cushion polyline
# (t ∈ [0, 1] along line_of_score; Trajectory Generator supplies LOS without
# post-score overlay geometry).
SECOND_T_MIN: float = 0.0
SECOND_T_MAX: float = 1.0

# SP-S-04 — sampling step in table grid units
SECOND_STEP_GRID: float = 1.5
