"""
Package Loader — unique Package Reader / Dataset Provider.

Contract: Architecture/SEARCH_LOADER_SSOT.md

Flow:
  Package JSON → Validation → Package Model
  → Manifest confirm → Version confirm
  → PublishedDataset return

Does not call Runtime, Membership, Resolve, Strategy, Modal, or Generator.
Read-only: never mutates Package / Manifest / Version / Dataset.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping, Optional, Union

from models import Manifest, Package, PublishedDataset, Version
from validation import (
    ValidationError as SchemaValidationError,
    validate_manifest,
    validate_package,
    validate_version,
)

from .exceptions import (
    DatasetNotFound,
    LoaderValidationError,
    ManifestNotFound,
    PackageLoadError,
    VersionNotFound,
)
from .utils import (
    manifest_from_json,
    package_from_json,
    version_from_json,
)

PathLike = Union[str, Path]


class DefaultPackageLoader:
    """
    Concrete PackageLoader.

    Always routes JSON through the Validation Layer before Model construction.
    """

    def load(
        self,
        package_data: Mapping[str, Any],
        *,
        manifest_data: Optional[Mapping[str, Any]] = None,
        version_data: Optional[Mapping[str, Any]] = None,
    ) -> PublishedDataset:
        package = self._validate_and_build_package(package_data)
        self._confirm_manifest(package, manifest_data)
        self._confirm_version(package, version_data, manifest_data)
        return self._extract_dataset(package)

    def load_path(
        self,
        package_path: PathLike,
        *,
        manifest_path: Optional[PathLike] = None,
        version_path: Optional[PathLike] = None,
    ) -> PublishedDataset:
        package_data = self._read_json_file(package_path, label="package")
        manifest_data = (
            self._read_json_file(manifest_path, label="manifest")
            if manifest_path is not None
            else None
        )
        version_data = (
            self._read_json_file(version_path, label="version")
            if version_path is not None
            else None
        )
        return self.load(
            package_data,
            manifest_data=manifest_data,
            version_data=version_data,
        )

    # --- internal (read-only helpers) ---

    def _read_json_file(self, path: PathLike, *, label: str) -> Mapping[str, Any]:
        file_path = Path(path)
        try:
            text = file_path.read_text(encoding="utf-8")
            data = json.loads(text)
        except OSError as exc:
            raise PackageLoadError(f"Failed to read {label} file: {file_path}", cause=exc) from exc
        except json.JSONDecodeError as exc:
            raise PackageLoadError(
                f"Invalid JSON in {label} file: {file_path}", cause=exc
            ) from exc
        if not isinstance(data, Mapping):
            raise PackageLoadError(f"{label} JSON root must be an object: {file_path}")
        return data

    def _validate_and_build_package(self, package_data: Mapping[str, Any]) -> Package:
        try:
            validated = validate_package(dict(package_data))
        except SchemaValidationError as exc:
            raise LoaderValidationError(
                f"Package validation failed: {exc}",
                cause=exc,
            ) from exc
        try:
            return package_from_json(validated)
        except (KeyError, TypeError, ValueError) as exc:
            raise PackageLoadError(
                f"Failed to build Package model: {exc}", cause=exc
            ) from exc

    def _confirm_manifest(
        self,
        package: Package,
        manifest_data: Optional[Mapping[str, Any]],
    ) -> Optional[Manifest]:
        ref = package.manifest_reference
        if ref is None and manifest_data is None:
            return None
        if ref is not None and manifest_data is None:
            raise ManifestNotFound(
                f"package.manifestReference={ref!r} but no Manifest JSON provided"
            )
        if manifest_data is None:
            return None

        try:
            validated = validate_manifest(dict(manifest_data))
        except SchemaValidationError as exc:
            raise LoaderValidationError(
                f"Manifest validation failed: {exc}",
                cause=exc,
            ) from exc

        try:
            manifest = manifest_from_json(validated)
        except (KeyError, TypeError, ValueError) as exc:
            raise PackageLoadError(
                f"Failed to build Manifest model: {exc}", cause=exc
            ) from exc

        if ref is not None and str(manifest.manifest_identity) != str(ref):
            raise ManifestNotFound(
                f"manifestIdentity {manifest.manifest_identity!r} "
                f"!= package.manifestReference {ref!r}"
            )
        if str(manifest.package_reference) != str(package.package_identity):
            raise ManifestNotFound(
                f"manifest.packageReference {manifest.package_reference!r} "
                f"!= package.packageIdentity {package.package_identity!r}"
            )

        expected_ds = package.dataset_identity or package.dataset.dataset_identity
        if expected_ds is not None and str(manifest.dataset_reference) != str(expected_ds):
            raise ManifestNotFound(
                f"manifest.datasetReference {manifest.dataset_reference!r} "
                f"!= package/dataset identity {expected_ds!r}"
            )
        return manifest

    def _confirm_version(
        self,
        package: Package,
        version_data: Optional[Mapping[str, Any]],
        manifest_data: Optional[Mapping[str, Any]],
    ) -> Optional[Version]:
        ref = package.version_reference
        if ref is None and version_data is None:
            return None
        if ref is not None and version_data is None:
            raise VersionNotFound(
                f"package.versionReference={ref!r} but no Version JSON provided"
            )
        if version_data is None:
            return None

        try:
            validated = validate_version(dict(version_data))
        except SchemaValidationError as exc:
            raise LoaderValidationError(
                f"Version validation failed: {exc}",
                cause=exc,
            ) from exc

        try:
            version = version_from_json(validated)
        except (KeyError, TypeError, ValueError) as exc:
            raise PackageLoadError(
                f"Failed to build Version model: {exc}", cause=exc
            ) from exc

        if ref is not None and str(version.version_identity) != str(ref):
            raise VersionNotFound(
                f"versionIdentity {version.version_identity!r} "
                f"!= package.versionReference {ref!r}"
            )
        if str(version.package_reference) != str(package.package_identity):
            raise VersionNotFound(
                f"version.packageReference {version.package_reference!r} "
                f"!= package.packageIdentity {package.package_identity!r}"
            )

        if package.manifest_reference is not None:
            if str(version.manifest_reference) != str(package.manifest_reference):
                raise VersionNotFound(
                    f"version.manifestReference {version.manifest_reference!r} "
                    f"!= package.manifestReference {package.manifest_reference!r}"
                )
        elif manifest_data is not None:
            # Prefer validated identity from provided manifest payload when package has no ref.
            mid = manifest_data.get("manifestIdentity")
            if mid is not None and str(version.manifest_reference) != str(mid):
                raise VersionNotFound(
                    f"version.manifestReference {version.manifest_reference!r} "
                    f"!= manifest.manifestIdentity {mid!r}"
                )

        expected_ds = package.dataset_identity or package.dataset.dataset_identity
        if expected_ds is not None and str(version.dataset_reference) != str(expected_ds):
            raise VersionNotFound(
                f"version.datasetReference {version.dataset_reference!r} "
                f"!= package/dataset identity {expected_ds!r}"
            )
        return version

    def _extract_dataset(self, package: Package) -> PublishedDataset:
        dataset = package.dataset
        if dataset is None:
            raise DatasetNotFound("Package.dataset is missing")
        # Prefer package-level dataset_identity when dataset itself has none.
        if dataset.dataset_identity is None and package.dataset_identity is not None:
            return PublishedDataset(
                records=list(dataset.records),
                dataset_identity=package.dataset_identity,
            )
        return PublishedDataset(
            records=list(dataset.records),
            dataset_identity=dataset.dataset_identity,
        )
