"""
Load Published Package directory (Mission 03 input).

Read-only. Does not accept Export Handoff Artifact.
Does not mutate package files.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, Mapping, Union

from .exceptions import InvalidDeploymentInput
from .package_builder import assert_mission03_input_contract
from .package_models import PackageIdentities, PublishedPackageBundle

PathLike = Union[str, Path]

REQUIRED_FILES = (
    "dataset.json",
    "package.json",
    "manifest.json",
    "version.json",
)


def _read_json(path: Path, *, label: str) -> Dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise InvalidDeploymentInput(f"Failed to read {label}: {path}") from exc
    except json.JSONDecodeError as exc:
        raise InvalidDeploymentInput(f"Invalid JSON in {label}: {path}") from exc
    if not isinstance(data, dict):
        raise InvalidDeploymentInput(f"{label} root must be an object")
    return data


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checksum_package_dir(package_dir: Path) -> Dict[str, str]:
    """Checksum required package surfaces (immutability baseline)."""
    out: Dict[str, str] = {}
    for name in REQUIRED_FILES:
        path = package_dir / name
        if not path.is_file():
            raise InvalidDeploymentInput(f"Missing required package file: {name}")
        out[name] = file_sha256(path)
    return out


def load_published_package_dir(package_dir: PathLike) -> PublishedPackageBundle:
    """
    Load Mission 02 Published Package folder → PublishedPackageBundle.

    Rejects handoff-shaped roots (dataset+provenance+status without packageIdentity).
    """
    root = Path(package_dir)
    if not root.is_dir():
        raise InvalidDeploymentInput(f"Package directory not found: {root}")

    package_json_path = root / "package.json"
    if not package_json_path.is_file():
        # Common mistake: pass export_handoff.json path or handoff folder
        raise InvalidDeploymentInput(
            "Mission 03 requires a Published Package directory with package.json "
            "(Export Handoff Artifact is not accepted)"
        )

    dataset_json = _read_json(root / "dataset.json", label="dataset.json")
    package_json = _read_json(package_json_path, label="package.json")
    manifest_json = _read_json(root / "manifest.json", label="manifest.json")
    version_json = _read_json(root / "version.json", label="version.json")

    if "packageIdentity" not in package_json:
        raise InvalidDeploymentInput("package.json missing packageIdentity")

    # Reject handoff-only objects mistakenly named package.json
    if "provenance" in package_json and "status" in package_json and "dataset" not in package_json:
        raise InvalidDeploymentInput(
            "Input looks like Export Handoff Artifact; Mission 03 consumes Published Package only"
        )

    identities = PackageIdentities(
        package_identity=str(package_json["packageIdentity"]),
        dataset_identity=str(
            package_json.get("datasetIdentity")
            or dataset_json.get("datasetIdentity")
            or ""
        ),
        manifest_identity=str(
            package_json.get("manifestReference")
            or manifest_json.get("manifestIdentity")
            or ""
        ),
        version_identity=str(
            package_json.get("versionReference")
            or version_json.get("versionIdentity")
            or ""
        ),
        generator_build_identity=str(
            package_json.get("generatorBuildIdentity")
            or manifest_json.get("generatorBuildIdentity")
            or ""
        ),
    )
    if not identities.dataset_identity or not identities.manifest_identity:
        raise InvalidDeploymentInput("Package identity chain incomplete")

    metadata: Dict[str, Any] = {}
    meta_dir = root / "metadata"
    if meta_dir.is_dir():
        for name in ("provenance.json", "identities.json", "build.json"):
            path = meta_dir / name
            if path.is_file():
                metadata[name.replace(".json", "")] = _read_json(path, label=name)

    bundle = PublishedPackageBundle(
        identities=identities,
        package_json=package_json,
        dataset_json=dataset_json,
        manifest_json=manifest_json,
        version_json=version_json,
        metadata=metadata,
    )
    try:
        assert_mission03_input_contract(bundle)
    except Exception as exc:  # noqa: BLE001
        raise InvalidDeploymentInput(str(exc)) from exc
    return bundle
