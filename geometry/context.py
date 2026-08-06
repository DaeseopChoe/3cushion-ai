"""
GeometryContext — frozen geometry execution context.

Holds ModalExecution context only.
No coordinate results, cushion math, range metrics, crossings,
index structures, ranking, interpolation, search results, or payload.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

from modal import ModalExecution
from models import StrategyRef


@dataclass(frozen=True)
class GeometryContext:
    """
    Read-only geometry context produced by GeometryEngine.

    Does not modify ModalExecution.
    Does not perform Geometry calculation or Search Algorithm.
    """

    strategy_ref: StrategyRef
    modal_execution: ModalExecution
    metadata: Optional[Mapping[str, object]] = None
