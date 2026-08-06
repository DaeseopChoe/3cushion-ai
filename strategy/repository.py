"""
Memory Strategy Repository — read-only in-memory corpus.

lookup(strategy_ref) / contains(strategy_ref) only.
No write API. No DB / file / network / cache backends.
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional

from models import StrategyRef

from .corpus import build_corpus
from .exceptions import InvalidStrategyReference, StrategyNotFound
from .models import StrategyHandle


class MemoryStrategyRepository:
    """
    In-memory StrategyRepository.

    Seeded at construction. No write methods after init.
    """

    def __init__(
        self,
        strategies: Optional[Mapping[StrategyRef, StrategyHandle]] = None,
        *,
        seed: Optional[Iterable[StrategyHandle]] = None,
    ) -> None:
        self._strategies: dict[StrategyRef, StrategyHandle] = build_corpus(
            strategies,
            seed=seed,
        )

    def lookup(self, strategy_ref: StrategyRef) -> StrategyHandle:
        if strategy_ref is None or strategy_ref == "":
            raise InvalidStrategyReference("strategy_ref is empty")
        handle = self._strategies.get(strategy_ref)
        if handle is None:
            raise StrategyNotFound(str(strategy_ref))
        return handle

    def contains(self, strategy_ref: StrategyRef) -> bool:
        if strategy_ref is None or strategy_ref == "":
            return False
        return strategy_ref in self._strategies
