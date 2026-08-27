/**
 * Pure foundations for CO/C1 Impact precision editing.
 *
 * This module only resolves a read-only Impact source and computes a
 * candidate on an already-resolved Mark axis. It does not mutate a Draft,
 * apply a Draft, commit SYS values, or handle pointer events.
 */

import type {
  AxisPoint,
  MarkAxisLock,
} from "./baselineMarkAxisSnap";

export type ImpactPrecisionMode = "CONTACT" | "FREE";
export type PrecisionImpactPoint = AxisPoint;

export const IMPACT_GEOMETRY_EPSILON_RG = 1e-8;
export const IMPACT_SOURCE_CONSISTENCY_TOLERANCE_RG = 1e-6;

export type ActiveImpactForPrecisionInput = {
  impactMode: string;
  /** CONTACT visible source: calcImpactBall(cue, target, T). */
  contactVisibleImpactRg?: PrecisionImpactPoint | null;
  /** FREE visible source: balls.impact, when present. */
  freeStoredImpactRg?: PrecisionImpactPoint | null;
  /** FREE visible fallback: calcImpactBall(cue, target, T). */
  freeCalculatedFallbackImpactRg?: PrecisionImpactPoint | null;
  /**
   * Optional trajectory source known to represent the same contact Impact.
   * A supplied source must be finite and agree with the visible source.
   */
  /**
   * trajectoryBuilder.impact.contactRg only. Do not pass impact.raw here:
   * it is calculated by a different physics path.
   */
  trajectoryContactImpactRg?: PrecisionImpactPoint | null;
  consistencyToleranceRg?: number;
};

