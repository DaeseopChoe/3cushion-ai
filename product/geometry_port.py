"""
Product Geometry Consume Port — maps AuthoringStrategy → GeometryConsumeResult.

Does not reimplement Formula / Builder. Supplies consume-only results
(from Export payload or an injected fallback port).
"""

from __future__ import annotations

from typing import Dict, Optional

from generator.strategy import AuthoringStrategy
from generator.trajectory_generator.geometry import GeometryConsumeResult
from generator.trajectory_generator.interfaces import GeometryConsumePort
from models import StrategyRef

from .exceptions import ProductExportFailure
from .models import AuthoringExportItem


class MapGeometryPort:
    """
    GeometryConsumePort backed by a per-strategyRef map + optional fallback.

    Product Host builds the map from AuthoringExportItem.geometry when present.
    """

    def __init__(
        self,
        mapping: Dict[StrategyRef, GeometryConsumeResult],
        *,
        fallback: Optional[GeometryConsumePort] = None,
    ) -> None:
        self._mapping = dict(mapping)
        self._fallback = fallback

    def consume(self, strategy: AuthoringStrategy) -> GeometryConsumeResult:
        hit = self._mapping.get(strategy.strategy_ref)
        if hit is not None:
            return hit
        if self._fallback is not None:
            return self._fallback.consume(strategy)
        raise ProductExportFailure(
            f"No GeometryConsumeResult for strategyRef={strategy.strategy_ref!s}; "
            "provide geometry on Export payload or inject a fallback GeometryConsumePort"
        )


def geometry_port_from_items(
    items: tuple[AuthoringExportItem, ...],
    *,
    fallback: Optional[GeometryConsumePort] = None,
) -> MapGeometryPort:
    mapping: Dict[StrategyRef, GeometryConsumeResult] = {}
    for item in items:
        if item.geometry is not None:
            mapping[item.strategy.strategy_ref] = item.geometry
    return MapGeometryPort(mapping, fallback=fallback)
