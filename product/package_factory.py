"""Factory / one-shot API for Package Builder (Mission 02)."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping, Optional, Union

from .models import ExportHandoffArtifact
from .package_builder import PackageBuilder
from .package_models import PublishedPackageBundle, PublishedPackageEmitResult
from .package_writer import write_published_package

PathLike = Union[str, Path]


def create_package_builder() -> PackageBuilder:
    """Create Package Builder (Product Layer)."""
    return PackageBuilder()


def build_published_package(
    artifact: ExportHandoffArtifact,
    *,
    identity_suffix: Optional[str] = None,
) -> PublishedPackageBundle:
    """Build validated Published Package from Export Handoff Artifact."""
    return create_package_builder().build(
        artifact, identity_suffix=identity_suffix
    )


def emit_published_package(
    artifact: ExportHandoffArtifact,
    export_root: PathLike,
    *,
    identity_suffix: Optional[str] = None,
    package_dirname: str = "package",
) -> PublishedPackageEmitResult:
    """Build + write Published Package to export folder (Mission 03 input)."""
    bundle = build_published_package(artifact, identity_suffix=identity_suffix)
    return write_published_package(
        bundle, export_root, package_dirname=package_dirname
    )


def emit_published_package_from_handoff_json(
    handoff_json: Mapping[str, Any],
    export_root: PathLike,
    *,
    identity_suffix: Optional[str] = None,
    package_dirname: str = "package",
) -> PublishedPackageEmitResult:
    """Mission 02 one-shot from Mission 01 handoff JSON file contents."""
    bundle = create_package_builder().build_from_handoff_json(
        handoff_json, identity_suffix=identity_suffix
    )
    return write_published_package(
        bundle, export_root, package_dirname=package_dirname
    )
