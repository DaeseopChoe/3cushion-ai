"""
Publish Envelope PublishedDataset to frontend static dataset tree.

Contract (Phase 5 Search Quality Follow-on · Task #3/#4):

  Source (SoT):  <package_dir>/dataset.json
  Target:        <dataset_root>/_published/envelope/dataset.json
  Runtime URL:   /dataset/_published/envelope/dataset.json  (Frontend Task)

Full replace · atomic rename · source immutable · no merge/append.
Does not fetch, does not wire Real Interpolation, does not mutate Package.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Mapping, Optional, Union

from validation import ValidationFailed, validate_dataset

from .exceptions import (
    EnvelopeStaticPublishError,
    InvalidEnvelopePublishInput,
)

PathLike = Union[str, Path]

DATASET_FILENAME = "dataset.json"
PUBLISHED_RELATIVE_DIR = Path("_published") / "envelope"
TEMP_SUFFIX = ".tmp"


def default_repo_dataset_root() -> Path:
    """Repo-root `dataset/` (sibling of `product/`), independent of CWD."""
    return Path(__file__).resolve().parent.parent / "dataset"


def resolve_source_dataset_path(package_dir: PathLike) -> Path:
    """
    Accept either:
      - Published Package directory containing dataset.json
      - Export root that contains package/dataset.json
    """
    root = Path(package_dir).resolve()
    direct = root / DATASET_FILENAME
    if direct.is_file():
        return direct
    nested = root / "package" / DATASET_FILENAME
    if nested.is_file():
        return nested
    raise InvalidEnvelopePublishInput(
        f"dataset.json not found under {root} "
        f"(expected …/dataset.json or …/package/dataset.json)"
    )


def published_envelope_target(dataset_root: PathLike) -> Path:
    return Path(dataset_root).resolve() / PUBLISHED_RELATIVE_DIR / DATASET_FILENAME


def _load_and_validate_dataset(source: Path) -> Dict[str, Any]:
    try:
        raw = source.read_text(encoding="utf-8")
    except OSError as exc:
        raise InvalidEnvelopePublishInput(f"Failed to read source: {source}") from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InvalidEnvelopePublishInput(
            f"Invalid JSON in source dataset.json: {source}"
        ) from exc
    if not isinstance(data, Mapping):
        raise InvalidEnvelopePublishInput("dataset.json root must be an object")
    try:
        validate_dataset(dict(data))
    except ValidationFailed as exc:
        raise InvalidEnvelopePublishInput(
            f"PublishedDataset validation failed: {exc}"
        ) from exc
    return dict(data)


def _atomic_replace_bytes(target: Path, payload: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_name(target.name + TEMP_SUFFIX)
    try:
        with temp.open("wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, target)
    except Exception as exc:
        if temp.exists():
            try:
                temp.unlink()
            except OSError:
                pass
        raise EnvelopeStaticPublishError(
            f"Atomic publish failed for {target}: {exc}"
        ) from exc
    finally:
        if temp.exists():
            try:
                temp.unlink()
            except OSError:
                pass


@dataclass(frozen=True)
class EnvelopeStaticPublishResult:
    source_path: Path
    target_path: Path
    dataset_identity: Optional[str]
    record_count: int


def publish_envelope_static(
    package_dir: PathLike,
    *,
    dataset_root: Optional[PathLike] = None,
) -> EnvelopeStaticPublishResult:
    """
    Validate source package dataset.json and full-replace publish to
    dataset/_published/envelope/dataset.json under dataset_root.
    """
    source = resolve_source_dataset_path(package_dir)
    source_bytes_before = source.read_bytes()

    payload = _load_and_validate_dataset(source)

    root = (
        Path(dataset_root).resolve()
        if dataset_root is not None
        else default_repo_dataset_root()
    )
    target = published_envelope_target(root)

    # Full replace with exact validated source bytes (no merge/append).
    _atomic_replace_bytes(target, source_bytes_before)

    source_bytes_after = source.read_bytes()
    if source_bytes_before != source_bytes_after:
        raise EnvelopeStaticPublishError(
            f"Source artifact was mutated during publish (forbidden): {source}"
        )

    records = payload.get("records")
    record_count = len(records) if isinstance(records, list) else 0
    identity = payload.get("datasetIdentity")
    return EnvelopeStaticPublishResult(
        source_path=source,
        target_path=target,
        dataset_identity=str(identity) if identity is not None else None,
        record_count=record_count,
    )