function isFinitePoint(
  point: PrecisionImpactPoint | null | undefined
): point is PrecisionImpactPoint {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

function isFiniteAxisLock(
  axis: MarkAxisLock | null | undefined
): axis is MarkAxisLock {
  const isHorizontalRail =
    axis?.rail === "BOTTOM" || axis?.rail === "TOP";
  const isVerticalRail =
    axis?.rail === "LEFT" || axis?.rail === "RIGHT";
  return (
    !!axis &&
    (axis.varying === "x" || axis.varying === "y") &&
    (axis.constantAxis === "x" || axis.constantAxis === "y") &&
    axis.constantAxis !== axis.varying &&
    ((isHorizontalRail &&
      axis.varying === "x" &&
      axis.constantAxis === "y") ||
      (isVerticalRail &&
        axis.varying === "y" &&
        axis.constantAxis === "x")) &&
    Number.isFinite(axis.constantValue) &&
    Number.isFinite(axis.varyMin) &&
    Number.isFinite(axis.varyMax) &&
    axis.varyMin <= axis.varyMax &&
    (axis.rail === "BOTTOM" ||
      axis.rail === "TOP" ||
      axis.rail === "LEFT" ||
      axis.rail === "RIGHT")
  );
}

function distance(a: PrecisionImpactPoint, b: PrecisionImpactPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Validate that two Impact values are finite and represent the same center.
 */
export function validateImpactSourceConsistency(
  visibleImpactRg: PrecisionImpactPoint | null | undefined,
  trajectoryImpactRg: PrecisionImpactPoint | null | undefined,
  toleranceRg = IMPACT_SOURCE_CONSISTENCY_TOLERANCE_RG
): boolean {
  if (
    !isFinitePoint(visibleImpactRg) ||
    !isFinitePoint(trajectoryImpactRg) ||
    !Number.isFinite(toleranceRg) ||
    toleranceRg < 0
  ) {
    return false;
  }
  return distance(visibleImpactRg, trajectoryImpactRg) <= toleranceRg;
}

/**
 * Resolve the Impact center currently visible to the user.
 *
 * The visible coaching result is authoritative for Precision Editing:
 * CONTACT uses its calculated visible result; FREE uses the stored free
 * Impact when present and otherwise the same calculated fallback used by the
 * coaching controller. An optional equivalent trajectory source is only a
 * consistency check; it never replaces or averages the visible point.
 */
export function resolveActiveImpactForPrecision(
  input: ActiveImpactForPrecisionInput | null | undefined
): PrecisionImpactPoint | null {
  if (!input) return null;

  let visibleImpactRg: PrecisionImpactPoint | null | undefined;
  if (input.impactMode === "CONTACT") {
    visibleImpactRg = input.contactVisibleImpactRg;
  } else if (input.impactMode === "FREE") {
    visibleImpactRg =
      input.freeStoredImpactRg ?? input.freeCalculatedFallbackImpactRg;
  } else {
    return null;
  }

  if (!isFinitePoint(visibleImpactRg)) return null;

  if (
    input.trajectoryContactImpactRg !== null &&
    input.trajectoryContactImpactRg !== undefined &&
    !validateImpactSourceConsistency(
      visibleImpactRg,
      input.trajectoryContactImpactRg,
      input.consistencyToleranceRg
    )
  ) {
    return null;
  }

  return { x: visibleImpactRg.x, y: visibleImpactRg.y };
}

export type ImpactThroughMarkInput = {
  movingMark: "CO" | "C1";
  fixedCoord: PrecisionImpactPoint | null | undefined;
  impactCoord: PrecisionImpactPoint | null | undefined;
  /** Canonical descriptor from baselineMarkAxisSnap. */
  allowedAxis: MarkAxisLock | null | undefined;
};

function isImpactBetweenCandidateAndFixed(
  candidate: PrecisionImpactPoint,
  impact: PrecisionImpactPoint,
  fixed: PrecisionImpactPoint
): boolean {
  const candidateToImpact = distance(candidate, impact);
  const impactToFixed = distance(impact, fixed);
  const candidateToFixed = distance(candidate, fixed);
  const scale = Math.max(1, candidateToFixed);

  // The parametric intersection already establishes the line; retain an
  // explicit collinear + between check so extrapolation cannot be accepted
  // if the implementation is changed later.
  const cross =
    (impact.x - fixed.x) * (candidate.y - fixed.y) -
    (impact.y - fixed.y) * (candidate.x - fixed.x);
  if (Math.abs(cross) > IMPACT_GEOMETRY_EPSILON_RG * scale) return false;

  return (
    Math.abs(candidateToImpact + impactToFixed - candidateToFixed) <=
    IMPACT_GEOMETRY_EPSILON_RG * scale
  );
}

/**
 * Find the moving CO/C1 candidate where fixedHandle → Impact intersects the
 * already-resolved allowed Mark axis.
 *
 * The product order is movingCandidate → Impact → fixedHandle. Therefore an
 * intersection between fixed and Impact, or on the opposite extrapolation,
 * fails closed. No clamping is performed when the candidate is outside the
 * descriptor domain.
 */
export function resolveImpactThroughMark(
  input: ImpactThroughMarkInput | null | undefined
): PrecisionImpactPoint | null {
  if (
    !input ||
    (input.movingMark !== "CO" && input.movingMark !== "C1") ||
    !isFinitePoint(input.fixedCoord) ||
    !isFinitePoint(input.impactCoord) ||
    !isFiniteAxisLock(input.allowedAxis)
  ) {
    return null;
  }

  const fixed = input.fixedCoord;
  const impact = input.impactCoord;
  const axis = input.allowedAxis;

  if (distance(fixed, impact) <= IMPACT_GEOMETRY_EPSILON_RG) return null;

  const dx = impact.x - fixed.x;
  const dy = impact.y - fixed.y;
  const fixedConstant =
    axis.constantAxis === "x" ? fixed.x : fixed.y;
  const deltaConstant = axis.constantAxis === "x" ? dx : dy;

  // Zero denominator covers both a parallel line and the coincident,
  // underdetermined case. Both are intentionally unresolved.
  if (Math.abs(deltaConstant) <= IMPACT_GEOMETRY_EPSILON_RG) return null;

  const t = (axis.constantValue - fixedConstant) / deltaConstant;
  if (!Number.isFinite(t) || t <= 1 + IMPACT_GEOMETRY_EPSILON_RG) {
    return null;
  }

  const candidate = {
    x: fixed.x + t * dx,
    y: fixed.y + t * dy,
  };
  if (!isFinitePoint(candidate)) return null;

  const candidateVarying =
    axis.varying === "x" ? candidate.x : candidate.y;
  if (
    !Number.isFinite(candidateVarying) ||
    candidateVarying < axis.varyMin ||
    candidateVarying > axis.varyMax
  ) {
    return null;
  }

  const normalizedCandidate =
    axis.constantAxis === "x"
      ? { x: axis.constantValue, y: candidateVarying }
      : { x: candidateVarying, y: axis.constantValue };

  return isImpactBetweenCandidateAndFixed(
    normalizedCandidate,
    impact,
    fixed
  )
    ? normalizedCandidate
    : null;
}

