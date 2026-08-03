/**
 * secondBallConstraint.ts
 * Second Role Ball Projection helpers (v1.3 final).
 *
 * Source of truth: TRAJECTORY_EXTENSION_SSOT.md §7 · §8 (Role-based)
 *
 * Projection runs only on explicit Second Role Ball DoubleClick.
 * Candidates = Calculated + Reveal + Extension display segments.
 * No Runtime Attachment · Snap · Follow · Drag-time Constraint.
 */

import type { RgPoint } from "./model";
import type { ProjectionSegment } from "./projectionSegments";

export type SegmentLike = {
  start: RgPoint;
  end: RgPoint;
  index?: number;
  id?: string;
};

export type SegmentProjection = {
  point: RgPoint;
  /** Parametric t on segment, clamped to [0, 1]. */
  t: number;
  distanceRg: number;
  segment: SegmentLike;
};

function isValidPoint(p: RgPoint | null | undefined): p is RgPoint {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

/** Perpendicular projection onto segment with endpoint clamp. */
export function projectPointToSegment(
  point: RgPoint,
  segment: SegmentLike
): SegmentProjection | null {
  if (!isValidPoint(point) || !isValidPoint(segment?.start) || !isValidPoint(segment?.end)) {
    return null;
  }
  const ax = segment.start.x;
  const ay = segment.start.y;
  const bx = segment.end.x;
  const by = segment.end.y;
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = 0;
  if (abLenSq > 1e-18) {
    t = ((point.x - ax) * abx + (point.y - ay) * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const proj = { x: ax + t * abx, y: ay + t * aby };
  const distanceRg = Math.hypot(point.x - proj.x, point.y - proj.y);
  return { point: proj, t, distanceRg, segment };
}

/**
 * Closest segment by distance; ties → lowest index.
 */
export function findClosestSegmentProjection(
  point: RgPoint,
  segments: ReadonlyArray<SegmentLike>
): SegmentProjection | null {
  if (!isValidPoint(point) || !Array.isArray(segments) || segments.length === 0) {
    return null;
  }
  let best: SegmentProjection | null = null;
  for (const segment of segments) {
    const proj = projectPointToSegment(point, segment);
    if (!proj) continue;
    const segIndex = segment.index ?? Number.MAX_SAFE_INTEGER;
    const bestIndex = best?.segment?.index ?? Number.MAX_SAFE_INTEGER;
    if (
      !best ||
      proj.distanceRg < best.distanceRg - 1e-12 ||
      (Math.abs(proj.distanceRg - best.distanceRg) <= 1e-12 &&
        segIndex < bestIndex)
    ) {
      best = proj;
    }
  }
  return best;
}

/**
 * DoubleClick Projection: Second Role Ball → nearest display segment (1×).
 * Never mutates Extension / Calculated geometry.
 */
export function projectBallOntoNearestSegment(args: {
  ball: RgPoint | null | undefined;
  segments: ReadonlyArray<SegmentLike | ProjectionSegment>;
}): SegmentProjection | null {
  const { ball, segments } = args;
  if (!isValidPoint(ball)) return null;
  return findClosestSegmentProjection(ball, segments);
}
