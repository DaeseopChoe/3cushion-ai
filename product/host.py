"""
Product Export Host — Product Layer Orchestrator.

Export → Authoring Adapter → Geometry Port → Generator Host → Export Handoff Artifact.

Does not modify Generator responsibilities.
Does not perform Search / Runtime calculation.
Does not emit Package / Manifest / Version (Mission 02).
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

from generator import create_generator_host
from generator.host import GeneratorHost
from generator.trajectory_generator.interfaces import GeometryConsumePort

from .adapter import AuthoringAdapter
from .exceptions import ProductExportFailure
from .geometry_port import geometry_port_from_items
from .handoff import build_export_handoff_artifact
from .models import ExportHandoffArtifact, ProductExportRequest


class ProductExportHost:
    """
    Official Name: Product Host (Export Pipeline orchestration).

    Calls Generator Host API only. No Package emission.
    Builds a per-request GeometryConsumePort (payload map + fallback).
    """

    def __init__(
        self,
        *,
        geometry_fallback: GeometryConsumePort,
        adapter: Optional[AuthoringAdapter] = None,
        generator_factory=create_generator_host,
    ) -> None:
        if geometry_fallback is None:
            raise ProductExportFailure("GeometryConsumePort fallback is required")
        self._geometry_fallback = geometry_fallback
        self._adapter = adapter or AuthoringAdapter()
        self._generator_factory = generator_factory

    def run_export(self, request: ProductExportRequest) -> ExportHandoffArtifact:
        if request is None or not isinstance(request, ProductExportRequest):
            raise ProductExportFailure("ProductExportRequest is required")
        if len(request.items) == 0:
            raise ProductExportFailure("Export request has no Authoring strategies")

        port = geometry_port_from_items(
            request.items, fallback=self._geometry_fallback
        )
        generator: GeneratorHost = self._generator_factory(geometry=port)

        records = []
        try:
            for item in request.items:
                strategy = item.strategy
                snapshot = generator.generate_trajectory_snapshot(strategy)
                cue = generator.sample_cue(snapshot)
                second = generator.sample_second(snapshot)
                record = generator.build_envelope(strategy, snapshot, cue, second)
                records.append(record)
            dataset = generator.build_published_dataset(records)
        except ProductExportFailure:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ProductExportFailure(
                f"Generator Host orchestration failed: {exc}"
            ) from exc

        return build_export_handoff_artifact(dataset, request)

    def run_export_payload(
        self, payload: Mapping[str, Any]
    ) -> ExportHandoffArtifact:
        request = self._adapter.adapt(payload)
        return self.run_export(request)
