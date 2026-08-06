"""
Modal Engine public API.

StrategyExecution → ModalExecution (execution context only).
"""

from .engine import DefaultModalEngine
from .exceptions import (
    InvalidModalExecution,
    ModalEngineError,
    ModalExecutionFailure,
)
from .execution import ModalExecution
from .factory import create_modal_engine
from .interfaces import ModalEngine

__all__ = [
    "ModalEngine",
    "DefaultModalEngine",
    "ModalExecution",
    "create_modal_engine",
    "ModalEngineError",
    "InvalidModalExecution",
    "ModalExecutionFailure",
]
