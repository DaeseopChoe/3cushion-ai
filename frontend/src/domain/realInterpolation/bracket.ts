/**
 * Cue-1D bracket among Exact Target+Second sibling knots (no extrapolation).
 */

import { ballsExactEqual, pointExactEqual } from "../cueEditSnap";
import type { Ball3 } from "../positionSearchEngine";
import { dist } from "./geometryMath";
import type { InterpolationKnotView } from "./types";

export type BracketResult =
  | { kind: "exact"; knot: InterpolationKnotView }
  | {
      kind: "interpolated";
      knotA: InterpolationKnotView;
      knotB: InterpolationKnotView;
      lambda: number;
    }
  | { kind: "nearest"; knot: InterpolationKnotView }
  | { kind: "empty" };

function cueParam(cue: { x: number; y: number }, origin: { x: number; y: number }, axis: { x: number; y: number }): number {
  return (cue.x - origin.x) * axis.x + (cue.y - origin.y) * axis.y;
}

/**
 * Select Exact / Interpolated / Nearest within same authoringStrategyId family.
 * INTERPOLATED only when Exact Target+Second across family and Cue 1D bracket.
 */
export function selectBracket(
  query: Ball3,
  family: InterpolationKnotView[]
): BracketResult {
  if (!family.length) return { kind: "empty" };

  for (const knot of family) {
    if (ballsExactEqual(query, knot.balls)) {
      return { kind: "exact", knot };
    }
  }

  if (family.length === 1) {
    return { kind: "nearest", knot: family[0] };
  }

  // Require shared Exact Target + Exact Second across all knots used for bracket.
  const t0 = family[0].balls.target;
  const s0 = family[0].balls.second;
  const siblings = family.filter(
    (k) =>
      pointExactEqual(k.balls.target, t0) &&
      pointExactEqual(k.balls.second, s0)
  );

  if (siblings.length < 2) {
    return { kind: "nearest", knot: nearestByCue(query, family) };
  }

  // Query must share Exact Target+Second with sibling set for Cue-1D interp.
  if (
    !pointExactEqual(query.target, t0) ||
    !pointExactEqual(query.second, s0)
  ) {
    return { kind: "nearest", knot: nearestByCue(query, family) };
  }

  const sorted = [...siblings].sort((a, b) => {
    const dx = a.balls.cue.x - b.balls.cue.x;
    if (Math.abs(dx) > 1e-12) return dx;
    const dy = a.balls.cue.y - b.balls.cue.y;
    if (Math.abs(dy) > 1e-12) return dy;
    return a.strategyRef.localeCompare(b.strategyRef);
  });

  // Deduplicate identical cue params (stable keep first by strategyRef already sorted).
  const unique: InterpolationKnotView[] = [];
  for (const k of sorted) {
    const prev = unique[unique.length - 1];
    if (
      prev &&
      pointExactEqual(prev.balls.cue, k.balls.cue)
    ) {
      continue;
    }
    unique.push(k);
  }

  if (unique.length < 2) {
    return { kind: "nearest", knot: nearestByCue(query, family) };
  }

  const first = unique[0].balls.cue;
  const last = unique[unique.length - 1].balls.cue;
  let axis = { x: last.x - first.x, y: last.y - first.y };
  const axisLen = Math.hypot(axis.x, axis.y);
  if (axisLen < 1e-12) {
    return { kind: "nearest", knot: nearestByCue(query, family) };
  }
  axis = { x: axis.x / axisLen, y: axis.y / axisLen };

  const withT = unique.map((k) => ({
    knot: k,
    t: cueParam(k.balls.cue, first, axis),
  }));
  withT.sort((a, b) => a.t - b.t || a.knot.strategyRef.localeCompare(b.knot.strategyRef));

  const tq = cueParam(query.cue, first, axis);
  const tMin = withT[0].t;
  const tMax = withT[withT.length - 1].t;

  if (tq < tMin - 1e-12 || tq > tMax + 1e-12) {
    return { kind: "nearest", knot: nearestByCue(query, family) };
  }

  for (let i = 0; i < withT.length - 1; i++) {
    const a = withT[i];
    const b = withT[i + 1];
    if (tq >= a.t - 1e-12 && tq <= b.t + 1e-12) {
      const denom = b.t - a.t;
      if (Math.abs(denom) < 1e-12) {
        return { kind: "nearest", knot: a.knot };
      }
      const lambda = (tq - a.t) / denom;
      if (lambda < 0 || lambda > 1) {
        return { kind: "nearest", knot: nearestByCue(query, family) };
      }
      return {
        kind: "interpolated",
        knotA: a.knot,
        knotB: b.knot,
        lambda,
      };
    }
  }

  return { kind: "nearest", knot: nearestByCue(query, family) };
}

export function nearestByCue(
  query: Ball3,
  family: InterpolationKnotView[]
): InterpolationKnotView {
  let best = family[0];
  let bestD = dist(query.cue, best.balls.cue);
  for (let i = 1; i < family.length; i++) {
    const d = dist(query.cue, family[i].balls.cue);
    if (
      d < bestD - 1e-12 ||
      (Math.abs(d - bestD) <= 1e-12 &&
        family[i].strategyRef.localeCompare(best.strategyRef) < 0)
    ) {
      best = family[i];
      bestD = d;
    }
  }
  return best;
}
