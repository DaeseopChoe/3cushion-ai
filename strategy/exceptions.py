"""
Strategy Repository exceptions.

No print(), no exit(), no process termination.
"""

from __future__ import annotations


class StrategyRepositoryError(Exception):
    """Base error for the Strategy Repository."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class StrategyNotFound(StrategyRepositoryError):
    """strategy_ref was not found in the repository."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Strategy not found: {detail}")
        self.detail = detail


class InvalidStrategyReference(StrategyRepositoryError):
    """strategy_ref is missing or invalid."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Invalid strategy reference: {detail}")
        self.detail = detail
