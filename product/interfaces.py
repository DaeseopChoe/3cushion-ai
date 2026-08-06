"""Product Export Host protocol."""

from __future__ import annotations

from typing import Any, Mapping, Protocol

from .models import ExportHandoffArtifact, ProductExportRequest


class ProductExportHostProtocol(Protocol):
    """Product Layer orchestrator — Export → Generator → Handoff."""

    def run_export(self, request: ProductExportRequest) -> ExportHandoffArtifact:
        """Run Export Pipeline for a normalized request."""
        ...

    def run_export_payload(self, payload: Mapping[str, Any]) -> ExportHandoffArtifact:
        """Adapt raw Export / snapshot payload then run Export Pipeline."""
        ...
