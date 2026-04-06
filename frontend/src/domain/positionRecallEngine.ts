/**
 * Position Recall Engine
 * 순수 검색 엔진. UI 상태/localStorage/React 접근 금지.
 * slotAutoRecommend 로직을 추출·재구성. KD-tree 미사용.
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
      reason: "empty-dataset" | "signature-not-found" | "hard-threshold";
    }
  | { kind: "low-confidence"; record: PositionRecord; distance: number }
  | { kind: "match"; record: PositionRecord; distance: number };

export type RunPositionRecallParams = {
  dataset: PositionRecord[];
  balls: Ball3;
  signatureKey: string;
  thresholds: { soft: number; hard: number };
  /** 현재 UI 타겟; null/undefined → yellow 버킷. 해당 버킷 레코드 없으면 필터 생략(레거시 호환) */
  targetBall?: TargetBall | null;
  topK?: number;
  /**
   * @deprecated maxDist2 is no longer used for filtering.
   * Distance filtering must only happen at threshold stage.
   */
  maxDist2?: number;
};

// ---------------------------------------------------------------------------
// Constants (제곱 거리 기준)
// ---------------------------------------------------------------------------

const CUE_W = 2.0;
const TARGET_W = 1.5;
const SECOND_W = 1.0;

const DEFAULT_TOP_K = 5;

// ---------------------------------------------------------------------------
// Helper: dist2_6d (Ball3 → 6D 변환 후 유클리드 제곱 거리)
// ---------------------------------------------------------------------------

export function dist2_6d(a: Ball3, b: Ball3): number {
  const pa = ballsToPoint6D(a);
  const pb = ballsToPoint6D(b);
  return dist2_6d_raw(pa, pb);
}

// ---------------------------------------------------------------------------
// Helper: weightedBallDistance
// 제곱 거리(weighted squared distance) 반환.
// distance = 2.0*cueDist2 + 1.5*targetDist2 + 1.0*secondDist2
// ---------------------------------------------------------------------------

export function weightedBallDistance(a: Ball3, b: Ball3): number {
  const cue =
    (a.cue.x - b.cue.x) ** 2 + (a.cue.y - b.cue.y) ** 2;
  const target =
    (a.target.x - b.target.x) ** 2 + (a.target.y - b.target.y) ** 2;
  const second =
    (a.second.x - b.second.x) ** 2 + (a.second.y - b.second.y) ** 2;
  return CUE_W * cue + TARGET_W * target + SECOND_W * second;
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
// Helper: spatialCoarseFilter (slotAutoRecommend 로직 재사용)
// ---------------------------------------------------------------------------

const COARSE_FILTER_RANGE = 3;

function spatialCoarseFilter(
  records: PositionRecord[],
  balls: Ball3,
  range = COARSE_FILTER_RANGE
): PositionRecord[] {
  return records.filter((pos) => {
    const cueOk =
      Math.abs(pos.balls.cue.x - balls.cue.x) <= range &&
      Math.abs(pos.balls.cue.y - balls.cue.y) <= range;
    const targetOk =
      Math.abs(pos.balls.target.x - balls.target.x) <= range &&
      Math.abs(pos.balls.target.y - balls.target.y) <= range;
    const secondOk =
      Math.abs(pos.balls.second.x - balls.second.x) <= range &&
      Math.abs(pos.balls.second.y - balls.second.y) <= range;
    return cueOk && targetOk && secondOk;
  });
}

// ---------------------------------------------------------------------------
// Main: runPositionRecall
// ---------------------------------------------------------------------------

export function runPositionRecall(
  params: RunPositionRecallParams
): PositionRecallResult {
  const {
    dataset,
    balls,
    signatureKey,
    thresholds,
    targetBall,
    topK = DEFAULT_TOP_K,
  } = params;

  // 1. dataset 비어 있으면 no-match
  if (!dataset.length) {
    return { kind: "no-match", reason: "empty-dataset" };
  }

  // 2. signatureKey 기준 필터
  const withSignature = filterRecordsBySignature(dataset, signatureKey);
  if (!withSignature.length) {
    return { kind: "no-match", reason: "signature-not-found" };
  }

  // 2b. targetBall 버킷 (없으면 전체 유지 — 레거시 dataset)
  const withTarget = filterRecordsByTargetBall(withSignature, targetBall);

  // 3. spatial coarse filter
  let candidates = spatialCoarseFilter(withTarget, balls);
  if (candidates.length < 2) {
    candidates = withTarget;
  }

  // 4. 6D distance (dist2_6d) 계산 및 정렬
  const query6d = ballsToPoint6D(balls);
  const scored = candidates.map((rec) => ({
    rec,
    dist2: dist2_6d_raw(query6d, ballsToPoint6D(rec.balls)),
  }));
  scored.sort((a, b) => a.dist2 - b.dist2);

  // IMPORTANT:
  // Do NOT apply distance cut-off here.
  // Candidate filtering must be minimal (only coarse filter).
  // Final distance decision must be done at threshold stage only.
  // 5. TopK 선택
  const nearestList = scored.slice(0, topK).map((x) => x.rec);

  if (!nearestList.length) {
    return { kind: "no-match", reason: "hard-threshold" };
  }

  // 6. weighted distance 재정렬 (제곱 거리)
  nearestList.sort((a, b) => {
    const da = weightedBallDistance(a.balls, balls);
    const db = weightedBallDistance(b.balls, balls);
    return da - db;
  });

  // 7. Top1 선택
  const best = nearestList[0];
  const distance = weightedBallDistance(best.balls, balls);

  // 8. threshold 판정 (제곱 거리 기준)
  if (distance > thresholds.hard) {
    return { kind: "no-match", reason: "hard-threshold" };
  }
  if (distance > thresholds.soft) {
    return { kind: "low-confidence", record: best, distance };
  }
  return { kind: "match", record: best, distance };
}
