"""
Product Layer — Phase 4 Product Pipeline.

Mission 01: Export Pipeline
Mission 02: Package Builder
Mission 03: Deployment Workflow

Does not change Generator / Search / Runtime responsibilities.
"""

from .adapter import AuthoringAdapter
from .deployment import (
    create_deployment_workflow,
    deployment_report_to_json,
    run_deployment,
)
from .deployment_loader import load_published_package_dir
from .deployment_models import (
    DEPLOYMENT_TARGETS,
    DeploymentMetadata,
    DeploymentReport,
    DeploymentResult,
    DeploymentStatus,
    DeploymentTarget,
)
from .exceptions import (
    AuthoringAdapterError,
    DeploymentError,
    DeploymentValidationFailure,
    EnvelopeStaticPublishError,
    HandoffContractError,
    InvalidDeploymentInput,
    InvalidEnvelopePublishInput,
    InvalidExportRequest,
    InvalidPackageInput,
    Mission03ContractError,
    PackageBuilderError,
    PackageValidationFailure,
    PackageWriteFailure,
    ProductError,
    ProductExportFailure,
)
from .factory import create_product_export_host, run_product_export
from .handoff import build_export_handoff_artifact, serialize_handoff
from .handoff_load import load_export_handoff_artifact
from .host import ProductExportHost
from .interfaces import ProductExportHostProtocol
from .models import (
    AuthoringExportItem,
    ExportHandoffArtifact,
    ExportHandoffProvenance,
    ExportHandoffStatus,
    ProductExportRequest,
    assert_mission02_input_contract,
    handoff_to_json,
)
from .package_builder import PackageBuilder, assert_mission03_input_contract
from .package_factory import (
    build_published_package,
    create_package_builder,
    emit_published_package,
    emit_published_package_from_handoff_json,
)
from .package_models import (
    PackageIdentities,
    PublishedPackageBundle,
    PublishedPackageEmitResult,
)
from .package_writer import write_published_package
from .publish_envelope_static import (
    EnvelopeStaticPublishResult,
    default_repo_dataset_root,
    publish_envelope_static,
    published_envelope_target,
)

__all__ = [
    "AuthoringAdapter",
    "AuthoringAdapterError",
    "AuthoringExportItem",
    "DEPLOYMENT_TARGETS",
    "DeploymentError",
    "DeploymentMetadata",
    "DeploymentReport",
    "DeploymentResult",
    "DeploymentStatus",
    "DeploymentTarget",
    "DeploymentValidationFailure",
    "EnvelopeStaticPublishError",
    "EnvelopeStaticPublishResult",
    "ExportHandoffArtifact",
    "ExportHandoffProvenance",
    "ExportHandoffStatus",
    "HandoffContractError",
    "InvalidDeploymentInput",
    "InvalidEnvelopePublishInput",
    "InvalidExportRequest",
    "InvalidPackageInput",
    "Mission03ContractError",
    "PackageBuilder",
    "PackageBuilderError",
    "PackageIdentities",
    "PackageValidationFailure",
    "PackageWriteFailure",
    "ProductError",
    "ProductExportFailure",
    "ProductExportHost",
    "ProductExportHostProtocol",
    "ProductExportRequest",
    "PublishedPackageBundle",
    "PublishedPackageEmitResult",
    "assert_mission02_input_contract",
    "assert_mission03_input_contract",
    "build_export_handoff_artifact",
    "build_published_package",
    "create_deployment_workflow",
    "create_package_builder",
    "create_product_export_host",
    "deployment_report_to_json",
    "emit_published_package",
    "emit_published_package_from_handoff_json",
    "handoff_to_json",
    "load_export_handoff_artifact",
    "load_published_package_dir",
    "publish_envelope_static",
    "published_envelope_target",
    "default_repo_dataset_root",
    "run_deployment",
    "run_product_export",
    "serialize_handoff",
    "write_published_package",
]
