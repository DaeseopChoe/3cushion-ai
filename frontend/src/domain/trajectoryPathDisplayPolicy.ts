/**
 * Trajectory 표시 레이어 cap — same-rail 연속 segment 차단 · 세컨드볼 종료.
 * 계산 엔진/SYS 값 생성과 분리 (Display Layer only).
 */

import { detectRail } from "./reflectionEngine";
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

export type PathPoint = { x: number; y: number };

export type DisplayCapReason =
  | "full"
  | "missing_node"
  | "same_rail"
  | "second_ball";

export type TrajectoryDisplayCap = {
  endIndex: number;
  reason: DisplayCapReason;
  stoppedSegment?: string;
};

export type TrajectoryDisplayCapOptions = {
  railEps?: number;
  degenEps?: number;
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

  const railA = detectRail(a, railEps);
  const railB = detectRail(b, railEps);
  return railA != null && railB != null && railA === railB;
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
