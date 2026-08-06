"""
Schema JSON loaders.

Loads schema files from disk. Does not create domain models.
Does not perform business validation.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from .exceptions import InvalidSchema

# Project root / schemas
_DEFAULT_SCHEMAS_DIR = Path(__file__).resolve().parent.parent / "schemas"

# Explicit schema_name → filename (no auto-discovery).
SCHEMA_FILENAMES: Dict[str, str] = {
    "published_dataset": "published_dataset.schema.json",
    "package": "package.schema.json",
    "manifest": "manifest.schema.json",
    "version": "version.schema.json",
    "membership_candidate": "membership_candidate.schema.json",
}


def default_schemas_dir() -> Path:
    return _DEFAULT_SCHEMAS_DIR


def load_schema_json(path: Path) -> Dict[str, Any]:
    """Read one schema JSON file into a dict."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise InvalidSchema(str(path), str(exc)) from exc
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise InvalidSchema(str(path), f"JSON decode error: {exc}") from exc
    if not isinstance(data, dict):
        raise InvalidSchema(str(path), "Schema root must be a JSON object")
    return data


def load_all_schema_documents(
    schemas_dir: Path | None = None,
) -> Dict[str, Dict[str, Any]]:
    """
    Load all explicitly listed schemas.
    Returns mapping schema_name → schema document dict.
    """
    root = schemas_dir if schemas_dir is not None else default_schemas_dir()
    loaded: Dict[str, Dict[str, Any]] = {}
    for name, filename in SCHEMA_FILENAMES.items():
        path = root / filename
        if not path.is_file():
            raise InvalidSchema(str(path), "Schema file does not exist")
        loaded[name] = load_schema_json(path)
    return loaded
