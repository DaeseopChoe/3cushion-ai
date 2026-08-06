"""
Cue Sampling Policy constants (SP-C-*).

Policy is Architecture Rule SSOT executed by Cue Sampler.
Sampler owns execution only — not Policy authorship (AR-07).
"""

from __future__ import annotations

# SP-C-01 — sample parameter domain along Cue→Impact
CUE_T_MIN: float = 0.0
CUE_T_MAX: float = 1.0 / 3.0

# SP-C-03 — sampling step in table grid units
CUE_STEP_GRID: float = 1.5
