/**
 * endpointEdit.ts
 * Trajectory Extension — endpoint edit constraints (P2-5 Handle Drag).
 *
 * Geometry Owner = Extension Domain (SSOT §8.0).
 * Draft-only updates. No Dataset / Second Ball / Builder writes.
 *
 * Extension1: Origin fixed · endpoint slides on locked cushion (1-axis).
 * Extension2: E1 end fixed as start · endpoint free (2-axis).
 */

import { detectRail, type Rail } from "../reflectionEngine";
import { projectPointToRail } from "../../utils/geometry/rail";
import type { RgPoint, TrajectoryExtensionIndex } from "./model";
import type { TrajectoryExtensionDraft } from "./proposal";

const RG_W = 80;
const RG_H = 40;

export type ExtensionHandleMark = 1 | 2;

function isValidPoint(p: RgPoint | null | undefined): p is RgPoint {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Resolve cushion rail to lock for Extension1 drag (prefer current endpoint rail). */
export function resolveExtension1RailLock(
  currentEndpoint: RgPoint | null | undefined
): Rail | null {
  if (!isValidPoint(currentEndpoint)) return null;
  return detectRail(currentEndpoint);
}

/**
 * Extension1 endpoint: project onto locked rail (cushion 1-axis).
 * Origin is never moved here — only the endpoint coordinate.
 */
export function constrainExtension1Endpoint(
  pointerRg: RgPoint,
  lockedRail: Rail | null,
  fallbackEndpoint: RgPoint
): RgPoint {
  if (!isValidPoint(pointerRg)) {
    return { x: fallbackEndpoint.x, y: fallbackEndpoint.y };
  }
  const rail =
    lockedRail ??
    detectRail(pointerRg) ??
    detectRail(fallbackEndpoint);
  if (rail) {
    const projected = projectPointToRail(pointerRg, rail);
    if (projected) return projected;
  }
  return { x: fallbackEndpoint.x, y: fallbackEndpoint.y };
}

/**
 * Extension2 endpoint: free move inside table Rg (start stays E1 end via chain resolve).
 */
export function constrainExtension2Endpoint(pointerRg: RgPoint): RgPoint {
  if (!isValidPoint(pointerRg)) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp(pointerRg.x, 0, RG_W),
    y: clamp(pointerRg.y, 0, RG_H),
  };
}

/** Patch draft item endpoint (userEdited=true). Origin / other items unchanged. */
export function updateDraftEndpoint(
  draft: TrajectoryExtensionDraft,
  index: TrajectoryExtensionIndex,
  endpoint: RgPoint
): TrajectoryExtensionDraft {
  if (!draft || !Array.isArray(draft.items)) return draft;
  const ts = new Date().toISOString();
  return {
    origin: draft.origin,
    items: draft.items.map((item) =>
      item.index === index
        ? {
            ...item,
            endpoint: { x: endpoint.x, y: endpoint.y },
            userEdited: true,
            updatedAt: ts,
          }
        : item
    ),
  };
}

const EXTENSION_HANDLE_HIT_RADIUS_RG = 2.5;

/**
 * Hit-test Extension endpoint handles (same radius as CO/C1 baseline handles).
 * Closer mark wins when both are in range.
 */
export function hitTestExtensionHandle(
  pointerRg: RgPoint,
  handle1Rg: RgPoint | null | undefined,
  handle2Rg: RgPoint | null | undefined
): ExtensionHandleMark | null {
  if (!isValidPoint(pointerRg)) return null;
  const R = EXTENSION_HANDLE_HIT_RADIUS_RG;
  const d1 =
    isValidPoint(handle1Rg)
      ? Math.hypot(pointerRg.x - handle1Rg.x, pointerRg.y - handle1Rg.y)
      : Infinity;
  const d2 =
    isValidPoint(handle2Rg)
      ? Math.hypot(pointerRg.x - handle2Rg.x, pointerRg.y - handle2Rg.y)
      : Infinity;

  if (d2 <= R && (d1 > R || d2 < d1)) return 2;
  if (d1 <= R) return 1;
  return null;
}

export { EXTENSION_HANDLE_HIT_RADIUS_RG };
