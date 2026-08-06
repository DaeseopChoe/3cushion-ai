"""
Search Session exceptions.

No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Optional


class SessionError(Exception):
    """Base error for Search Session."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class SessionConfigurationError(SessionError):
    """Session was misconfigured (missing engines / inputs)."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Session configuration error: {detail}")
        self.detail = detail


class SessionExecutionError(SessionError):
    """Session run failed or Session was reused after completion."""

    def __init__(self, detail: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(f"Session execution error: {detail}")
        self.detail = detail
        self.cause = cause
