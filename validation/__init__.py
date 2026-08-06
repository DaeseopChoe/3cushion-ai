"""
Validation Layer public API.

Schema-contract validation only. No domain model construction.
"""

from .exceptions import (
    InvalidSchema,
    SchemaNotFound,
    ValidationError,
    ValidationFailed,
)
from .schema_registry import (
    SchemaRegistry,
    build_default_registry,
    get_default_registry,
    reset_default_registry,
)
from .validator import (
    validate,
    validate_dataset,
    validate_manifest,
    validate_membership_candidate,
    validate_package,
    validate_version,
)

__all__ = [
    "ValidationError",
    "SchemaNotFound",
    "InvalidSchema",
    "ValidationFailed",
    "SchemaRegistry",
    "build_default_registry",
    "get_default_registry",
    "reset_default_registry",
    "validate",
    "validate_dataset",
    "validate_package",
    "validate_manifest",
    "validate_version",
    "validate_membership_candidate",
]
