/**
 * Trajectory 표시 레이어 cap — same-rail 연속 segment 차단 · 세컨드볼 종료.
 * Baseline(5&Half): PhysicalLimit + chain/same-rail + corrected DISPLAY ceiling.
 * Internal baseline pathNodes(C5/C6)는 보존; cushionPath/labels만 Cap으로 절단.
 * corrected second-ball XY로 baseline을 spatial clip하지 않음 (endIndex 상한만 공유).
 * (DISPLAY_BOUNDARY_POLICY_SSOT · 5&Half Baseline Display Ceiling).
 * 계산 엔진/SYS 값 생성과 분리 (Display Layer only).
 */

import { detectRail, resolveNearestRail } from "./reflectionEngine";
import { isSegmentHitBall } from "../utils/geometry";

export const PATH_NODE_MARKS = [
  "CO",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
] as const;

/** 5&Half — Baseline C4 >= 이 값이면 자연순환(C6)까지 PhysicalLimit. */
export const FIVE_HALF_BASELINE_C4_NATURAL_CYCLE_THRESHOLD = 20;

/** pathNodes index: C4 / C6 */
export const PATH_INDEX_C4 = 4;
export const PATH_INDEX_C6 = 6;

export type PathPoint = { x: number; y: number };

export type DisplayCapReason =
  | "full"
  | "missing_node"
  | "same_rail"
  | "second_ball"
  | "baseline_physical"
  | "corrected_ceiling";

export type TrajectoryDisplayCap = {
  endIndex: number;
  reason: DisplayCapReason;
  stoppedSegment?: string;
};

export type TrajectoryDisplayCapOptions = {
  /** Presence band for "on a cushion" (detectRail). Identity uses resolveNearestRail. */
  railEps?: number;
  degenEps?: number;
  /**
   * When true, skip same-rail early cut (ADMIN C2 reflectionOverride path).
   * detectRail() / resolveNearestRail() themselves are never modified — Cap policy only.
   */
  skipSameRail?: boolean;
};

export type BaselineDisplayCapInput = {
  pathNodes: (PathPoint | null | undefined)[];
  /**
   * 5&Half: corrected DISPLAY endIndex (cushion-order ceiling).
   * When finite ≥ 0, baseline display cannot exceed this index.
   * Does NOT spatialize-clip baseline to corrected second-ball XY.
   */
  correctedDisplayEndIndex?: number;
  /** Baseline 4쿠션 SYS 값 (DisplayModel과 동일 기준). */
  baselineC4Value: number | null | undefined;
  opts?: TrajectoryDisplayCapOptions;
};

const DEFAULT_RAIL_EPS = 3;
export const DEFAULT_DEGEN_EPS = 0.75;

