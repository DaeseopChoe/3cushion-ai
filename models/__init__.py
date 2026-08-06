"""
Envelope Search domain models.

Structure-only dataclasses aligned with schemas/*.schema.json.
No validation, loader, runtime, membership, resolve, or generator logic.
"""

from .membership_candidate import MembershipCandidate, MembershipFlags
from .manifest import Manifest
from .package import Package
from .published_dataset import EnvelopeRecord, PublishedDataset
from .types import (
    DatasetIdentity,
    GeneratorBuildIdentity,
    ManifestIdentity,
    PackageIdentity,
    Point,
    RecordIdentity,
    StrategyRef,
    VersionIdentity,
)
from .version import Version

__all__ = [
    "Point",
    "StrategyRef",
    "DatasetIdentity",
    "PackageIdentity",
    "ManifestIdentity",
    "VersionIdentity",
    "GeneratorBuildIdentity",
    "RecordIdentity",
    "EnvelopeRecord",
    "PublishedDataset",
    "Package",
    "Manifest",
    "Version",
    "MembershipFlags",
    "MembershipCandidate",
]
