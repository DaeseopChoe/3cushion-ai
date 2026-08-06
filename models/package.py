"""
Published Envelope Dataset Package domain model.

Contract: schemas/package.schema.json
SSOT: PACKAGE_SSOT

Delivery Unit wrapping one PublishedDataset.
No Strategy, Modal, Index, Ranking, Geometry, Cache, or business logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .published_dataset import PublishedDataset
from .types import (
    DatasetIdentity,
    GeneratorBuildIdentity,
    ManifestIdentity,
    PackageIdentity,
    VersionIdentity,
)


@dataclass
class Package:
    """Physical Delivery Unit. Required: package_identity, dataset."""

    package_identity: PackageIdentity
    dataset: PublishedDataset
    dataset_identity: Optional[DatasetIdentity] = None
    generator_build_identity: Optional[GeneratorBuildIdentity] = None
    version_reference: Optional[VersionIdentity] = None
    manifest_reference: Optional[ManifestIdentity] = None
