"""
Resolve Engine exceptions.

No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Optional


class ResolveError(Exception):
    """Base error for the Resolve Engine."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ResolveInputError(ResolveError):
    """Invalid Resolve input (MembershipCandidate)."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Resolve input error: {detail}")
        self.detail = detail


class StrategyNotFound(ResolveError):
    """strategy_ref was not found in the Strategy Repository."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Strategy not found: {detail}")
        self.detail = detail


class ResolveFailure(ResolveError):
    """Resolve failed unexpectedly."""

    def __init__(self, detail: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(f"Resolve failure: {detail}")
        self.detail = detail
        self.cause = cause
