"""Factory for Cue Sampler."""

from __future__ import annotations

from .engine import DefaultCueSampler
from .interfaces import CueSampler


def create_cue_sampler() -> CueSampler:
    """Create DefaultCueSampler (SP-C Policy executor)."""
    return DefaultCueSampler()
