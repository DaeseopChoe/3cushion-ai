"""
ModalExecution — frozen modal execution context.

Holds StrategyExecution context only.
No Geometry, Ranking, Interpolation, KDTree, Cache, SearchResult, or payload.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

from models import StrategyRef
from strategy_engine import StrategyExecution


@dataclass(frozen=True)
class ModalExecution:
    """
    Read-only modal execution context produced by ModalEngine.

    Does not modify StrategyExecution.
    Does not create Geometry or run Search Algorithm.
    """

    strategy_ref: StrategyRef
    strategy_execution: StrategyExecution
    metadata: Optional[Mapping[str, object]] = None
