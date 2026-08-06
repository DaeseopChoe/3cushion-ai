"""
Geometry Engine exceptions.

No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Optional


class GeometryEngineError(Exception):
    """Base error for the Geometry Engine."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidGeometryContext(GeometryEngineError):
    """ModalExecution input is missing or invalid for Geometry context."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Invalid geometry context input: {detail}")
        self.detail = detail


class GeometryContextFailure(GeometryEngineError):
    """GeometryContext could not be created."""

    def __init__(self, detail: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(f"Geometry context failure: {detail}")
        self.detail = detail
        self.cause = cause
