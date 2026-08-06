"""
Second Sampler — TrajectorySnapshot → secondSet (SP-S-01…06).

Consumes line_of_score only. Independent of Cue Sampler.
No Geometry / Trajectory / Envelope / Dataset emit.
"""

from .engine import DefaultSecondSampler
from .exceptions import (
    InvalidSecondSnapshot,
    SecondSamplerError,
    SecondSamplingFailure,
)
from .factory import create_second_sampler
from .interfaces import SecondSampler
from .policy import SECOND_STEP_GRID, SECOND_T_MAX, SECOND_T_MIN
from .result import SecondSetResult

__all__ = [
    "SECOND_STEP_GRID",
    "SECOND_T_MAX",
    "SECOND_T_MIN",
    "DefaultSecondSampler",
    "InvalidSecondSnapshot",
    "SecondSampler",
    "SecondSamplerError",
    "SecondSamplingFailure",
    "SecondSetResult",
    "create_second_sampler",
]
