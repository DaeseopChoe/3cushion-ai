"""
Geometry consume contract — Impact SSOT + buildTrajectory results.

Generator does not compute geometry. A port supplies already-resolved
results from existing Impact / buildTrajectory SSOT (consume only).

Extension geometry and Display Cap truncation must not be supplied as
Line of Score bounds (Architecture SP-S-02 · §6.4).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from models import Point


@dataclass(frozen=True)
class GeometryConsumeResult:
    """
    Intermediate geometry consumed from Impact SSOT + buildTrajectory.

    Intermediate only — not persisted to Published Dataset.
    pathNodes raw corpus is not a Snapshot field — only Sampler-facing
    trajectories and key points are retained.
    """

    cue: Point
    impact: Point
    # Cue → Impact polyline (Sampler will later restrict to t ∈ [0, 1/3]).
    cue_trajectory: Tuple[Point, ...]
    c3: Point
    last_scoring_cushion: Point
    # C3 → last scoring cushion (Line of Score). Extension excluded.
    line_of_score: Tuple[Point, ...]
