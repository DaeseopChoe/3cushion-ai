"""
Schema Registry.

Explicit registration only — no auto-discovery.
Maps schema_name → schema document and builds a referencing Registry for $ref.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

from .exceptions import SchemaNotFound
from .loaders import default_schemas_dir, load_all_schema_documents


class SchemaRegistry:
    """
    Holds named schemas and a shared referencing.Registry for cross-file $ref.
    """

    def __init__(self) -> None:
        self._schemas: Dict[str, Dict[str, Any]] = {}
        self._registry: Registry = Registry()

    @property
    def schema_names(self) -> tuple[str, ...]:
        return tuple(sorted(self._schemas.keys()))

    def register(self, schema_name: str, schema: Dict[str, Any]) -> None:
        """Register one schema document under an explicit name."""
        self._schemas[schema_name] = schema
        schema_id = schema.get("$id")
        if isinstance(schema_id, str) and schema_id:
            resource = Resource.from_contents(schema, default_specification=DRAFT202012)
            self._registry = self._registry.with_resource(schema_id, resource)

    def get(self, schema_name: str) -> Dict[str, Any]:
        try:
            return self._schemas[schema_name]
        except KeyError as exc:
            raise SchemaNotFound(schema_name) from exc

    def get_registry(self) -> Registry:
        return self._registry

    def clear(self) -> None:
        self._schemas.clear()
        self._registry = Registry()


def build_default_registry(schemas_dir: Optional[Path] = None) -> SchemaRegistry:
    """
    Load schemas from disk and register them explicitly by SCHEMA_FILENAMES keys.
    """
    root = schemas_dir if schemas_dir is not None else default_schemas_dir()
    documents = load_all_schema_documents(root)
    registry = SchemaRegistry()
    for name, schema in documents.items():
        registry.register(name, schema)
    return registry


# Process-level default registry (lazy).
_default_registry: Optional[SchemaRegistry] = None


def get_default_registry() -> SchemaRegistry:
    global _default_registry
    if _default_registry is None:
        _default_registry = build_default_registry()
    return _default_registry


def reset_default_registry() -> None:
    """Test helper: clear cached default registry."""
    global _default_registry
    _default_registry = None
