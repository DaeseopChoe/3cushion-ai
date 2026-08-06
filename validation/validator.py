"""
JSON Schema Validator API.

Validates instance data against registered schemas.
Returns the original data on success.
Does not construct domain models.
"""

from __future__ import annotations

from typing import Any, List, Optional

from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

from .exceptions import InvalidSchema, ValidationFailed
from .schema_registry import SchemaRegistry, get_default_registry


def _format_error(error: Any) -> str:
    path = ".".join(str(p) for p in error.absolute_path) if error.absolute_path else "(root)"
    return f"{path}: {error.message}"


def validate(
    schema_name: str,
    data: Any,
    *,
    registry: Optional[SchemaRegistry] = None,
) -> Any:
    """
    Validate `data` against the named schema.

    On success: returns the same `data` object (unchanged).
    On failure: raises ValidationFailed.
    """
    reg = registry if registry is not None else get_default_registry()
    schema = reg.get(schema_name)
    try:
        validator = Draft202012Validator(schema, registry=reg.get_registry())
    except SchemaError as exc:
        raise InvalidSchema(schema_name, str(exc)) from exc

    errors: List[str] = []
    for error in sorted(validator.iter_errors(data), key=lambda e: list(e.absolute_path)):
        errors.append(_format_error(error))

    if errors:
        raise ValidationFailed(schema_name, errors=errors)

    return data


def validate_dataset(
    data: Any, *, registry: Optional[SchemaRegistry] = None
) -> Any:
    return validate("published_dataset", data, registry=registry)


def validate_package(
    data: Any, *, registry: Optional[SchemaRegistry] = None
) -> Any:
    return validate("package", data, registry=registry)


def validate_manifest(
    data: Any, *, registry: Optional[SchemaRegistry] = None
) -> Any:
    return validate("manifest", data, registry=registry)


def validate_version(
    data: Any, *, registry: Optional[SchemaRegistry] = None
) -> Any:
    return validate("version", data, registry=registry)


def validate_membership_candidate(
    data: Any, *, registry: Optional[SchemaRegistry] = None
) -> Any:
    return validate("membership_candidate", data, registry=registry)
