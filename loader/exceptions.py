"""
Loader exception hierarchy.

Validation errors are wrapped/re-raised as Loader errors.
No print(), no exit(), no process termination.
"""

from __future__ import annotations

from typing import Optional

from validation.exceptions import ValidationError as SchemaValidationError


class LoaderError(Exception):
    """Base error for the Package Loader."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class PackageLoadError(LoaderError):
    """Package JSON could not be loaded or built into a model."""

    def __init__(self, message: str, *, cause: Optional[BaseException] = None) -> None:
        super().__init__(message)
        self.cause = cause


class ManifestNotFound(LoaderError):
    """Package requires a Manifest, but none was provided or identity mismatch."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Manifest not found or invalid: {detail}")
        self.detail = detail


class VersionNotFound(LoaderError):
    """Package requires a Version, but none was provided or identity mismatch."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Version not found or invalid: {detail}")
        self.detail = detail


class DatasetNotFound(LoaderError):
    """Published Dataset missing from Package or failed to materialize."""

    def __init__(self, detail: str) -> None:
        super().__init__(f"Dataset not found: {detail}")
        self.detail = detail


class LoaderValidationError(LoaderError):
    """Schema Validation Layer rejected the input."""

    def __init__(self, message: str, *, cause: Optional[SchemaValidationError] = None) -> None:
        super().__init__(message)
        self.cause = cause