function isValidPoint(p: PathPoint | null | undefined): p is PathPoint {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function pointDistance(a: PathPoint, b: PathPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function segmentMarkPair(index: number): string {
  const from = PATH_NODE_MARKS[index] ?? `node${index}`;
  const to = PATH_NODE_MARKS[index + 1] ?? `node${index + 1}`;
  return `${from}-${to}`;
}

/**
 * Same-rail for display-cap only (BUG-A fix):
 * 1) detectRail(eps) — both endpoints must be near a cushion (interior → not same-rail)
 * 2) resolveNearestRail — corner-safe identity (not detectRail Y-first label)
 *
 * Side-rail C2 inside EPS_RAIL of TOP/BOTTOM stays LEFT/RIGHT for identity,
 * so false C1–C2 same_rail cuts no longer fire. True mid-rail C4–C5 still truncates.
 */
function isSameRailSegment(
  a: PathPoint,
  b: PathPoint,
  opts?: TrajectoryDisplayCapOptions
): boolean {
  const railEps = opts?.railEps ?? DEFAULT_RAIL_EPS;
  const degenEps = opts?.degenEps ?? DEFAULT_DEGEN_EPS;

  if (pointDistance(a, b) < degenEps) {
    return true;
  }

  if (detectRail(a, railEps) == null || detectRail(b, railEps) == null) {
    return false;
  }

  return resolveNearestRail(a) === resolveNearestRail(b);
}

/** pathNodes chain — null/invalid node 이전까지 유효 index. */
export function computeChainBreakCapEndIndex(
  pathNodes: (PathPoint | null | undefined)[]
): TrajectoryDisplayCap {
  let lastValid = -1;

  for (let i = 0; i < pathNodes.length; i++) {
    if (!isValidPoint(pathNodes[i])) {
      if (lastValid < 0) {
        return { endIndex: -1, reason: "missing_node" };
      }
      return {
        endIndex: lastValid,
        reason: "missing_node",
        stoppedSegment: segmentMarkPair(i - 1),
      };
    }
    lastValid = i;
  }

  return { endIndex: lastValid, reason: "full" };
}

/** 연속 segment 양 끝이 동일 rail이면 해당 segment 직전 node에서 종료. */
export function computeSameRailCapEndIndex(
  pathNodes: (PathPoint | null | undefined)[],
  opts?: TrajectoryDisplayCapOptions
): TrajectoryDisplayCap {
  const chain = computeChainBreakCapEndIndex(pathNodes);
  if (opts?.skipSameRail === true) {
    return { endIndex: chain.endIndex, reason: chain.reason };
  }
  const limit = chain.endIndex;
  if (limit < 1) {
    return chain;
  }

  for (let i = 0; i < limit; i++) {
    const a = pathNodes[i]!;
    const b = pathNodes[i + 1]!;
    if (isSameRailSegment(a, b, opts)) {
      return {
        endIndex: i,
        reason: "same_rail",
        stoppedSegment: segmentMarkPair(i),
      };
    }
  }

  return { endIndex: limit, reason: "full" };
}

/** post-C3 segment 세컨드볼 hit — 기본 endIndex 3 (C3까지). */
export function computeSecondBallCapEndIndex(
  pathNodes: (PathPoint | null | undefined)[],
  secondPoint: PathPoint | null | undefined,
  hitTolerance: number
): TrajectoryDisplayCap {
  const chain = computeChainBreakCapEndIndex(pathNodes);
  const maxChain = chain.endIndex;
  if (maxChain < 0) {
    return { endIndex: -1, reason: "missing_node" };
  }

  let endIndex = Math.min(3, maxChain);
  let reason: DisplayCapReason = "full";

  if (isValidPoint(secondPoint) && maxChain >= 4) {
    const postC3Segments: [PathPoint | null | undefined, PathPoint | null | undefined][] =
      [
        [pathNodes[3], pathNodes[4]],
        [pathNodes[4], pathNodes[5]],
        [pathNodes[5], pathNodes[6]],
      ];

    for (let i = 0; i < postC3Segments.length; i++) {
      const [A, B] = postC3Segments[i];
      if (!isValidPoint(A) || !isValidPoint(B)) {
        continue;
      }
      if (isSegmentHitBall(A, B, secondPoint, hitTolerance)) {
        endIndex = Math.min(4 + i, maxChain);
        reason = "second_ball";
        break;
      }
    }
  }

  return { endIndex, reason };
}

function bindingReason(
  endIndex: number,
  chain: TrajectoryDisplayCap,
  sameRail: TrajectoryDisplayCap,
  secondBall: TrajectoryDisplayCap
): Pick<TrajectoryDisplayCap, "reason" | "stoppedSegment"> {
  if (endIndex === sameRail.endIndex && sameRail.reason === "same_rail") {
    return {
      reason: "same_rail",
      stoppedSegment: sameRail.stoppedSegment,
    };
  }
  if (endIndex === chain.endIndex && chain.reason === "missing_node") {
    return {
      reason: "missing_node",
      stoppedSegment: chain.stoppedSegment,
    };
  }
  if (endIndex === secondBall.endIndex && secondBall.reason === "second_ball") {
    return { reason: "second_ball" };
  }
  return { reason: "full" };
}

/** endIndex = min(sameRailCap, secondBallCap, chainBreakCap). */
export function resolveTrajectoryDisplayCap(
  pathNodes: (PathPoint | null | undefined)[],
  secondPoint: PathPoint | null | undefined,
  hitTolerance: number,
  opts?: TrajectoryDisplayCapOptions
): TrajectoryDisplayCap {
  const chain = computeChainBreakCapEndIndex(pathNodes);
  const sameRail = computeSameRailCapEndIndex(pathNodes, opts);
  const secondBall = computeSecondBallCapEndIndex(
    pathNodes,
    secondPoint,
    hitTolerance
  );

  const candidates = [chain.endIndex, sameRail.endIndex, secondBall.endIndex].filter(
    (n) => n >= 0
  );
  const endIndex =
    candidates.length > 0 ? Math.min(...candidates) : -1;

  const meta = bindingReason(endIndex, chain, sameRail, secondBall);
  return { endIndex, ...meta };
}

/**
 * 5&Half Baseline PhysicalLimit (Display SSOT).
 * C4 < 20 → C4까지 / C4 >= 20 → C6까지(자연순환).
 * C4 미확정이면 보수적으로 C4.
 */
export function computeBaselinePhysicalLimitEndIndex(
  baselineC4Value: number | null | undefined
): number {
  if (
    baselineC4Value == null ||
    !Number.isFinite(baselineC4Value)
  ) {
    return PATH_INDEX_C4;
  }
  if (baselineC4Value < FIVE_HALF_BASELINE_C4_NATURAL_CYCLE_THRESHOLD) {
    return PATH_INDEX_C4;
  }
  return PATH_INDEX_C6;
}

function normalizeCorrectedDisplayCeiling(
  correctedDisplayEndIndex: number | null | undefined
): number | null {
  if (
    correctedDisplayEndIndex == null ||
    !Number.isFinite(correctedDisplayEndIndex)
  ) {
    return null;
  }
  const n = Math.trunc(correctedDisplayEndIndex);
  return n >= 0 ? n : null;
}

function bindingReasonBaseline(
  endIndex: number,
  chain: TrajectoryDisplayCap,
  sameRail: TrajectoryDisplayCap,
  physicalLimit: number,
  existingEndIndex: number,
  correctedCeiling: number | null
): Pick<TrajectoryDisplayCap, "reason" | "stoppedSegment"> {
  if (endIndex === sameRail.endIndex && sameRail.reason === "same_rail") {
    return {
      reason: "same_rail",
      stoppedSegment: sameRail.stoppedSegment,
    };
  }
  if (endIndex === chain.endIndex && chain.reason === "missing_node") {
    return {
      reason: "missing_node",
      stoppedSegment: chain.stoppedSegment,
    };
  }
  // Corrected DISPLAY cushion-order ceiling bound the result below existing baseline cap.
  if (
    correctedCeiling != null &&
    endIndex === correctedCeiling &&
    correctedCeiling < existingEndIndex
  ) {
    return { reason: "corrected_ceiling" };
  }
  // PhysicalLimit stopped at C4 (C4 < 20 threshold) — not full chain
  if (endIndex === physicalLimit && physicalLimit === PATH_INDEX_C4) {
    return { reason: "baseline_physical" };
  }
  return { reason: "full" };
}

/**
 * Baseline Display Cap (5&Half):
 * existing = min(chain, same-rail, PhysicalLimit)
 * BaselineDisplayEnd = min(existing, correctedDisplayEndIndex?) when ceiling provided.
 *
 * Corrected second-ball XY is NOT a spatial clip point — only DISPLAY endIndex/Cn.
 * Internal pathNodes (incl. C5/C6) stay intact; callers slice cushionPath/labels via Cap.
 */
export function resolveBaselineTrajectoryDisplayCap(
  input: BaselineDisplayCapInput
): TrajectoryDisplayCap {
  const { pathNodes, baselineC4Value, correctedDisplayEndIndex, opts } = input;

  const chain = computeChainBreakCapEndIndex(pathNodes);
  const sameRail = computeSameRailCapEndIndex(pathNodes, opts);
  const physicalLimit = computeBaselinePhysicalLimitEndIndex(baselineC4Value);
  const correctedCeiling = normalizeCorrectedDisplayCeiling(
    correctedDisplayEndIndex
  );

  const existingCandidates = [
    chain.endIndex,
    sameRail.endIndex,
    physicalLimit,
  ].filter((n) => n >= 0);

  const existingEndIndex =
    existingCandidates.length > 0 ? Math.min(...existingCandidates) : -1;

  let endIndex = existingEndIndex;
  if (endIndex >= 0 && correctedCeiling != null) {
    endIndex = Math.min(endIndex, correctedCeiling);
  }

  const meta = bindingReasonBaseline(
    endIndex,
    chain,
    sameRail,
    physicalLimit,
    existingEndIndex,
    correctedCeiling
  );
  return { endIndex, ...meta };
}

/** cap.endIndex까지 path node slice (null 제외). */
export function slicePathNodesToCap(
  pathNodes: (PathPoint | null | undefined)[],
  cap: TrajectoryDisplayCap
): PathPoint[] {
  if (cap.endIndex < 0) {
    return [];
  }
  const out: PathPoint[] = [];
  for (let i = 0; i <= cap.endIndex && i < pathNodes.length; i++) {
    const p = pathNodes[i];
    if (isValidPoint(p)) {
      out.push(p);
    }
  }
  return out;
}
