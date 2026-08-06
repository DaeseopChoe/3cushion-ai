"""
Product Export Pipeline models.

Official Names: Product Host · Export Handoff Artifact · AuthoringStrategy (consume).
Does not embed Modal body. Does not emit Package / Manifest / Version.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Mapping, Optional

from generator.strategy import AuthoringStrategy
from generator.trajectory_generator.geometry import GeometryConsumeResult
from models import PublishedDataset


@dataclass(frozen=True)
class AuthoringExportItem:
    """One Authoring Strategy plus optional pre-resolved geometry consume result."""

    strategy: AuthoringStrategy
    geometry: Optional[GeometryConsumeResult] = None


@dataclass(frozen=True)
class ProductExportRequest:
    """
    Product Export input (Export gesture / Workspace snapshot derived).

    Built by Authoring Adapter from Export / snapshot payloads.
    """

    source_snapshot_ids: tuple[str, ...]
    exported_at: str
    items: tuple[AuthoringExportItem, ...]
    generator_build_identity: str = "product-export-pipeline-v1"


@dataclass(frozen=True)
class ExportHandoffProvenance:
    """Product provenance meta — not part of PublishedDataset schema."""

    source: str
    exported_at: str
    source_snapshot_ids: tuple[str, ...]
    generator_build_identity: str


@dataclass(frozen=True)
class ExportHandoffStatus:
    """Mission 01 handoff status flags."""

    validated: bool
    package_emitted: bool


@dataclass(frozen=True)
class ExportHandoffArtifact:
    """
    Mission 01 → Mission 02 contract.

    Official Name: Export Handoff Artifact (GLOSSARY §3.2).
    Sole required input for Package Builder (Mission 02).
    """

    dataset: PublishedDataset
    provenance: ExportHandoffProvenance
    status: ExportHandoffStatus
    dataset_json: Mapping[str, Any] = field(repr=False)


def handoff_to_json(artifact: ExportHandoffArtifact) -> Dict[str, Any]:
    """Serialize Export Handoff Artifact for Mission 02 / file write."""
    return {
        "dataset": dict(artifact.dataset_json),
        "provenance": {
            "source": artifact.provenance.source,
            "exportedAt": artifact.provenance.exported_at,
            "sourceSnapshotIds": list(artifact.provenance.source_snapshot_ids),
            "generatorBuildIdentity": artifact.provenance.generator_build_identity,
        },
        "status": {
            "validated": artifact.status.validated,
            "packageEmitted": artifact.status.package_emitted,
        },
    }


def assert_mission02_input_contract(artifact: ExportHandoffArtifact) -> None:
    """Mission 02 sole-input contract checks (no Package fields)."""
    from product.exceptions import HandoffContractError

    if artifact is None:
        raise HandoffContractError("Export Handoff Artifact is required")
    if not artifact.status.validated:
        raise HandoffContractError("dataset must be validated before handoff")
    if artifact.status.package_emitted:
        raise HandoffContractError("Mission 01 must not emit Package")
    if "records" not in artifact.dataset_json:
        raise HandoffContractError("dataset.records is required")
    if not isinstance(artifact.dataset_json["records"], list):
        raise HandoffContractError("dataset.records must be a list")
    if len(artifact.dataset.records) != len(artifact.dataset_json["records"]):
        raise HandoffContractError("dataset model / json record count mismatch")
    # Mission 01 must not include Package emit fields on the artifact root.
    forbidden = ("packageIdentity", "manifest", "version", "package.json")
    raw_keys = set(handoff_to_json(artifact).keys())
    for key in forbidden:
        if key in raw_keys:
            raise HandoffContractError(f"Mission 01 handoff must not include {key}")
