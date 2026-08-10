/**
 * Geometry helpers for Real Interpolation gates.
 */

import type { Point } from "../positionSearchEngine";
import { ZERO_VECTOR_EPS_RG } from "./policy";

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from point P to segment AB. */
export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < ZERO_VECTOR_EPS_RG * ZERO_VECTOR_EPS_RG) {
    return dist(p, a);
  }
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * vx, y: a.y + t * vy };
  return dist(p, proj);
}

export function minDistanceToPolyline(
  p: Point,
  poly: Point[]
): number {
  if (!poly.length) return Number.POSITIVE_INFINITY;
  if (poly.length === 1) return dist(p, poly[0]);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = pointToSegmentDistance(p, poly[i], poly[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

export function angleDiffRad(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

export function vecAngle(v: Point): number {
  return Math.atan2(v.y, v.x);
}

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
