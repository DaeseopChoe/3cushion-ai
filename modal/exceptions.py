"""
Modal Engine exceptions.

No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Optional


class ModalEngineError(Exception):
    """Base error for the Modal Engine."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidModalExecution(ModalEngineError):
    """StrategyExecution input is missing or invalid for Modal materialization."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Invalid modal execution input: {detail}")
        self.detail = detail


class ModalExecutionFailure(ModalEngineError):
    """ModalExecution could not be created."""

    def __init__(self, detail: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(f"Modal execution failure: {detail}")
        self.detail = detail
        self.cause = cause
