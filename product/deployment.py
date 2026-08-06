"""
Deployment Workflow — Mission 03.

Published Package → validate → Deployment Target → Report / Metadata / Status.

Does not modify Package / Manifest / Version / Dataset.
Does not call Generator / Search / Runtime.
Does not perform Git Push or Vercel Publish (prepare/report only).
"""

from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Union

from validation import (
    ValidationError as SchemaValidationError,
    validate_dataset,
    validate_manifest,
    validate_package,
    validate_version,
)

from .deployment_loader import checksum_package_dir, load_published_package_dir
from .deployment_models import (
    DEPLOYMENT_TARGETS,
    DeploymentMetadata,
    DeploymentReport,
    DeploymentResult,
    DeploymentStatus,
    DeploymentTarget,
)
from .exceptions import (
    DeploymentValidationFailure,
    InvalidDeploymentInput,
)
from .package_builder import PackageBuilder

PathLike = Union[str, Path]


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def resolve_deployment_target(target_id: str) -> DeploymentTarget:
    key = str(target_id or "").strip()
    if key not in DEPLOYMENT_TARGETS:
        raise InvalidDeploymentInput(
            f"Unknown deployment target {target_id!r}; "
            f"choose one of {sorted(DEPLOYMENT_TARGETS)}"
        )
    return DEPLOYMENT_TARGETS[key]


class DeploymentWorkflow:
    """
    Official Name: Deployment Workflow (GLOSSARY Deployment Workflow).

    Product Layer. Consumes Published Package directory only.
    """

    def run(
        self,
        package_dir: PathLike,
        *,
        target_id: str = "local_staging",
        write_report: bool = True,
        mirror_staging: bool = True,
    ) -> DeploymentResult:
        root = Path(package_dir)
        target = resolve_deployment_target(target_id)

        # 1) Load Published Package (not Handoff)
        bundle = load_published_package_dir(root)

        # 2) Checksums before any write (immutability baseline)
        before = checksum_package_dir(root)

        # 3) Package Validation
        validation = self._validate(bundle)

        # 4) Optional staging mirror (never writes into source package/)
        staging_dir: Optional[Path] = None
        if mirror_staging and target.target_id == "local_staging":
            staging_dir = root.parent / "deployment" / "staging" / "package"
            self._mirror_package(root, staging_dir)

        # 5) Immutability check — source package files unchanged
        after = checksum_package_dir(root)
        if before != after:
            raise DeploymentValidationFailure(
                "Published Package files changed during Deployment (forbidden)"
            )

        status = DeploymentStatus(
            state="ready",
            package_immutable=True,
            dataset_immutable=True,
            message=(
                f"Package validated for target={target.target_id}; "
                "source package left unchanged"
            ),
        )
        metadata = DeploymentMetadata(
            mission="phase4-mission-03",
            deployed_at=_utc_now(),
            package_identity=bundle.identities.package_identity,
            dataset_identity=bundle.identities.dataset_identity,
            manifest_identity=bundle.identities.manifest_identity,
            version_identity=bundle.identities.version_identity,
            generator_build_identity=bundle.identities.generator_build_identity,
            package_dir=str(root.resolve()),
            source_checksums=before,
            target_id=target.target_id,
        )
        report = DeploymentReport(
            report_id=f"dep-{uuid.uuid4().hex[:12]}",
            status=status,
            metadata=metadata,
            target=target,
            validation=validation,
            notes=(
                "Deployment Workflow prepares/report only",
                "No Git Push",
                "No Vercel Publish",
                "Published Package immutable",
            ),
        )

        report_path: Optional[Path] = None
        if write_report:
            report_dir = root.parent / "deployment" / "reports"
            report_path = report_dir / f"{report.report_id}.json"
            _write_json(report_path, deployment_report_to_json(report))

        # Final immutability re-check after report write (report is outside package/)
        final = checksum_package_dir(root)
        if final != before:
            raise DeploymentValidationFailure(
                "Published Package mutated after Deployment Report write"
            )

        return DeploymentResult(
            report=report,
            report_path=report_path,
            staging_dir=staging_dir,
        )

    @staticmethod
    def _validate(bundle) -> Dict[str, Any]:
        try:
            validate_dataset(dict(bundle.dataset_json))
            validate_package(dict(bundle.package_json))
            validate_manifest(dict(bundle.manifest_json))
            validate_version(dict(bundle.version_json))
            PackageBuilder.validate_bundle(bundle)
        except SchemaValidationError as exc:
            raise DeploymentValidationFailure(str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            raise DeploymentValidationFailure(str(exc)) from exc
        return {
            "dataset": "PASS",
            "package": "PASS",
            "manifest": "PASS",
            "version": "PASS",
            "mission03Contract": "PASS",
        }

    @staticmethod
    def _mirror_package(source: Path, dest: Path) -> None:
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(source, dest)


def deployment_report_to_json(report: DeploymentReport) -> Dict[str, Any]:
    return {
        "reportId": report.report_id,
        "status": {
            "state": report.status.state,
            "packageImmutable": report.status.package_immutable,
            "datasetImmutable": report.status.dataset_immutable,
            "message": report.status.message,
        },
        "metadata": {
            "mission": report.metadata.mission,
            "deployedAt": report.metadata.deployed_at,
            "packageIdentity": report.metadata.package_identity,
            "datasetIdentity": report.metadata.dataset_identity,
            "manifestIdentity": report.metadata.manifest_identity,
            "versionIdentity": report.metadata.version_identity,
            "generatorBuildIdentity": report.metadata.generator_build_identity,
            "packageDir": report.metadata.package_dir,
            "sourceChecksums": dict(report.metadata.source_checksums),
            "targetId": report.metadata.target_id,
        },
        "target": {
            "targetId": report.target.target_id,
            "kind": report.target.kind,
            "description": report.target.description,
        },
        "validation": dict(report.validation),
        "notes": list(report.notes),
    }


def create_deployment_workflow() -> DeploymentWorkflow:
    return DeploymentWorkflow()


def run_deployment(
    package_dir: PathLike,
    *,
    target_id: str = "local_staging",
    write_report: bool = True,
    mirror_staging: bool = True,
) -> DeploymentResult:
    """Deployment API — Mission 03 one-shot."""
    return create_deployment_workflow().run(
        package_dir,
        target_id=target_id,
        write_report=write_report,
        mirror_staging=mirror_staging,
    )
