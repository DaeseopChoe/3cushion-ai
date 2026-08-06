"""
Membership Engine exceptions.

No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Optional


class MembershipError(Exception):
    """Base error for the Membership Engine."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class MembershipInputError(MembershipError):
    """Invalid Membership input (dataset or query)."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Membership input error: {detail}")
        self.detail = detail


class MembershipFailure(MembershipError):
    """Membership evaluation failed unexpectedly."""

    def __init__(self, detail: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(f"Membership failure: {detail}")
        self.detail = detail
        self.cause = cause
