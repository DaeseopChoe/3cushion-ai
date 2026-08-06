"""
Polyline arc-length Sampling Engine for Second Policy.

Independent of Cue Sampler. Operates only on Line of Score polyline.
Does not call buildTrajectory / Impact / Formula / Builder.
Does not sample beyond the supplied Line of Score polyline.
"""

from __future__ import annotations

from typing import List, Sequence, Tuple

from models import Point

from .policy import SECOND_STEP_GRID, SECOND_T_MAX, SECOND_T_MIN

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


def sample_second_segment(
    line_of_score: Sequence[Point],
    *,
    t_min: float = SECOND_T_MIN,
    t_max: float = SECOND_T_MAX,
    step: float = SECOND_STEP_GRID,
) -> Tuple[Point, ...]:
    """
    Execute Second Sampling Policy on Line of Score polyline.

    SP-S-01: domain = C3 → last scoring cushion (full line_of_score)
    SP-S-02 / SP-S-03: only the supplied LOS is sampled (no overlay / display paths)
    SP-S-04: step grid spacing
    SP-S-05: endpoints at C3 (start) and last scoring cushion (end)
    """
    if len(line_of_score) < 2:
        raise ValueError("line_of_score must have at least 2 points")
    if not (0.0 <= t_min < t_max <= 1.0 + _EPS):
        raise ValueError("invalid t domain for Second Sampling")
    if t_max > 1.0:
        t_max = 1.0
    if step <= 0.0:
        raise ValueError("step must be positive")

    total = polyline_length(line_of_score)
    start_d = total * t_min
    end_d = total * t_max

    span = end_d - start_d
    if total <= _EPS or span <= _EPS:
        start_pt = point_at_arc_length(line_of_score, start_d)
        return _dedupe_preserve_order((start_pt,))

    # Architecture §6.5 — shorter than step → endpoints only
    if span < step:
        start_pt = point_at_arc_length(line_of_score, start_d)
        end_pt = point_at_arc_length(line_of_score, end_d)
        return _dedupe_preserve_order((start_pt, end_pt))

    samples: List[Point] = []
    d = start_d
    while d < end_d - _EPS:
        samples.append(point_at_arc_length(line_of_score, d))
        d += step
    # SP-S-05 — endpoint at last scoring cushion required
    samples.append(point_at_arc_length(line_of_score, end_d))
    return _dedupe_preserve_order(samples)
