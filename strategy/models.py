"""
Strategy Repository domain handles.

Frozen Handle only — no Modal, Geometry, Ranking, or search algorithm.
"""

from __future__ import annotations

from dataclasses import dataclass

from models import StrategyRef


@dataclass(frozen=True)
class FrozenStrategy:
    """
    Read-only Strategy Handle for Repository lookup.

    Authoring body / Modal are out of scope at this stage.
    """

    strategy_ref: StrategyRef


# Public alias — Handle naming used by Resolve / Runtime contracts.
StrategyHandle = FrozenStrategy
