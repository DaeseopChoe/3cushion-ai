"""
Strategy Engine factory.
"""

from __future__ import annotations

from .engine import DefaultStrategyEngine
from .interfaces import StrategyEngine


def create_strategy_engine() -> StrategyEngine:
    """Return the default Strategy Execution Engine."""
    return DefaultStrategyEngine()
