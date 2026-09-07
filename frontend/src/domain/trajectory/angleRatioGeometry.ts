/**
 * Phase 2B — angle ratio geometry (NOT incidence angle).
 *
 * q = |B∥ − H∥| on the cushion-parallel longitudinal axis of the physical rail at H.
 *
 * - TOP/BOTTOM → |B.x − H.x|
 * - LEFT/RIGHT → |B.y − H.y|
 *
 * Inputs are resolved geometry Points (Frame aim B, physical bend H).
 * Never sys conversion, never Frame↔Rail normal offset 2.25.
 */

import type { Point, Rail } from "../reflectionEngine";

export type LongitudinalAxis = "x" | "y";

export function longitudinalAxisForRail(rail: Rail): LongitudinalAxis {
  return rail === "TOP" || rail === "BOTTOM" ? "x" : "y";
}

export function longitudinalComponent(p: Point, rail: Rail): number {
  return longitudinalAxisForRail(rail) === "x" ? p.x : p.y;
}

export type AngleRatioGeometry = {
  angleRatio: number;
  longitudinalAxis: LongitudinalAxis;
  frameAimLongitudinal: number;
  railHitLongitudinal: number;
};

/**
 * Compute angle ratio q from Frame aim B and physical Rail hit H.
 * Returns null on invalid / non-finite geometry.
 */
export function computeAngleRatio(
  B: Point,
  H: Point,
  rail: Rail
): AngleRatioGeometry | null {
  if (
    !B ||
    !H ||
    !Number.isFinite(B.x) ||
    !Number.isFinite(B.y) ||
    !Number.isFinite(H.x) ||
    !Number.isFinite(H.y)
  ) {
    return null;
  }

  const longitudinalAxis = longitudinalAxisForRail(rail);
  const frameAimLongitudinal = longitudinalComponent(B, rail);
  const railHitLongitudinal = longitudinalComponent(H, rail);
  const angleRatio = Math.abs(frameAimLongitudinal - railHitLongitudinal);
  if (!Number.isFinite(angleRatio)) return null;

  return {
    angleRatio,
    longitudinalAxis,
    frameAimLongitudinal,
    railHitLongitudinal,
  };
}
