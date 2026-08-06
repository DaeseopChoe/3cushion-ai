"""
Authoring Strategy — Generator input (read-only).

Distinct from Foundation FrozenStrategy Handle.
Holds Authoring anchors only; Modal body is out of scope for this Mission.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from models import Point, StrategyRef


@dataclass(frozen=True)
class AuthoringStrategy:
    """
    Read-only Strategy Authoring input for Generator.

    Geometry is not computed here — Impact / buildTrajectory are consumed
    via GeometryConsumePort.
    """

    strategy_ref: StrategyRef
    cue: Point
    target: Point
    second: Optional[Point] = None
