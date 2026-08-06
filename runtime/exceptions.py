"""
Search Runtime Host exceptions.

No print(), no exit(), no process termination.

Note: RuntimeError here is the Search Runtime Host base error,
not the Python builtin of the same name.
"""

from __future__ import annotations

from typing import Optional


class RuntimeError(Exception):
    """Base error for the Search Runtime Host."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class RuntimeConfigurationError(RuntimeError):
    """Runtime was misconfigured (missing engines / repository)."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Runtime configuration error: {detail}")
        self.detail = detail


class RuntimeExecutionError(RuntimeError):
    """Runtime orchestration failed during execute."""

    def __init__(self, detail: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(f"Runtime execution error: {detail}")
        self.detail = detail
        self.cause = cause
