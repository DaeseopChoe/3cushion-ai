"""
JSON (schema camelCase) → Domain Model mapping.

Structure mapping only. No business logic, no validation.
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional

from models import (
    DatasetIdentity,
    EnvelopeRecord,
    GeneratorBuildIdentity,
    Manifest,
    ManifestIdentity,
    Package,
    PackageIdentity,
    Point,
    PublishedDataset,
    StrategyRef,
    Version,
    VersionIdentity,
)


def _opt_str(data: Mapping[str, Any], key: str) -> Optional[str]:
    value = data.get(key)
    if value is None:
        return None
    return str(value)


def point_from_json(data: Mapping[str, Any]) -> Point:
    return Point(x=float(data["x"]), y=float(data["y"]))


def envelope_record_from_json(data: Mapping[str, Any]) -> EnvelopeRecord:
    cue = [point_from_json(p) for p in data["cueSet"]]
    second = [point_from_json(p) for p in data["secondSet"]]
    return EnvelopeRecord(
        strategy_ref=StrategyRef(str(data["strategyRef"])),
        target=point_from_json(data["target"]),
        cue_set=cue,
        second_set=second,
    )


def published_dataset_from_json(data: Mapping[str, Any]) -> PublishedDataset:
    records: List[EnvelopeRecord] = [
        envelope_record_from_json(item) for item in data.get("records", [])
    ]
    identity = _opt_str(data, "datasetIdentity")
    return PublishedDataset(
        records=records,
        dataset_identity=DatasetIdentity(identity) if identity else None,
    )


def package_from_json(data: Mapping[str, Any]) -> Package:
    dataset_raw = data.get("dataset")
    if not isinstance(dataset_raw, Mapping):
        raise ValueError("Package.dataset must be an object")
    dataset = published_dataset_from_json(dataset_raw)
    ds_id = _opt_str(data, "datasetIdentity")
    build = _opt_str(data, "generatorBuildIdentity")
    ver = _opt_str(data, "versionReference")
    man = _opt_str(data, "manifestReference")
    return Package(
        package_identity=PackageIdentity(str(data["packageIdentity"])),
        dataset=dataset,
        dataset_identity=DatasetIdentity(ds_id) if ds_id else None,
        generator_build_identity=GeneratorBuildIdentity(build) if build else None,
        version_reference=VersionIdentity(ver) if ver else None,
        manifest_reference=ManifestIdentity(man) if man else None,
    )


def manifest_from_json(data: Mapping[str, Any]) -> Manifest:
    meta = data.get("generatorBuildMetadata")
    metadata: Dict[str, Any] = dict(meta) if isinstance(meta, Mapping) else {}
    ver = _opt_str(data, "versionReference")
    return Manifest(
        manifest_identity=ManifestIdentity(str(data["manifestIdentity"])),
        package_reference=PackageIdentity(str(data["packageReference"])),
        dataset_reference=DatasetIdentity(str(data["datasetReference"])),
        generator_build_identity=GeneratorBuildIdentity(
            str(data["generatorBuildIdentity"])
        ),
        version_reference=VersionIdentity(ver) if ver else None,
        created_at=_opt_str(data, "createdAt"),
        generator_build_metadata=metadata,
    )


def version_from_json(data: Mapping[str, Any]) -> Version:
    return Version(
        version_identity=VersionIdentity(str(data["versionIdentity"])),
        package_reference=PackageIdentity(str(data["packageReference"])),
        manifest_reference=ManifestIdentity(str(data["manifestReference"])),
        dataset_reference=DatasetIdentity(str(data["datasetReference"])),
        generator_build_identity=GeneratorBuildIdentity(
            str(data["generatorBuildIdentity"])
        ),
        generator_reference=_opt_str(data, "generatorReference"),
        architecture_version_reference=_opt_str(data, "architectureVersionReference"),
        build_time=_opt_str(data, "buildTime"),
    )
