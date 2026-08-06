"""
Search Runtime Host public API.

Orchestration: Enhancement pipeline → Resolve → SearchResult.
"""

from .engine import DefaultSearchRuntime
from .exceptions import (
    RuntimeConfigurationError,
    RuntimeError,
    RuntimeExecutionError,
)
from .factory import create_runtime
from .interfaces import SearchRuntime
from .result import SearchResult

__all__ = [
    "SearchRuntime",
    "DefaultSearchRuntime",
    "SearchResult",
    "create_runtime",
    "RuntimeError",
    "RuntimeConfigurationError",
    "RuntimeExecutionError",
]
