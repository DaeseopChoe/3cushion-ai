/**
 * interpolate.ts
 * Trajectory Extension — Reflection Table linear interpolation.
 *
 * Source of truth: TRAJECTORY_EXTENSION_SSOT.md §5
 *
 * Behavior:
 *   1. exact hit      — incident equals a knot → that reflectDeg
 *   2. linear interp  — between adjacent knots
 *   3. clamp          — below min / above max → endpoint knot (no extrapolation)
 *
 * Extrapolation is forbidden.
 */

import {
  GLOBAL_REFLECTION_TABLE,
  type ReflectionTable,
  type ReflectionTableKnot,
} from "./table";

export type ReflectionLookupMode = "exact" | "interpolated" | "clamped";

export type ReflectionLookupResult = {
  incidentDeg: number;
  /** Incident after clamp into table domain (equals incidentDeg when in range). */
  clampedIncidentDeg: number;
  reflectDeg: number;
  mode: ReflectionLookupMode;
};

const EXACT_EPS = 1e-9;

function assertSortedKnots(knots: readonly ReflectionTableKnot[]): void {
  for (let i = 1; i < knots.length; i++) {
    if (knots[i].incidentDeg < knots[i - 1].incidentDeg) {
      throw new Error(
        "[trajectoryExtension/reflectionTable] knots must be sorted by incidentDeg ascending"
      );
    }
  }
}

/**
 * Look up proposed reflectDeg for an incident angle.
 * Never extrapolates past table endpoints.
 */
export function lookupReflectionAngle(
  incidentDeg: number,
  table: ReflectionTable = GLOBAL_REFLECTION_TABLE
): ReflectionLookupResult {
  const knots = table.knots;
  if (knots.length === 0) {
    throw new Error(
      "[trajectoryExtension/reflectionTable] Reflection Table has no knots"
    );
  }
  assertSortedKnots(knots);

  if (!Number.isFinite(incidentDeg)) {
    throw new Error(
      "[trajectoryExtension/reflectionTable] incidentDeg must be a finite number"
    );
  }

  const minDeg = knots[0].incidentDeg;
  const maxDeg = knots[knots.length - 1].incidentDeg;

  // Clamp — no extrapolation
  if (incidentDeg < minDeg) {
    return {
      incidentDeg,
      clampedIncidentDeg: minDeg,
      reflectDeg: knots[0].reflectDeg,
      mode: "clamped",
    };
  }
  if (incidentDeg > maxDeg) {
    return {
      incidentDeg,
      clampedIncidentDeg: maxDeg,
      reflectDeg: knots[knots.length - 1].reflectDeg,
      mode: "clamped",
    };
  }

  // Exact hit / bracket search
  for (let i = 0; i < knots.length; i++) {
    const knot = knots[i];
    if (Math.abs(knot.incidentDeg - incidentDeg) <= EXACT_EPS) {
      return {
        incidentDeg,
        clampedIncidentDeg: incidentDeg,
        reflectDeg: knot.reflectDeg,
        mode: "exact",
      };
    }
    if (i < knots.length - 1) {
      const next = knots[i + 1];
      if (incidentDeg > knot.incidentDeg && incidentDeg < next.incidentDeg) {
        const span = next.incidentDeg - knot.incidentDeg;
        const t = span === 0 ? 0 : (incidentDeg - knot.incidentDeg) / span;
        const reflectDeg =
          knot.reflectDeg + t * (next.reflectDeg - knot.reflectDeg);
        return {
          incidentDeg,
          clampedIncidentDeg: incidentDeg,
          reflectDeg,
          mode: "interpolated",
        };
      }
    }
  }

  // Fallback: last knot (incident == max within eps already handled)
  const last = knots[knots.length - 1];
  return {
    incidentDeg,
    clampedIncidentDeg: last.incidentDeg,
    reflectDeg: last.reflectDeg,
    mode: "exact",
  };
}

/**
 * Convenience: reflectDeg only (Default Proposal scalar).
 */
export function interpolateReflectDeg(
  incidentDeg: number,
  table: ReflectionTable = GLOBAL_REFLECTION_TABLE
): number {
  return lookupReflectionAngle(incidentDeg, table).reflectDeg;
}
