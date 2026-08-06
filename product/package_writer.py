"""
Write Published Package to Export Folder.

Layout:
  <package_dir>/
    dataset.json
    package.json
    manifest.json
    version.json
    metadata/
      provenance.json
      identities.json
      build.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Union

from .exceptions import PackageWriteFailure
from .package_builder import assert_mission03_input_contract
from .package_models import PublishedPackageBundle, PublishedPackageEmitResult

PathLike = Union[str, Path]

PACKAGE_DIR_NAME = "package"


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def write_published_package(
    bundle: PublishedPackageBundle,
    export_root: PathLike,
    *,
    package_dirname: str = PACKAGE_DIR_NAME,
) -> PublishedPackageEmitResult:
    """
    Persist Published Package under export_root/package/.

    Mission 03 consumes this folder (Deployment Workflow input).
    """
    assert_mission03_input_contract(bundle)
    root = Path(export_root)
    package_dir = root / package_dirname
    try:
        package_dir.mkdir(parents=True, exist_ok=True)
        meta_dir = package_dir / "metadata"
        meta_dir.mkdir(parents=True, exist_ok=True)

        files: Dict[str, Path] = {
            "dataset.json": package_dir / "dataset.json",
            "package.json": package_dir / "package.json",
            "manifest.json": package_dir / "manifest.json",
            "version.json": package_dir / "version.json",
            "metadata/provenance.json": meta_dir / "provenance.json",
            "metadata/identities.json": meta_dir / "identities.json",
            "metadata/build.json": meta_dir / "build.json",
        }

        _write_json(files["dataset.json"], dict(bundle.dataset_json))
        _write_json(files["package.json"], dict(bundle.package_json))
        _write_json(files["manifest.json"], dict(bundle.manifest_json))
        _write_json(files["version.json"], dict(bundle.version_json))
        _write_json(
            files["metadata/provenance.json"],
            dict(bundle.metadata.get("provenance", {})),
        )
        _write_json(
            files["metadata/identities.json"],
            dict(bundle.metadata.get("identities", {})),
        )
        _write_json(
            files["metadata/build.json"],
            {
                "builder": bundle.metadata.get("builder"),
                "mission": bundle.metadata.get("mission"),
                "handoffStatus": bundle.metadata.get("handoffStatus"),
            },
        )
    except OSError as exc:
        raise PackageWriteFailure(f"Failed to write package folder: {exc}") from exc

    return PublishedPackageEmitResult(
        bundle=bundle,
        package_dir=package_dir,
        files=files,
    )
