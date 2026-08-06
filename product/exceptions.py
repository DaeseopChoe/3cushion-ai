"""Product Layer exceptions."""

from __future__ import annotations


class ProductError(Exception):
    """Base error for Product Layer."""


class InvalidExportRequest(ProductError):
    """Export request payload is invalid."""


class AuthoringAdapterError(ProductError):
    """Failed to adapt Authoring / Export payload to AuthoringStrategy."""


class ProductExportFailure(ProductError):
    """Product Export Host failed while orchestrating Generator."""


class HandoffContractError(ProductError):
    """Export Handoff Artifact violates Mission 02 input contract."""


class PackageBuilderError(ProductError):
    """Package Builder failed."""


class InvalidPackageInput(PackageBuilderError):
    """Export Handoff Artifact input rejected."""


class PackageValidationFailure(PackageBuilderError):
    """Package / Manifest / Version / Dataset validation failed."""


class PackageWriteFailure(PackageBuilderError):
    """Failed to write Published Package to export folder."""


class Mission03ContractError(PackageBuilderError):
    """Published Package does not satisfy Mission 03 input contract."""


class DeploymentError(ProductError):
    """Deployment Workflow failed."""


class InvalidDeploymentInput(DeploymentError):
    """Published Package directory / payload rejected."""


class DeploymentValidationFailure(DeploymentError):
    """Package validation failed during Deployment."""
