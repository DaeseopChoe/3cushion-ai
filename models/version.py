"""
Version domain model (Metadata only).

Contract: schemas/version.schema.json
SSOT: VERSION_SSOT

Build/Replace identity. Not Search Representation.
No EnvelopeRecord, Modal, Geometry, Ranking, Cache, or business logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .types import (
    DatasetIdentity,
    GeneratorBuildIdentity,
    ManifestIdentity,
    PackageIdentity,
    VersionIdentity,
)


@dataclass
class Version:
    """Metadata-only. Version ↔ Package / Manifest / Dataset = 1:1 chain."""

    version_identity: VersionIdentity
    package_reference: PackageIdentity
    manifest_reference: ManifestIdentity
    dataset_reference: DatasetIdentity
    generator_build_identity: GeneratorBuildIdentity
    generator_reference: Optional[str] = None
    architecture_version_reference: Optional[str] = None
    build_time: Optional[str] = None
