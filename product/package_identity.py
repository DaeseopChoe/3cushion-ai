"""
Identity minting for Published Package (Mission 02).

Deterministic from handoff dataset + generatorBuildIdentity.
Does not change PublishedDataset content.
"""

from __future__ import annotations

import hashlib
import json
from typing import Mapping

from product.models import ExportHandoffArtifact
from product.package_models import PackageIdentities


def mint_package_identities(
    artifact: ExportHandoffArtifact,
    *,
    suffix: str | None = None,
) -> PackageIdentities:
    """Mint package / dataset / manifest / version identities."""
    build = str(artifact.provenance.generator_build_identity).strip() or "build"
    payload = json.dumps(dict(artifact.dataset_json), sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12]
    tag = f"{digest}-{suffix}" if suffix else digest
    return PackageIdentities(
        package_identity=f"pkg-{build}-{tag}",
        dataset_identity=f"ds-{build}-{tag}",
        manifest_identity=f"man-{build}-{tag}",
        version_identity=f"ver-{build}-{tag}",
        generator_build_identity=build,
    )


def identities_to_metadata(identities: PackageIdentities) -> Mapping[str, str]:
    return {
        "packageIdentity": identities.package_identity,
        "datasetIdentity": identities.dataset_identity,
        "manifestIdentity": identities.manifest_identity,
        "versionIdentity": identities.version_identity,
        "generatorBuildIdentity": identities.generator_build_identity,
    }
