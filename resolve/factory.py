"""
Resolve Engine factory.
"""

from __future__ import annotations

from typing import Mapping, Optional

from models import StrategyRef

from .engine import DefaultResolveEngine
from .interfaces import ResolveEngine, Strategy
from .repository import MemoryStrategyRepository, StrategyRepository


def create_memory_repository(
    strategies: Optional[Mapping[StrategyRef, Strategy]] = None,
) -> MemoryStrategyRepository:
    """Return a read-only in-memory StrategyRepository (seeded optionally)."""
    return MemoryStrategyRepository(strategies)


def create_resolve_engine(repository: StrategyRepository) -> ResolveEngine:
    """Return the repository Resolve Engine bound to the given Repository."""
    return DefaultResolveEngine(repository)
