/**
 * Position Recall Engine
 * 순수 검색 엔진. UI 상태/localStorage/React 접근 금지.
 * Recall v1.1: dataset → targetBall 버킷 → coarse (볼별 |dx|+|dy| ≤ 6, AND) →
 * 전체 L1 거리합 최소인 단일 record (Top1 canonical).
 * KD-tree 미사용.
 */

import { createPositionId } from "./positionId";
import type { Ball3, PositionRecord, TargetBall } from "./positionSearchEngine";
import { listStrategiesInRecord } from "./positionSearchEngine";
import { normalizeTargetBallForKey } from "./positionMergeEngine";
import { makeSignatureKey } from "./search/signatureKey";
import { ballsToPoint6D, dist2_6d as dist2_6d_raw } from "./search/kdTree6d";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PositionRecallResult =
  | {
      kind: "no-match";
      reason: "empty-dataset" | "coarse-empty";
    }
  | {
      kind: "match";
      record: PositionRecord;
      /** Σ(|Δx|+|Δy|) over cue, target, second — coarse 통과 후보 중 최소 */
      distance: number;
    };

export type RunPositionRecallParams = {
  dataset: PositionRecord[];
  balls: Ball3;
  /** 현재 UI 타겟; null/undefined → yellow 버킷. 해당 버킷 레코드 없으면 필터 생략(레거시 호환) */
  targetBall?: TargetBall | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Recall v1.1 coarse: 각 볼(cue / target / second)에 대해
 * Manhattan |dx|+|dy| ≤ 이 값이면 해당 볼 tolerance 통과 (세 볼 모두 AND).
 */
export const RECALL_COARSE_MANHATTAN_PER_BALL = 6;

// ---------------------------------------------------------------------------
// Helper: dist2_6d (Ball3 → 6D 변환 후 유클리드 제곱 거리) — KD/검색 공용
// ---------------------------------------------------------------------------

export function dist2_6d(a: Ball3, b: Ball3): number {
  const pa = ballsToPoint6D(a);
  const pb = ballsToPoint6D(b);
  return dist2_6d_raw(pa, pb);
}

// ---------------------------------------------------------------------------
// Recall v1: L1 (Manhattan) 합 — cue/target/second 동등
// ---------------------------------------------------------------------------

export function ball3L1Sum(a: Ball3, b: Ball3): number {
  const l1 = (p: { x: number; y: number }, q: { x: number; y: number }) =>
    Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
  return (
    l1(a.cue, b.cue) +
    l1(a.target, b.target) +
    l1(a.second, b.second)
  );
}

// ---------------------------------------------------------------------------
// Position LOCK용: exact positionId → nearest Ball3 (선형 스캔, O(N))
// 거리 = cue/target/second 각 유클리드 거리의 합 (제곱 아님)
// ---------------------------------------------------------------------------

function pointDist(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function calcBall3DistanceSum(a: Ball3, b: Ball3): number {
  return (
    pointDist(a.cue, b.cue) +
    pointDist(a.target, b.target) +
    pointDist(a.second, b.second)
  );
}

/** nearest 허용 상한 (그리드 단위, 튜닝 가능) */
export const RECALL_NEAREST_EPSILON_DEFAULT = 2.0;

/**
 * 1) createPositionId(currentBalls) 완전 일치
 * 2) 없으면 dataset 전체에서 calcBall3DistanceSum 최소, minDist <= epsilon 일 때만 반환
 */
export function recallPosition(
  currentBalls: Ball3 | null | undefined,
  dataset: PositionRecord[],
  epsilon: number = RECALL_NEAREST_EPSILON_DEFAULT
): PositionRecord | null {
  if (!currentBalls?.cue || !currentBalls?.target || !currentBalls?.second) {
    return null;
  }

  const positionId = createPositionId(currentBalls);
  const exact = dataset.find((r) => r.positionId === positionId);
  if (exact) return exact;

  let best: PositionRecord | null = null;
  let minDist = Infinity;

  for (const record of dataset) {
    const b = record.balls;
    if (!b?.cue || !b?.target || !b?.second) continue;
    const d = calcBall3DistanceSum(currentBalls, b);
    if (d < minDist) {
      minDist = d;
      best = record;
    }
  }

  if (best != null && minDist <= epsilon) return best;
  return null;
}

// ---------------------------------------------------------------------------
// Helper: filterRecordsBySignature
// makeSignatureKey(entry.signature) === signatureKey 인 전략을 가진 record만
// ---------------------------------------------------------------------------

export function filterRecordsBySignature(
  dataset: PositionRecord[],
  signatureKey: string
): PositionRecord[] {
  return dataset.filter((rec) =>
    listStrategiesInRecord(rec).some(
      (s) => makeSignatureKey(s.signature) === signatureKey
    )
  );
}

export function filterRecordsByTargetBall(
  records: PositionRecord[],
  targetBall: TargetBall | null | undefined
): PositionRecord[] {
  const want = normalizeTargetBallForKey(targetBall);
  const filtered = records.filter(
    (rec) => normalizeTargetBallForKey(rec.targetBall) === want
  );
  return filtered.length > 0 ? filtered : records;
}

// ---------------------------------------------------------------------------
// Recall v1.1 coarse: 볼별 Manhattan (AND) — weighted 없음
// ---------------------------------------------------------------------------

function withinBallTolerance(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tolerance = RECALL_COARSE_MANHATTAN_PER_BALL
): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= tolerance;
}

function spatialCoarseFilter(
  records: PositionRecord[],
  balls: Ball3,
  tolerance = RECALL_COARSE_MANHATTAN_PER_BALL
): PositionRecord[] {
  return records.filter((pos) => {
    const b = pos.balls;
    const cueOk = withinBallTolerance(b.cue, balls.cue, tolerance);
    const targetOk = withinBallTolerance(b.target, balls.target, tolerance);
    const secondOk = withinBallTolerance(b.second, balls.second, tolerance);
    return cueOk && targetOk && secondOk;
  });
}

// ---------------------------------------------------------------------------
// Main: runPositionRecall
// ---------------------------------------------------------------------------

export function runPositionRecall(
  params: RunPositionRecallParams
): PositionRecallResult {
  const { dataset, balls, targetBall } = params;

  console.log("[runPositionRecall:entry]", {
    datasetLength: dataset.length,
    targetBall: targetBall ?? null,
  });

  if (!dataset.length) {
    console.log("[runPositionRecall]", { reason: "empty-dataset" });
    return { kind: "no-match", reason: "empty-dataset" };
  }

  const withTarget = filterRecordsByTargetBall(dataset, targetBall);

  const candidates = spatialCoarseFilter(withTarget, balls);
  if (!candidates.length) {
    console.log("[runPositionRecall]", { reason: "coarse-empty" });
    return { kind: "no-match", reason: "coarse-empty" };
  }

  let best: PositionRecord | null = null;
  let bestL1 = Infinity;
  for (const rec of candidates) {
    const l1 = ball3L1Sum(rec.balls, balls);
    if (
      best == null ||
      l1 < bestL1 ||
      (l1 === bestL1 && rec.positionId.localeCompare(best.positionId) < 0)
    ) {
      best = rec;
      bestL1 = l1;
    }
  }

  if (!best) {
    return { kind: "no-match", reason: "coarse-empty" };
  }

  console.log("[runPositionRecall:match]", {
    positionId: best.positionId,
    distance: bestL1,
  });

  return {
    kind: "match",
    record: best,
    distance: bestL1,
  };
}
