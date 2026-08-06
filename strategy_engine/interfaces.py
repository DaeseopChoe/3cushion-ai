"""
Strategy Engine interfaces.

Strategy Handle → StrategyExecution (execution context only).
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from strategy import StrategyHandle

from .execution import StrategyExecution


@runtime_checkable
class StrategyEngine(Protocol):
    """
    Strategy Execution Layer.

    Converts a Repository Strategy Handle into a StrategyExecution context.
    Does not run search algorithms or create Modal.
    """

    def execute(self, strategy_handle: StrategyHandle) -> StrategyExecution:
        """Return a frozen StrategyExecution for the given Handle."""
        ...
