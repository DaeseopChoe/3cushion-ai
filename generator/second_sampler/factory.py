"""Factory for Second Sampler."""

from __future__ import annotations

from .engine import DefaultSecondSampler
from .interfaces import SecondSampler


def create_second_sampler() -> SecondSampler:
    """Create DefaultSecondSampler (SP-S Policy executor)."""
    return DefaultSecondSampler()
