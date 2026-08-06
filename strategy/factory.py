"""
Strategy Repository factory.
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional

from models import StrategyRef

from .interfaces import StrategyRepository
from .models import StrategyHandle
from .repository import MemoryStrategyRepository


def create_strategy_repository(
    strategies: Optional[Mapping[StrategyRef, StrategyHandle]] = None,
    *,
    seed: Optional[Iterable[StrategyHandle]] = None,
) -> StrategyRepository:
    """
    Create a read-only MemoryStrategyRepository.

    Optionally seed from a mapping and/or iterable of FrozenStrategy handles.
    """
    return MemoryStrategyRepository(strategies, seed=seed)
