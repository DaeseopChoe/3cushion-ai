"""
Deployment models — Mission 03.

Consumes Published Package only. Does not mutate Package / Dataset.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Mapping, Optional


@dataclass(frozen=True)
class DeploymentTarget:
    """Selected deployment destination (no side-effect until workflow runs)."""

    target_id: str
    kind: str
    description: str


# Supported targets — prepare/report only (no git push / vercel publish in Mission 03).
DEPLOYMENT_TARGETS: Dict[str, DeploymentTarget] = {
    "local_staging": DeploymentTarget(
        target_id="local_staging",
        kind="filesystem",
        description="Copy-validated package mirror under deployment/staging (immutable source)",
    ),
    "git_ready": DeploymentTarget(
        target_id="git_ready",
        kind="vcs_prepare",
        description="Mark package as ready for Git commit path (no push)",
    ),
    "vercel_ready": DeploymentTarget(
        target_id="vercel_ready",
        kind="cdn_prepare",
        description="Mark package as ready for Vercel static publish path (no publish)",
    ),
}


@dataclass(frozen=True)
class DeploymentStatus:
    """Deployment Status."""

    state: str  # validated | staged | ready | failed
    package_immutable: bool
    dataset_immutable: bool
    message: str


@dataclass(frozen=True)
class DeploymentMetadata:
    """Deployment Metadata."""

    mission: str
    deployed_at: str
    package_identity: str
    dataset_identity: str
    manifest_identity: str
    version_identity: str
    generator_build_identity: str
    package_dir: str
    source_checksums: Mapping[str, str]
    target_id: str


@dataclass(frozen=True)
class DeploymentReport:
    """Deployment Report."""

    report_id: str
    status: DeploymentStatus
    metadata: DeploymentMetadata
    target: DeploymentTarget
    validation: Mapping[str, Any]
    notes: tuple[str, ...]


@dataclass(frozen=True)
class DeploymentResult:
    """Mission 03 output."""

    report: DeploymentReport
    report_path: Optional[Path]
    staging_dir: Optional[Path]
