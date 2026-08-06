"""
Modal Engine interfaces.

StrategyExecution → ModalExecution (execution context only).
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from strategy_engine import StrategyExecution

from .execution import ModalExecution


@runtime_checkable
class ModalEngine(Protocol):
    """
    Modal Execution Layer.

    Converts StrategyExecution into a ModalExecution context.
    Does not run search algorithms or create Geometry.
    """

    def execute(self, strategy_execution: StrategyExecution) -> ModalExecution:
        """Return a frozen ModalExecution for the given StrategyExecution."""
        ...
