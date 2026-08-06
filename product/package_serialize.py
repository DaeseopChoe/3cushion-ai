"""Serialize Package / Manifest / Version JSON (schema camelCase)."""

from __future__ import annotations

from typing import Any, Dict, Mapping

from product.package_models import PackageIdentities


def build_dataset_json(
    dataset_json: Mapping[str, Any],
    *,
    dataset_identity: str,
) -> Dict[str, Any]:
    """PublishedDataset JSON with datasetIdentity set (records unchanged)."""
    records = dataset_json.get("records")
    if not isinstance(records, list):
        raise ValueError("dataset.records must be a list")
    return {
        "datasetIdentity": dataset_identity,
        "records": list(records),
    }


def build_package_json(
    *,
    identities: PackageIdentities,
    dataset_json: Mapping[str, Any],
) -> Dict[str, Any]:
    return {
        "packageIdentity": identities.package_identity,
        "dataset": dict(dataset_json),
        "datasetIdentity": identities.dataset_identity,
        "generatorBuildIdentity": identities.generator_build_identity,
        "versionReference": identities.version_identity,
        "manifestReference": identities.manifest_identity,
    }


def build_manifest_json(
    *,
    identities: PackageIdentities,
    created_at: str,
    source_snapshot_ids: list[str],
) -> Dict[str, Any]:
    return {
        "manifestIdentity": identities.manifest_identity,
        "packageReference": identities.package_identity,
        "datasetReference": identities.dataset_identity,
        "generatorBuildIdentity": identities.generator_build_identity,
        "versionReference": identities.version_identity,
        "createdAt": created_at,
        "generatorBuildMetadata": {
            "source": "package_builder",
            "sourceSnapshotCount": len(source_snapshot_ids),
        },
    }


def build_version_json(
    *,
    identities: PackageIdentities,
    build_time: str,
) -> Dict[str, Any]:
    return {
        "versionIdentity": identities.version_identity,
        "packageReference": identities.package_identity,
        "manifestReference": identities.manifest_identity,
        "datasetReference": identities.dataset_identity,
        "generatorBuildIdentity": identities.generator_build_identity,
        "generatorReference": "product-export-pipeline",
        "architectureVersionReference": "envelope-architecture-freeze",
        "buildTime": build_time,
    }
