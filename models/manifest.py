"""
Manifest domain model (Metadata only).

Contract: schemas/manifest.schema.json
SSOT: MANIFEST_SSOT

Describes Package / Dataset. Does not embed EnvelopeRecord or Strategy/Modal.
No business logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional, Union

from .types import (
    DatasetIdentity,
    GeneratorBuildIdentity,
    ManifestIdentity,
    PackageIdentity,
    VersionIdentity,
)

# Scalar bag for optional generatorBuildMetadata (schema additionalProperties).
BuildMetadataValue = Union[str, float, int, bool, None]


@dataclass
class Manifest:
    """Metadata-only. Manifest ↔ Package = 1:1."""

    manifest_identity: ManifestIdentity
    package_reference: PackageIdentity
    dataset_reference: DatasetIdentity
    generator_build_identity: GeneratorBuildIdentity
    version_reference: Optional[VersionIdentity] = None
    created_at: Optional[str] = None
    generator_build_metadata: Dict[str, BuildMetadataValue] = field(default_factory=dict)
