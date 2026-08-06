"""
Trajectory Snapshot — Sampler input (Generator intermediate only).

Not persisted as Dataset pathNodes.
Not a Published Dataset record.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from models import Point, StrategyRef


@dataclass(frozen=True)
class TrajectorySnapshot:
    """
    Intermediate Producer output for Cue / Second Samplers.

    Required fields (Mission 29):
    - cue_trajectory
    - line_of_score
    - impact
    - c3
    - last_scoring_cushion
    """

    strategy_ref: StrategyRef
    cue_trajectory: Tuple[Point, ...]
    line_of_score: Tuple[Point, ...]
    impact: Point
    c3: Point
    last_scoring_cushion: Point
