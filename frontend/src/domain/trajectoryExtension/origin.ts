/**
 * origin.ts
 * Trajectory Extension Origin Resolver (P1-3).
 *
 * Source of truth: TRAJECTORY_EXTENSION_SSOT.md §3 · v1.2
 *
 * Origin = last calculated path node (NOT Display Cap end).
 * Origin Index = min(chainBreakCap, sameRailCap)
 * second-ball Cap and resolveTrajectoryDisplayCap are never used.
 *
 * Read-only imports only:
 *   - computeChainBreakCapEndIndex / computeSameRailCapEndIndex
 *   - detectRail (rail presence check — not C2 reflection)
 *
 * Forbidden: trajectoryBuilder · reflectionPolicy · resolveReflectionC2 ·
 *            resolveTrajectoryDisplayCap · Runtime Contract · data/systems
 */

import {
  computeChainBreakCapEndIndex,
  computeSameRailCapEndIndex,
  type TrajectoryDisplayCapOptions,
} from "../trajectoryPathDisplayPolicy";
import { detectRail } from "../reflectionEngine";
import type { RgPoint, TrajectoryExtensionOrigin } from "./model";

/** Caps that participate in Origin Index (§3). second-ball Cap is excluded. */
export type OriginCapKind = "chain_break" | "same_rail";

/**
 * Origin Index policy (SSOT §3).
 * second-ball Cap must never contribute to Origin.
 */
export type OriginIndexPolicy = {
  applyChainBreakCap: true;
  applySameRailCap: true;
  applySecondBallCap: false;
};

export const ORIGIN_INDEX_POLICY: OriginIndexPolicy = {
  applyChainBreakCap: true,
  applySameRailCap: true,
  applySecondBallCap: false,
};

/**
 * Runtime Origin resolution result.
 * Coordinates are derived; never written back into Dataset origin field.
 */
export type ResolvedOrigin = {
  reference: TrajectoryExtensionOrigin;
  /** pathNodes index = min(chainBreakCap, sameRailCap) */
  index: number;
  point: RgPoint;
};

export type OriginValidityReason =
  | "ok"
  | "index_lt_1"
  | "rail_undetected"
  | "unresolved";

export type OriginValidity = {
  ok: boolean;
  reason: OriginValidityReason;
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

/**
 * Origin Index from Calculated Trajectory pathNodes (§3).
 *
 * Formula: min(chainBreakCap.endIndex, sameRailCap.endIndex)
 * Does not read Display Cap / second-ball Cap.
 */
export function resolveOriginIndex(
  pathNodes: ReadonlyArray<RgPoint | null | undefined>,
  opts?: TrajectoryDisplayCapOptions
): number {
  const nodes = pathNodes as Array<RgPoint | null | undefined>;
  const chain = computeChainBreakCapEndIndex(nodes);
  const sameRail = computeSameRailCapEndIndex(nodes, opts);
  return Math.min(chain.endIndex, sameRail.endIndex);
}

/**
 * Resolve Origin point = pathNodes[originIndex].
 * Returns null when index/point cannot be resolved.
 */
export function resolveOriginPoint(
  pathNodes: ReadonlyArray<RgPoint | null | undefined>,
  originIndex: number,
  reference: TrajectoryExtensionOrigin
): ResolvedOrigin | null {
  if (
    !Number.isFinite(originIndex) ||
    originIndex < 0 ||
    !Number.isInteger(originIndex)
  ) {
    return null;
  }
  if (originIndex >= pathNodes.length) {
    return null;
  }
  const point = pathNodes[originIndex];
  if (!isValidPoint(point)) {
    return null;
  }
  return {
    reference,
    index: originIndex,
    point: { x: point.x, y: point.y },
  };
}

/**
 * Origin validity gate for "궤적 연장" enablement (§3).
 * Requires: Origin Index >= 1 AND detectRail(Origin Point) succeeds.
 */
export function validateOrigin(
  resolved: ResolvedOrigin | null | undefined
): OriginValidity {
  if (resolved == null) {
    return { ok: false, reason: "unresolved" };
  }
  if (!Number.isFinite(resolved.index) || resolved.index < 1) {
    return { ok: false, reason: "index_lt_1" };
  }
  if (!isValidPoint(resolved.point)) {
    return { ok: false, reason: "unresolved" };
  }
  if (detectRail(resolved.point) == null) {
    return { ok: false, reason: "rail_undetected" };
  }
  return { ok: true, reason: "ok" };
}

/**
 * Whether Extension creation is allowed for the resolved Origin.
 * false when validation fails — no fallback generation.
 */
export function canCreateExtensionFromOrigin(
  resolved: ResolvedOrigin | null | undefined
): boolean {
  return validateOrigin(resolved).ok;
}

/**
 * Convenience for P2+: pathNodes + reference → ResolvedOrigin | null.
 * Does not create Extension geometry — Origin resolution only.
 */
export function resolveOrigin(
  pathNodes: ReadonlyArray<RgPoint | null | undefined>,
  reference: TrajectoryExtensionOrigin,
  opts?: TrajectoryDisplayCapOptions
): ResolvedOrigin | null {
  const index = resolveOriginIndex(pathNodes, opts);
  return resolveOriginPoint(pathNodes, index, reference);
}
