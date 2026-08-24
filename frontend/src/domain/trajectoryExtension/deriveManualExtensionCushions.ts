/**
 * deriveManualExtensionCushions.ts
 * Phase 3A-359C — Manual Extension → C7/C8 physical cushion coordinates.
 *
 * Read-only interpretation of trajectoryExtensions endpoints (Rg):
 *   E1 → C7 (rail-normalized; fail-closed if not a recoverable rail point)
 *   E2 → direction C7→E2 → first next cushion = C8 (no auto-reflection)
 *
 * Does not persist C7/C8. Does not mutate input. Does not invent SYS scalars.
 * Does not model energy stop / reverse-spin / mirror reflection.
 */

import {
  angleDeg,
  detectRail,
  intersectRayWithRail,
  type Rail,
} from "../reflectionEngine";
import { projectPointToRail, snapToRail } from "../../utils/geometry/rail";
import type { RgPoint, TrajectoryExtensionPayload } from "./model";

/** Near-zero direction (E2 ≈ C7) — fail-closed for C8. */
export const MANUAL_EXTENSION_DIRECTION_EPS_RG = 1e-6;

/** Match proposal.findNextCushionHit skip distance. */
const RAY_MIN_DIST_RG = 0.5;

/** Table Rg bounds (same as reflectionEngine / endpointEdit). */
const RG_W = 80;
const RG_H = 40;
/** Allow tiny float overshoot before out-of-table reject. */
const TABLE_BOUNDS_EPS = 1e-6;

const ALL_RAILS: Rail[] = ["TOP", "BOTTOM", "LEFT", "RIGHT"];

export type ManualExtensionCushionFailReason =
  | "ok"
  | "missing_e1"
  | "invalid_e1"
  | "e1_not_on_rail"
  | "e1_out_of_table"
  | "missing_e2"
  | "invalid_e2"
  | "degenerate_direction"
  | "no_next_cushion";

export type ManualExtensionCushionPoint = {
  point: RgPoint;
  rail: Rail;
};

export type ManualExtensionCushionsResult = {
  c7: ManualExtensionCushionPoint | null;
  c8: ManualExtensionCushionPoint | null;
  c7Reason: ManualExtensionCushionFailReason;
  c8Reason: ManualExtensionCushionFailReason;
};

export type DeriveManualExtensionCushionsInput = {
  /** Extension1 endpoint (Rg). Required for C7. */
  e1?: RgPoint | null;
  /** Extension2 endpoint (Rg). Optional; absent → C7 only. */
  e2?: RgPoint | null;
};

