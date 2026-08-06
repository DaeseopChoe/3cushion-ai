"""
StrategyExecution — frozen execution context.

Holds Strategy Handle context only.
No Modal, Algorithm, Geometry, Ranking, Interpolation, KDTree, or Cache.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

from models import StrategyRef
from strategy import StrategyHandle


@dataclass(frozen=True)
class StrategyExecution:
    """
    Read-only execution context produced by StrategyEngine.

    Does not modify the Handle or Repository.
    Does not run search algorithms.
    """

    strategy_ref: StrategyRef
    handle: StrategyHandle
    metadata: Optional[Mapping[str, object]] = None
