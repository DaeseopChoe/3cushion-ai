"""Factory for Product Export Host + Generator wiring."""

from __future__ import annotations

from typing import Any, Mapping, Optional

from generator.trajectory_generator.interfaces import GeometryConsumePort

from .adapter import AuthoringAdapter
from .host import ProductExportHost
from .models import ExportHandoffArtifact


def create_product_export_host(
    *,
    geometry: GeometryConsumePort,
    adapter: Optional[AuthoringAdapter] = None,
) -> ProductExportHost:
    """
    Create Product Host.

    ``geometry`` is the GeometryConsumePort fallback when Export payload
    omits per-strategy geometry. Generator Host is created per Export run
    via ``create_generator_host`` (Producer API consume only).
    """
    return ProductExportHost(
        geometry_fallback=geometry,
        adapter=adapter,
    )


def run_product_export(
    payload: Mapping[str, Any],
    *,
    geometry: GeometryConsumePort,
) -> ExportHandoffArtifact:
    """
    One-shot Export Pipeline:

    payload → Authoring Adapter → Geometry map + fallback → Generator → Handoff
    """
    return create_product_export_host(geometry=geometry).run_export_payload(payload)
