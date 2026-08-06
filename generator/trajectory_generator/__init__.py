"""
Trajectory Generator — Strategy → Trajectory Snapshot.

Consumes Impact SSOT / buildTrajectory via GeometryConsumePort.
Does not reimplement Formula, Builder, Reflection, Display Cap, or Extension.
Does not sample cueSet/secondSet or persist Dataset records.
"""

from .engine import DefaultTrajectoryGenerator
from .exceptions import (
    GeometryConsumeFailure,
    InvalidGeometryConsume,
    InvalidTrajectorySnapshot,
    TrajectoryGeneratorError,
)
from .factory import create_trajectory_generator
from .geometry import GeometryConsumeResult
from .interfaces import GeometryConsumePort, TrajectoryGenerator
from .snapshot import TrajectorySnapshot

__all__ = [
    "DefaultTrajectoryGenerator",
    "GeometryConsumeFailure",
    "GeometryConsumePort",
    "GeometryConsumeResult",
    "InvalidGeometryConsume",
    "InvalidTrajectorySnapshot",
    "TrajectoryGenerator",
    "TrajectoryGeneratorError",
    "TrajectorySnapshot",
    "create_trajectory_generator",
]
