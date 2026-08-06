"""
Cue Sampler — TrajectorySnapshot → cueSet (SP-C-01…05).

Consumes cue_trajectory only. No Geometry / Trajectory / Envelope / Dataset emit.
"""

from .engine import DefaultCueSampler
from .exceptions import CueSamplerError, CueSamplingFailure, InvalidCueSnapshot
from .factory import create_cue_sampler
from .interfaces import CueSampler
from .policy import CUE_STEP_GRID, CUE_T_MAX, CUE_T_MIN
from .result import CueSetResult

__all__ = [
    "CUE_STEP_GRID",
    "CUE_T_MAX",
    "CUE_T_MIN",
    "CueSampler",
    "CueSamplerError",
    "CueSamplingFailure",
    "CueSetResult",
    "DefaultCueSampler",
    "InvalidCueSnapshot",
    "create_cue_sampler",
]
