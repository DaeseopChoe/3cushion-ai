"""
Validation exception hierarchy.

Validation failures are raised as exceptions.
No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Any, List, Optional


class ValidationError(Exception):
    """Base error for the Validation Layer."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class SchemaNotFound(ValidationError):
    """Requested schema_name is not registered."""

    def __init__(self, schema_name: str) -> None:
        super().__init__(f"Schema not found: {schema_name!r}")
        self.schema_name = schema_name


class InvalidSchema(ValidationError):
    """Schema JSON could not be loaded or is malformed."""

    def __init__(self, path: str, detail: str) -> None:
        super().__init__(f"Invalid schema at {path}: {detail}")
        self.path = path
        self.detail = detail


class ValidationFailed(ValidationError):
    """Instance data failed JSON Schema validation."""

    def __init__(
        self,
        schema_name: str,
        errors: Optional[List[str]] = None,
        message: Optional[str] = None,
    ) -> None:
        self.schema_name = schema_name
        self.errors: List[str] = list(errors or [])
        if message is None:
            joined = "; ".join(self.errors) if self.errors else "validation failed"
            message = f"Validation failed for {schema_name!r}: {joined}"
        super().__init__(message)
