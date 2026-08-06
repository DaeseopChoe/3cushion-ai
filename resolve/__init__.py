"""
Resolve Engine public API.

strategy_ref → Strategy (RESOLVE_SSOT).
"""

from .engine import DefaultResolveEngine
from .exceptions import (
    ResolveError,
    ResolveFailure,
    ResolveInputError,
    StrategyNotFound,
)
from .factory import create_memory_repository, create_resolve_engine
from .interfaces import ResolveEngine, Strategy
from .repository import MemoryStrategyRepository, StrategyRepository

__all__ = [
    "ResolveEngine",
    "Strategy",
    "StrategyRepository",
    "MemoryStrategyRepository",
    "DefaultResolveEngine",
    "create_resolve_engine",
    "create_memory_repository",
    "ResolveError",
    "ResolveInputError",
    "StrategyNotFound",
    "ResolveFailure",
]
