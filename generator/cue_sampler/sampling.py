"""
Polyline arc-length Sampling Engine for Cue Policy.

Pure geometry-of-path sampling on an already-resolved polyline.
Does not call buildTrajectory / Impact / Formula / Builder.
"""

from __future__ import annotations

from typing import List, Sequence, Tuple

from models import Point

from .policy import CUE_STEP_GRID, CUE_T_MAX, CUE_T_MIN

_EPS = 1e-12
_DEDUP_EPS = 1e-9


def _dist(a: Point, b: Point) -> float:
    dx = b.x - a.x
    dy = b.y - a.y
    return (dx * dx + dy * dy) ** 0.5


def _lerp(a: Point, b: Point, u: float) -> Point:
    return Point(x=a.x + (b.x - a.x) * u, y=a.y + (b.y - a.y) * u)


def polyline_length(points: Sequence[Point]) -> float:
    if len(points) < 2:
        return 0.0
    total = 0.0
    for i in range(1, len(points)):
        total += _dist(points[i - 1], points[i])
    return total


def point_at_arc_length(points: Sequence[Point], distance: float) -> Point:
    """Point at arc length ``distance`` along polyline (clamped to ends)."""
    if not points:
        raise ValueError("points must be non-empty")
    if len(points) == 1 or distance <= 0.0:
        return points[0]

    remaining = distance
    for i in range(1, len(points)):
        seg = _dist(points[i - 1], points[i])
        if seg <= _EPS:
            continue
        if remaining <= seg + _EPS:
            u = max(0.0, min(1.0, remaining / seg))
            return _lerp(points[i - 1], points[i], u)
        remaining -= seg
    return points[-1]


def _dedupe_preserve_order(points: Sequence[Point]) -> Tuple[Point, ...]:
    if not points:
        return ()
    out: List[Point] = [points[0]]
    for p in points[1:]:
        prev = out[-1]
        if abs(p.x - prev.x) <= _DEDUP_EPS and abs(p.y - prev.y) <= _DEDUP_EPS:
            continue
        out.append(p)
    return tuple(out)


def sample_cue_segment(
    cue_trajectory: Sequence[Point],
    *,
    t_min: float = CUE_T_MIN,
    t_max: float = CUE_T_MAX,
    step: float = CUE_STEP_GRID,
) -> Tuple[Point, ...]:
    """
    Execute Cue Sampling Policy on Cue→Impact polyline.

    SP-C-01: parameter domain t ∈ [t_min, t_max] (default [0, 1/3])
    SP-C-02: does not sample full Cue→Impact (t_max < 1)
    SP-C-03: step grid spacing
    SP-C-04: endpoints at t_min and t_max always included
    """
    if len(cue_trajectory) < 2:
        raise ValueError("cue_trajectory must have at least 2 points")
    if not (0.0 <= t_min < t_max <= 1.0):
        raise ValueError("invalid t domain for Cue Sampling")
    if step <= 0.0:
        raise ValueError("step must be positive")
    # SP-C-02 guard: full-path sampling forbidden
    if t_max >= 1.0 - _EPS:
        raise ValueError("Cue→Impact full Sampling is forbidden (SP-C-02)")

    total = polyline_length(cue_trajectory)
    start_d = total * t_min
    end_d = total * t_max

    # Degenerate / shorter than step → keep endpoints only (Architecture §6.5)
    span = end_d - start_d
    if total <= _EPS or span <= _EPS:
        start_pt = point_at_arc_length(cue_trajectory, start_d)
        return _dedupe_preserve_order((start_pt,))

    if span < step:
        start_pt = point_at_arc_length(cue_trajectory, start_d)
        end_pt = point_at_arc_length(cue_trajectory, end_d)
        return _dedupe_preserve_order((start_pt, end_pt))

    samples: List[Point] = []
    d = start_d
    while d < end_d - _EPS:
        samples.append(point_at_arc_length(cue_trajectory, d))
        d += step
    # SP-C-04 — endpoint at t_max (1/3) required
    samples.append(point_at_arc_length(cue_trajectory, end_d))
    return _dedupe_preserve_order(samples)