function isFinitePoint(p: RgPoint | null | undefined): p is RgPoint {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function isInsideTableBounds(p: RgPoint): boolean {
  return (
    p.x >= -TABLE_BOUNDS_EPS &&
    p.x <= RG_W + TABLE_BOUNDS_EPS &&
    p.y >= -TABLE_BOUNDS_EPS &&
    p.y <= RG_H + TABLE_BOUNDS_EPS
  );
}

function clonePoint(p: RgPoint): RgPoint {
  return { x: p.x, y: p.y };
}

/**
 * Normalize E1 to an exact rail point using production rail helpers.
 * Fail-closed for interior / unrecoverable points (no ray invent from Origin).
 */
export function resolveManualExtensionC7(
  e1: RgPoint | null | undefined
): {
  c7: ManualExtensionCushionPoint | null;
  reason: ManualExtensionCushionFailReason;
} {
  if (e1 == null) {
    return { c7: null, reason: "missing_e1" };
  }
  if (!isFinitePoint(e1)) {
    return { c7: null, reason: "invalid_e1" };
  }
  if (!isInsideTableBounds(e1)) {
    return { c7: null, reason: "e1_out_of_table" };
  }

  const snapped = snapToRail(e1) ?? e1;
  const rail = detectRail(snapped);
  if (rail == null) {
    return { c7: null, reason: "e1_not_on_rail" };
  }

  const projected = projectPointToRail(snapped, rail);
  if (!projected || !isFinitePoint(projected)) {
    return { c7: null, reason: "e1_not_on_rail" };
  }

  const railAfter = detectRail(projected);
  if (railAfter == null) {
    return { c7: null, reason: "e1_not_on_rail" };
  }

  return {
    c7: { point: clonePoint(projected), rail: railAfter },
    reason: "ok",
  };
}

/**
 * Same selection rules as proposal.findNextCushionHit, but returns the
 * winning rail identity (avoids detectRail Y-first mislabel at corners).
 */
function findNextCushionHitWithRail(
  origin: RgPoint,
  travelDeg: number,
  currentRail: Rail | null
): { point: RgPoint; rail: Rail } | null {
  let best: { point: RgPoint; rail: Rail } | null = null;
  let bestDist = Infinity;
  for (const rail of ALL_RAILS) {
    if (currentRail != null && rail === currentRail) continue;
    const hit = intersectRayWithRail(origin, travelDeg, rail);
    if (!hit || !isFinitePoint(hit)) continue;
    const d = Math.hypot(hit.x - origin.x, hit.y - origin.y);
    if (d < RAY_MIN_DIST_RG) continue;
    if (d < bestDist) {
      bestDist = d;
      best = { point: { x: hit.x, y: hit.y }, rail };
    }
  }
  return best;
}

/**
 * C8 = first valid next cushion along manual direction C7 → E2.
 * No mirror / spin / SYS. Fail-closed when direction or hit is invalid.
 * Same-rail re-hit excluded via currentRail (findNextCushionHit policy).
 */
export function resolveManualExtensionC8(
  c7: ManualExtensionCushionPoint,
  e2: RgPoint | null | undefined
): {
  c8: ManualExtensionCushionPoint | null;
  reason: ManualExtensionCushionFailReason;
} {
  if (e2 == null) {
    return { c8: null, reason: "missing_e2" };
  }
  if (!isFinitePoint(e2)) {
    return { c8: null, reason: "invalid_e2" };
  }

  const dist = Math.hypot(e2.x - c7.point.x, e2.y - c7.point.y);
  if (dist <= MANUAL_EXTENSION_DIRECTION_EPS_RG) {
    return { c8: null, reason: "degenerate_direction" };
  }

  const travelDeg = angleDeg(c7.point, e2);
  const hit = findNextCushionHitWithRail(c7.point, travelDeg, c7.rail);
  if (!hit) {
    return { c8: null, reason: "no_next_cushion" };
  }

  return {
    c8: { point: clonePoint(hit.point), rail: hit.rail },
    reason: "ok",
  };
}

/**
 * Derive physical C7/C8 from manual extension endpoints (Rg).
 * Pure / non-mutating. Does not write dataset fields.
 */
export function deriveManualExtensionCushions(
  input: DeriveManualExtensionCushionsInput
): ManualExtensionCushionsResult {
  const c7Resolved = resolveManualExtensionC7(input.e1);
  if (!c7Resolved.c7) {
    return {
      c7: null,
      c8: null,
      c7Reason: c7Resolved.reason,
      c8Reason: "missing_e2",
    };
  }

  if (input.e2 == null) {
    return {
      c7: c7Resolved.c7,
      c8: null,
      c7Reason: "ok",
      c8Reason: "missing_e2",
    };
  }

  const c8Resolved = resolveManualExtensionC8(c7Resolved.c7, input.e2);
  return {
    c7: c7Resolved.c7,
    c8: c8Resolved.c8,
    c7Reason: "ok",
    c8Reason: c8Resolved.reason,
  };
}

/** Convenience: read E1/E2 from durable TrajectoryExtensionPayload (SAVE/Recall shape). */
export function deriveManualExtensionCushionsFromPayload(
  payload: TrajectoryExtensionPayload | null | undefined
): ManualExtensionCushionsResult {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return {
      c7: null,
      c8: null,
      c7Reason: "missing_e1",
      c8Reason: "missing_e2",
    };
  }
  const e1 = payload.items.find((it) => it.index === 1)?.endpoint ?? null;
  const e2 = payload.items.find((it) => it.index === 2)?.endpoint ?? null;
  return deriveManualExtensionCushions({ e1, e2 });
}
