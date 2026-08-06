"""Load Export Handoff Artifact from Mission 01 JSON."""

from __future__ import annotations

from typing import Any, Mapping

from loader.utils import published_dataset_from_json

from .exceptions import InvalidPackageInput
from .models import (
    ExportHandoffArtifact,
    ExportHandoffProvenance,
    ExportHandoffStatus,
    assert_mission02_input_contract,
)


def load_export_handoff_artifact(data: Mapping[str, Any]) -> ExportHandoffArtifact:
    """
    Parse Mission 01 handoff JSON → ExportHandoffArtifact.

    Sole Mission 02 input loader. Does not accept Package fields as input.
    """
    if data is None or not isinstance(data, Mapping):
        raise InvalidPackageInput("handoff JSON must be an object")
    for forbidden in ("packageIdentity", "package.json", "manifestIdentity"):
        if forbidden in data:
            raise InvalidPackageInput(
                f"Mission 02 input must be Export Handoff Artifact only; found {forbidden}"
            )

    dataset_raw = data.get("dataset")
    provenance_raw = data.get("provenance")
    status_raw = data.get("status")
    if not isinstance(dataset_raw, Mapping):
        raise InvalidPackageInput("handoff.dataset is required")
    if not isinstance(provenance_raw, Mapping):
        raise InvalidPackageInput("handoff.provenance is required")
    if not isinstance(status_raw, Mapping):
        raise InvalidPackageInput("handoff.status is required")

    try:
        dataset = published_dataset_from_json(dataset_raw)
    except (KeyError, TypeError, ValueError) as exc:
        raise InvalidPackageInput(f"invalid handoff.dataset: {exc}") from exc

    snapshot_ids = provenance_raw.get("sourceSnapshotIds") or provenance_raw.get(
        "source_snapshot_ids"
    )
    if not isinstance(snapshot_ids, list) or not snapshot_ids:
        raise InvalidPackageInput("provenance.sourceSnapshotIds must be a non-empty array")

    artifact = ExportHandoffArtifact(
        dataset=dataset,
        provenance=ExportHandoffProvenance(
            source=str(provenance_raw.get("source") or "export_pipeline"),
            exported_at=str(
                provenance_raw.get("exportedAt")
                or provenance_raw.get("exported_at")
                or ""
            ),
            source_snapshot_ids=tuple(str(x) for x in snapshot_ids),
            generator_build_identity=str(
                provenance_raw.get("generatorBuildIdentity")
                or provenance_raw.get("generator_build_identity")
                or "product-export-pipeline-v1"
            ),
        ),
        status=ExportHandoffStatus(
            validated=bool(status_raw.get("validated")),
            package_emitted=bool(
                status_raw.get("packageEmitted")
                if "packageEmitted" in status_raw
                else status_raw.get("package_emitted", False)
            ),
        ),
        dataset_json=dict(dataset_raw),
    )
    if not artifact.provenance.exported_at:
        raise InvalidPackageInput("provenance.exportedAt is required")
    try:
        assert_mission02_input_contract(artifact)
    except Exception as exc:  # noqa: BLE001
        raise InvalidPackageInput(str(exc)) from exc
    return artifact
