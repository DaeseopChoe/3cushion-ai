/**
 * ADMIN Impact Ball ownership — CONTACT SSOT helpers.
 *
 * Impact is derived from calcImpactBall(cue, target, T).
 * Long-lived FREE authored balls.impact is not an ownership model.
 * Temporary balls.impact may exist only during an active Impact drag.
 */

import {
  findClosestSegmentProjection,
  projectBallOntoNearestSegment,
  type SegmentLike,
  type SegmentProjection,
} from "../trajectoryExtension/secondBallConstraint";
import type { ProjectionSegment } from "../trajectoryExtension/projectionSegments";
import {
  computeThicknessFromImpact,
  snapImpactToOrbit,
  type PhysicsScale,
  type Point,
  type ThicknessInfo,
} from "../../utils/physics/ImpactEngine";

export type RgPoint = { x: number; y: number };

export function stripAuthoredImpactBall<T extends Record<string, unknown>>(
  balls: T | null | undefined
): T | null | undefined {
  if (!balls || typeof balls !== "object") return balls;
  if (!("impact" in balls)) return balls;
  const { impact: _removed, ...rest } = balls as T & { impact?: unknown };
  return rest as T;
}

/** Canonical CONTACT impact — never prefer stale balls.impact. */
export function resolveContactImpactRg(args: {
  cue: RgPoint | null | undefined;
  target: RgPoint | null | undefined;
  T: string;
  calcImpactBall: (
    cue: RgPoint,
    target: RgPoint,
    T: string
  ) => RgPoint | null;
}): RgPoint | null {
  const { cue, target, T, calcImpactBall } = args;
  if (!cue || !target) return null;
  return calcImpactBall(cue, target, T);
}

/**
 * Convert an Impact center candidate into canonical thickness + orbit-snapped point.
 * Reuses existing ImpactEngine helpers only (no new physics).
 */
export function resolveImpactPointToCanonicalThickness(args: {
  cue: Point;
  target: Point;
  impactCandidate: Point;
  scale: PhysicsScale;
}): {
  thickness: ThicknessInfo;
  orbitImpact: Point;
} | null {
  const { cue, target, impactCandidate, scale } = args;
  const snap = snapImpactToOrbit(target, impactCandidate, cue, scale, 1.0);
  const orbitImpact = snap?.impactBall ?? impactCandidate;
  const thickness = computeThicknessFromImpact(cue, target, orbitImpact, scale);
  if (!thickness) return null;
  return { thickness, orbitImpact };
}

/**
 * Nearest displayed trajectory projection for Impact center.
 * Candidates = Calculated + Reveal + Extension (caller-supplied).
 * Cue→Impact dashed guide must not be included by the caller.
 */
export function projectImpactOntoNearestTrajectory(args: {
  impact: RgPoint | null | undefined;
  segments: ReadonlyArray<SegmentLike | ProjectionSegment>;
}): SegmentProjection | null {
  return projectBallOntoNearestSegment({
    ball: args.impact,
    segments: args.segments,
  });
}

export { findClosestSegmentProjection, projectBallOntoNearestSegment };
