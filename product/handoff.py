"""Export Handoff Artifact assembly (Mission 01 → Mission 02)."""

from __future__ import annotations

from typing import Mapping

from generator.published_dataset_builder.serialize import published_dataset_to_json
from models import PublishedDataset
from validation import ValidationFailed, validate_dataset

from .exceptions import HandoffContractError, ProductExportFailure
from .models import (
    ExportHandoffArtifact,
    ExportHandoffProvenance,
    ExportHandoffStatus,
    ProductExportRequest,
    assert_mission02_input_contract,
    handoff_to_json,
)


def build_export_handoff_artifact(
    dataset: PublishedDataset,
    request: ProductExportRequest,
) -> ExportHandoffArtifact:
    """
    Build validated Export Handoff Artifact.

    packageEmitted is always False (Mission 01).
    """
    dataset_json = published_dataset_to_json(dataset.records)
    try:
        validate_dataset(dataset_json)
    except ValidationFailed as exc:
        raise ProductExportFailure(
            f"PublishedDataset validation failed: {exc}",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise ProductExportFailure(str(exc)) from exc

    artifact = ExportHandoffArtifact(
        dataset=dataset,
        provenance=ExportHandoffProvenance(
            source="export_pipeline",
            exported_at=request.exported_at,
            source_snapshot_ids=request.source_snapshot_ids,
            generator_build_identity=request.generator_build_identity,
        ),
        status=ExportHandoffStatus(validated=True, package_emitted=False),
        dataset_json=dataset_json,
    )
    try:
        assert_mission02_input_contract(artifact)
    except HandoffContractError:
        raise
    return artifact


def serialize_handoff(artifact: ExportHandoffArtifact) -> Mapping[str, object]:
    """JSON-ready handoff dict for Mission 02."""
    return handoff_to_json(artifact)
