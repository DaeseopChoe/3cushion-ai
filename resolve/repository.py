"""
Strategy Repository — read-only lookup for Resolve.

Protocol + in-memory implementation only.
No DB, file, network, or cache backends.
No write API.
"""

from __future__ import annotations

from typing import Mapping, Optional, Protocol, runtime_checkable

from models import StrategyRef

from .exceptions import StrategyNotFound
from .interfaces import Strategy


@runtime_checkable
class StrategyRepository(Protocol):
    """
    Read-only Strategy corpus for Resolve.

    lookup(strategy_ref) only. No put / create / update / delete.
    """

    def lookup(self, strategy_ref: StrategyRef) -> Strategy:
        """Return Strategy for strategy_ref, or raise StrategyNotFound."""
        ...


class MemoryStrategyRepository:
    """
    In-memory StrategyRepository.

    Seeded at construction. No write methods after init.
    """

    def __init__(
        self,
        strategies: Optional[Mapping[StrategyRef, Strategy]] = None,
    ) -> None:
        # Snapshot — callers cannot mutate repository via the input mapping.
        self._strategies: dict[StrategyRef, Strategy] = dict(strategies or {})

    def lookup(self, strategy_ref: StrategyRef) -> Strategy:
        if strategy_ref is None or strategy_ref == "":
            raise StrategyNotFound("strategy_ref is empty")
        strategy = self._strategies.get(strategy_ref)
        if strategy is None:
            raise StrategyNotFound(str(strategy_ref))
        return strategy
