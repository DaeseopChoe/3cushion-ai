/**
 * anchor 의미(coord + valueSpace) → 계산용 Rg 점,
 * CO→1C 레일 충돌점(SSOT) 교점
 */

import { computeLineFromPoints } from "./line";
import {
  lineRailIntersection,
  snapToRail,
  type Rail,
} from "./rail";
import type { Point } from "./line";

export type AnchorInput =
  | { x: number; y: number; coord?: never; valueSpace?: never }
  | { coord: { x: number; y: number }; valueSpace?: "Fg" | "Rg"; x?: never; y?: never };

export type NormalizedAnchor = {
  coord: { x: number; y: number };
  valueSpace?: "Fg" | "Rg";
};

export type ResolveAnchorContext = {
  mark?: string;
  track?: string | null;
  systemId?: string;
};

export function normalizeAnchor(anchor: unknown): NormalizedAnchor | null {
  if (anchor == null || typeof anchor !== "object") return null;

  const a = anchor as Record<string, unknown>;

  if ("coord" in a && a.coord != null && typeof a.coord === "object") {
    const c = a.coord as { x?: unknown; y?: unknown };
    const x = Number(c.x);
    const y = Number(c.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const vs = a.valueSpace;
    const valueSpace =
      vs === "Fg" || vs === "Rg" ? vs : undefined;
    return { coord: { x, y }, valueSpace };
  }

  if ("x" in a && "y" in a) {
    const x = Number(a.x);
    const y = Number(a.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { coord: { x, y } };
  }

  return null;
}

export function resolveAnchorPoint(
  anchor: NormalizedAnchor | null,
  _ctx?: ResolveAnchorContext
): Point | null {
  if (!anchor?.coord) return null;
  // Fg: direction/context only for intersection — never snap or convert coord here.
  return anchor.coord;
}

/**
 * CO→1C 직선과 교차시킬 레일:
 * - mark "CO": 출발 레일 (B2T → bottom, T2B → top)
 * - 그 외(1C 등): 첫 쿠션 레일 (B2T → top, T2B → bottom)
 */
function impactRailForContext(ctx?: ResolveAnchorContext): Rail | null {
  const track = ctx?.track;
  if (!track || typeof track !== "string") return null;
  const coDeparture = ctx?.mark === "CO";
  if (track.startsWith("B2T")) return coDeparture ? "BOTTOM" : "TOP";
  if (track.startsWith("T2B")) return coDeparture ? "TOP" : "BOTTOM";
  return null;
}

function isFinitePoint(p: Point | null): p is Point {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

/**
 * CO→1C 방향 직선과 트랙에 해당하는 유효 레일의 교점 = C1_rail (SSOT)
 */
export function computeRailImpactPoint(
  from: Point | null | undefined,
  toward: Point | null | undefined,
  ctx?: ResolveAnchorContext
): Point | null {
  if (!isFinitePoint(from) || !isFinitePoint(toward)) {
    return toward != null && isFinitePoint(toward)
      ? snapToRail(toward) ?? toward
      : null;
  }

  const rail = impactRailForContext(ctx);
  const line = computeLineFromPoints(from, toward);

  if (rail) {
    const intersection = lineRailIntersection(line, rail);
    if (isFinitePoint(intersection)) return intersection;
  }

  const snapped = snapToRail(toward);
  return snapped ?? toward;
}
