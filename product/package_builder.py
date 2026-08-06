"""
Package Builder — Export Handoff Artifact → Published Package.

Product Layer only. Does not call Generator / Search / Runtime.
Does not mutate PublishedDataset records (wrap + identity only).
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

from validation import (
    ValidationError as SchemaValidationError,
    validate_dataset,
    validate_manifest,
    validate_package,
    validate_version,
)

from .exceptions import (
    InvalidPackageInput,
    Mission03ContractError,
    PackageBuilderError,
    PackageValidationFailure,
)
from .models import ExportHandoffArtifact, assert_mission02_input_contract, handoff_to_json
from .package_identity import identities_to_metadata, mint_package_identities
from .package_models import PublishedPackageBundle
from .package_serialize import (
    build_dataset_json,
    build_manifest_json,
    build_package_json,
    build_version_json,
)


def _require_handoff(artifact: ExportHandoffArtifact) -> None:
    try:
        assert_mission02_input_contract(artifact)
    except Exception as exc:  # noqa: BLE001
        raise InvalidPackageInput(str(exc)) from exc
    if artifact.status.package_emitted:
        raise InvalidPackageInput(
            "Export Handoff Artifact already marked packageEmitted; refuse rebuild"
        )


class PackageBuilder:
    """
    Official Name: Package Builder.

    Sole input: Export Handoff Artifact.
    Output: PublishedPackageBundle (validated JSON bodies).
    """

    def build(
        self,
        artifact: ExportHandoffArtifact,
        *,
        identity_suffix: Optional[str] = None,
    ) -> PublishedPackageBundle:
        if artifact is None or not isinstance(artifact, ExportHandoffArtifact):
            raise InvalidPackageInput("Export Handoff Artifact is required")
        _require_handoff(artifact)

        identities = mint_package_identities(artifact, suffix=identity_suffix)
        created_at = artifact.provenance.exported_at
        dataset_json = build_dataset_json(
            artifact.dataset_json,
            dataset_identity=identities.dataset_identity,
        )
        package_json = build_package_json(
            identities=identities,
            dataset_json=dataset_json,
        )
        manifest_json = build_manifest_json(
            identities=identities,
            created_at=created_at,
            source_snapshot_ids=list(artifact.provenance.source_snapshot_ids),
        )
        version_json = build_version_json(
            identities=identities,
            build_time=created_at,
        )
        metadata = {
            "provenance": {
                "source": artifact.provenance.source,
                "exportedAt": artifact.provenance.exported_at,
                "sourceSnapshotIds": list(artifact.provenance.source_snapshot_ids),
                "generatorBuildIdentity": artifact.provenance.generator_build_identity,
            },
            "identities": dict(identities_to_metadata(identities)),
            "handoffStatus": {
                "validated": artifact.status.validated,
                "packageEmitted": False,
            },
            "builder": "product.package_builder",
            "mission": "phase4-mission-02",
        }

        bundle = PublishedPackageBundle(
            identities=identities,
            package_json=package_json,
            dataset_json=dataset_json,
            manifest_json=manifest_json,
            version_json=version_json,
            metadata=metadata,
        )
        self.validate_bundle(bundle)
        return bundle

    def build_from_handoff_json(
        self,
        handoff_json: Mapping[str, Any],
        *,
        identity_suffix: Optional[str] = None,
    ) -> PublishedPackageBundle:
        from .handoff_load import load_export_handoff_artifact

        artifact = load_export_handoff_artifact(handoff_json)
        return self.build(artifact, identity_suffix=identity_suffix)

    @staticmethod
    def validate_bundle(bundle: PublishedPackageBundle) -> None:
        """Schema-validate all package surfaces."""
        try:
            validate_dataset(dict(bundle.dataset_json))
            validate_package(dict(bundle.package_json))
            validate_manifest(dict(bundle.manifest_json))
            validate_version(dict(bundle.version_json))
        except SchemaValidationError as exc:
            raise PackageValidationFailure(str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            raise PackageValidationFailure(str(exc)) from exc
        assert_mission03_input_contract(bundle)


def assert_mission03_input_contract(bundle: PublishedPackageBundle) -> None:
    """
    Mission 03 Deployment input contract:

    Validated package.json + manifest.json + version.json + dataset.json bodies
    with consistent identity chain. No deployment side effects here.
    """
    if bundle is None:
        raise Mission03ContractError("PublishedPackageBundle is required")
    required_roots = (
        bundle.package_json,
        bundle.manifest_json,
        bundle.version_json,
        bundle.dataset_json,
    )
    for body in required_roots:
        if not isinstance(body, Mapping) or not body:
            raise Mission03ContractError("Package JSON bodies must be non-empty objects")

    pkg_id = bundle.package_json.get("packageIdentity")
    if pkg_id != bundle.identities.package_identity:
        raise Mission03ContractError("packageIdentity mismatch")
    if bundle.manifest_json.get("packageReference") != pkg_id:
        raise Mission03ContractError("manifest.packageReference mismatch")
    if bundle.version_json.get("packageReference") != pkg_id:
        raise Mission03ContractError("version.packageReference mismatch")
    if bundle.version_json.get("manifestReference") != bundle.identities.manifest_identity:
        raise Mission03ContractError("version.manifestReference mismatch")
    if bundle.package_json.get("manifestReference") != bundle.identities.manifest_identity:
        raise Mission03ContractError("package.manifestReference mismatch")
    if bundle.package_json.get("versionReference") != bundle.identities.version_identity:
        raise Mission03ContractError("package.versionReference mismatch")
    # Deployment fields must not be present on package surfaces.
    for body in (bundle.package_json, bundle.manifest_json, bundle.version_json):
        for forbidden in ("gitPush", "vercel", "deployment", "deployedAt"):
            if forbidden in body:
                raise Mission03ContractError(
                    f"Mission 02 package must not include deployment field {forbidden}"
                )
