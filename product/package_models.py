"""
Package Builder models — Mission 02 Published Package.

Official Names: Package Builder · Published Package · Manifest · Version
(GLOSSARY §3.2). Does not modify PublishedDataset records.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Mapping


@dataclass(frozen=True)
class PackageIdentities:
    """Minted logical identities for one Published Package emit."""

    package_identity: str
    dataset_identity: str
    manifest_identity: str
    version_identity: str
    generator_build_identity: str


@dataclass(frozen=True)
class PublishedPackageBundle:
    """
    In-memory Published Package ready for Export Folder write / Mission 03.

    JSON bodies match schemas/package|manifest|version|published_dataset.
    """

    identities: PackageIdentities
    package_json: Mapping[str, Any]
    dataset_json: Mapping[str, Any]
    manifest_json: Mapping[str, Any]
    version_json: Mapping[str, Any]
    metadata: Mapping[str, Any]


@dataclass(frozen=True)
class PublishedPackageEmitResult:
    """Mission 02 output after Export Folder write."""

    bundle: PublishedPackageBundle
    package_dir: Path
    files: Dict[str, Path]
