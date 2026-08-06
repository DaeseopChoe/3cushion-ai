"""Factory for Trajectory Generator."""

from __future__ import annotations

from .engine import DefaultTrajectoryGenerator
from .interfaces import GeometryConsumePort, TrajectoryGenerator


def create_trajectory_generator(
    *, geometry: GeometryConsumePort
) -> TrajectoryGenerator:
    """Create DefaultTrajectoryGenerator bound to a Geometry consume port."""
    return DefaultTrajectoryGenerator(geometry=geometry)
