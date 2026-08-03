/**
 * table.ts
 * Trajectory Extension — Global Reflection Table (Default Proposal data).
 *
 * Source of truth (policy): TRAJECTORY_EXTENSION_SSOT.md §5 · v1.2 · D-EXT-07
 *
 * Reflection Table is NOT a Reverse Spin physics engine.
 * Absolute reflection models do not exist (spin / energy / friction / impact vary).
 * This table only supplies the standard initial Proposal for admin editing.
 * Final Reverse End is always admin Handle Drag.
 *
 * Placement: domain/trajectoryExtension/reflectionTable/ only.
 * Forbidden: data/systems/*, runtime/contract, trajectory/reflectionPolicy.
 *
 * Numeric knots: Freeze SSOT confirmed Global + linear interpolation;
 * row values were not listed. v1 seeds identity mapping (θ_out = θ_in)
 * as a provisional Global Default Proposal until admin calibration replaces knots.
 */

/** One knot: incident angle → proposed reflect angle (degrees). */
export type ReflectionTableKnot = {
  /** Incidence angle of the current segment at the cushion (deg). */
  incidentDeg: number;
  /** Proposed reflection / outgoing angle in the same convention (deg). */
  reflectDeg: number;
};

/** Global Reflection Table asset (v1 — single shared table). */
export type ReflectionTable = {
  id: "global_v1";
  /** Degrees; knots must be sorted ascending by incidentDeg. */
  knots: readonly ReflectionTableKnot[];
};

/**
 * Global Default Proposal table.
 * Identity mapping: angle of incidence = angle of reflection.
 * Between knots: linear interpolation (see interpolate.ts). Outside: clamp.
 */
export const GLOBAL_REFLECTION_TABLE: ReflectionTable = {
  id: "global_v1",
  knots: Object.freeze([
    { incidentDeg: 0, reflectDeg: 0 },
    { incidentDeg: 15, reflectDeg: 15 },
    { incidentDeg: 30, reflectDeg: 30 },
    { incidentDeg: 45, reflectDeg: 45 },
    { incidentDeg: 60, reflectDeg: 60 },
    { incidentDeg: 75, reflectDeg: 75 },
    { incidentDeg: 90, reflectDeg: 90 },
  ] as const),
};

/** Convenience: default table for proposal lookup. */
export const DEFAULT_REFLECTION_TABLE: ReflectionTable = GLOBAL_REFLECTION_TABLE;

/** Incident domain of the Global table (inclusive). */
export function getReflectionTableIncidentRange(
  table: ReflectionTable = GLOBAL_REFLECTION_TABLE
): { minDeg: number; maxDeg: number } {
  const knots = table.knots;
  if (knots.length === 0) {
    return { minDeg: 0, maxDeg: 0 };
  }
  return {
    minDeg: knots[0].incidentDeg,
    maxDeg: knots[knots.length - 1].incidentDeg,
  };
}
