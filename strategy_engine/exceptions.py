"""
Strategy Engine exceptions.

No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Optional


class StrategyEngineError(Exception):
    """Base error for the Strategy Engine."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidStrategyHandle(StrategyEngineError):
    """Strategy Handle input is missing or invalid."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Invalid strategy handle: {detail}")
        self.detail = detail


class StrategyExecutionFailure(StrategyEngineError):
    """Strategy Execution could not be created."""

    def __init__(self, detail: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(f"Strategy execution failure: {detail}")
        self.detail = detail
        self.cause = cause
