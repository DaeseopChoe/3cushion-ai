/**
 * pathNodeHelpers.ts
 * TRJ-001 (Batch 5 STEP 5-1) — Trajectory path node pure geometry helpers.
 *
 * Domain Runtime only. No React, no side effects, no App dependency.
 */

import {
  normalizeAnchor,
  resolveAnchorPoint,
  type ResolveAnchorContext,
} from "../../utils/geometry/anchorResolve";
import type { Point } from "../../utils/geometry/line";
import {
  computeRailPoints,
  lineToRailIntersections,
  snapToRail,
} from "../../utils/geometry/rail";

export type PathPoint = Point;

const RG_PLAYING_RAIL_EPS = 0.75;
const RG_WIDTH = 80;
const RG_HEIGHT = 40;

function isOnRgPlayingRail(p: PathPoint): boolean {
  return (
    Math.abs(p.x) <= RG_PLAYING_RAIL_EPS ||
    Math.abs(p.x - RG_WIDTH) <= RG_PLAYING_RAIL_EPS ||
    Math.abs(p.y) <= RG_PLAYING_RAIL_EPS ||
    Math.abs(p.y - RG_HEIGHT) <= RG_PLAYING_RAIL_EPS
  );
}

/**
 * 궤적·CO→C1 선분용 시작점만 Rg 레일로 보정.
 * CO_rail 이 Fg(-2.25 등)에 머물면 draw path 첫 점만 교정.
 */
export function coStartForCushionPath(
  coRail: PathPoint | null | undefined,
  coPrep: PathPoint | null | undefined,
  c1Prep: PathPoint | null | undefined
): PathPoint | null {
  if (!coRail || !coPrep || !c1Prep) {
    return coRail ?? coPrep ?? null;
  }
  if (isOnRgPlayingRail(coRail)) {
    return coRail;
  }
  const { CO_rail: snapped } = computeRailPoints(coPrep, c1Prep);
  return snapped ?? coRail;
}

/**
 * 이전 궤적 점 → 앵커 의미점 방향, 세그먼트 [from, toward] 기준 첫 레일 교점.
 */
export function firstRailHitTowardTarget(
  from: PathPoint | null | undefined,
  toward: PathPoint | null | undefined
): PathPoint | null {
  if (!from || !toward) {
    return toward ?? null;
  }
  const hit = lineToRailIntersections(from, toward)?.C1_rail;
  return hit || snapToRail(toward) || toward;
}

/**
 * 궤적용: 앵커 원본에서 의미 좌표만 (라벨/데이터와 독립).
 */
export function anchorSemanticForPath(
  raw: unknown,
  resolveCtx?: ResolveAnchorContext
): PathPoint | null {
  const n = normalizeAnchor(raw);
  return n ? resolveAnchorPoint(n, resolveCtx) : null;
}
