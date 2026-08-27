import {
  resolveImpactThroughMark,
  type PrecisionImpactPoint,
} from "../domain/trajectory/baselineImpactSnap";
import type { MarkAxisLock } from "../domain/trajectory/baselineMarkAxisSnap";

export type BaselineImpactSnapMark = "CO" | "C1";

export const BASELINE_IMPACT_DOUBLE_CLICK_HIT_RADIUS_RG = 2.5;
const BASELINE_IMPACT_TARGET_TIE_EPSILON_RG = 1e-9;

function isFinitePoint(
  point: PrecisionImpactPoint | null | undefined
): point is PrecisionImpactPoint {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

/**
 * Resolve the native double-click location to exactly one CO/C1 endpoint.
 * A tie fails closed instead of inventing a moving Mark.
 */
export function resolveBaselineImpactSnapTarget(params: {
  pointerRg: PrecisionImpactPoint | null | undefined;
  coRg: PrecisionImpactPoint | null | undefined;
  c1Rg: PrecisionImpactPoint | null | undefined;
  hitRadiusRg?: number;
}): BaselineImpactSnapMark | null {
  const {
    pointerRg,
    coRg,
    c1Rg,
    hitRadiusRg = BASELINE_IMPACT_DOUBLE_CLICK_HIT_RADIUS_RG,
  } = params;
  if (
    !isFinitePoint(pointerRg) ||
    !Number.isFinite(hitRadiusRg) ||
    hitRadiusRg < 0
  ) {
    return null;
  }

  const coDistance = isFinitePoint(coRg)
    ? Math.hypot(pointerRg.x - coRg.x, pointerRg.y - coRg.y)
    : Infinity;
  const c1Distance = isFinitePoint(c1Rg)
    ? Math.hypot(pointerRg.x - c1Rg.x, pointerRg.y - c1Rg.y)
    : Infinity;
  const coHit = coDistance <= hitRadiusRg;
  const c1Hit = c1Distance <= hitRadiusRg;

  if (!coHit && !c1Hit) return null;
  if (
    coHit &&
    c1Hit &&
    Math.abs(coDistance - c1Distance) <=
      BASELINE_IMPACT_TARGET_TIE_EPSILON_RG
  ) {
    return null;
  }
  return coDistance < c1Distance ? "CO" : "C1";
}

export function resolveBaselineImpactSnapCandidate(params: {
  movingMark: BaselineImpactSnapMark;
  coRg: PrecisionImpactPoint | null | undefined;
  c1Rg: PrecisionImpactPoint | null | undefined;
  activeImpactRg: PrecisionImpactPoint | null | undefined;
  allowedAxis: MarkAxisLock | null | undefined;
}): PrecisionImpactPoint | null {
  const { movingMark, coRg, c1Rg, activeImpactRg, allowedAxis } = params;
  const fixedCoord = movingMark === "CO" ? c1Rg : coRg;
  return resolveImpactThroughMark({
    movingMark,
    fixedCoord,
    impactCoord: activeImpactRg,
    allowedAxis,
  });
}

