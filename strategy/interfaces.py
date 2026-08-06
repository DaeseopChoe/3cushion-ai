"""
Strategy Repository interfaces.

Read-only StrategyRef → Strategy Handle lookup.
No write API. No Generator / Membership / Resolve / Modal.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from models import StrategyRef

from .models import StrategyHandle


@runtime_checkable
class StrategyRepository(Protocol):
    """
    Read-only Strategy Corpus access.

    lookup / contains only. No put / create / update / delete.
    """

    def lookup(self, strategy_ref: StrategyRef) -> StrategyHandle:
        """Return Strategy Handle for strategy_ref."""
        ...

    def contains(self, strategy_ref: StrategyRef) -> bool:
        """Return True if strategy_ref is present (False for invalid/missing)."""
        ...
