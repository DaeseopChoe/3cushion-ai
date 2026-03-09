/**
 * 관리자 모드 슬롯 자동 추천
 * KD-Tree로 현재 balls에 가장 가까운 PositionRecord의 StrategyEntry를 draft에 로딩
 * applied는 절대 수정하지 않음
 */

import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
  StrategySignature,
} from "../domain/positionSearchEngine";
import type { PositionKDIndex } from "../domain/search/positionKDIndex";
import { makeSignatureKey } from "../domain/search/signatureKey";
import {
  ballsToPoint6D,
  dist2_6d,
} from "../domain/search/kdTree6d";

export type SlotId = "S1" | "S2" | "S3";

const COARSE_FILTER_RANGE = 3;
const TOP_K = 5;

/**
 * Weighted distance for re-ranking (cue > target > second 중요도)
 */
function weightedDistance(a: Ball3, b: Ball3): number {
  const CUE_W = 2.0;
  const TARGET_W = 1.5;
  const SECOND_W = 1.0;

  const cue =
    (a.cue.x - b.cue.x) ** 2 + (a.cue.y - b.cue.y) ** 2;
  const target =
    (a.target.x - b.target.x) ** 2 + (a.target.y - b.target.y) ** 2;
  const second =
    (a.second.x - b.second.x) ** 2 + (a.second.y - b.second.y) ** 2;

  return CUE_W * cue + TARGET_W * target + SECOND_W * second;
}

/**
 * spatial coarse filter: ±range grid 이내의 포지션만 후보로
 */
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

/** target_center 등 다양한 balls 형식을 Ball3로 정규화 */
export function normalizeBallsToBall3(balls: {
  cue?: { x: number; y: number };
  target?: { x: number; y: number };
  target_center?: { x: number; y: number };
  second?: { x: number; y: number };
}): Ball3 {
  const target = balls.target ?? balls.target_center ?? { x: 50, y: 25 };
  return {
    cue: balls.cue ?? { x: 10, y: 10 },
    target,
    second: balls.second ?? { x: 40, y: 20 },
  };
}

const EPSILON = 1.0;
const MAX_DIST2 = EPSILON * EPSILON * 6;

export type RunAutoRecommendParams = {
  slot: SlotId;
  currentBalls: Ball3;
  currentSignature: StrategySignature;
  dataset: PositionRecord[];
  kdIndex: PositionKDIndex;
  loadDraftFromStrategyEntry: (
    slot: SlotId,
    entry: StrategyEntry,
    meta?: { positionId: string; score: number }
  ) => void;
};

/**
 * 슬롯 클릭 시 KD-Tree TopK 검색 → Weighted Distance 재정렬 → Top1 추천
 *
 * flow: signature filter → spatial coarse filter → KD-tree TopK → Weighted Distance 재정렬 → Top1
 */
export function runAutoRecommend(params: RunAutoRecommendParams): void {
  const {
    slot,
    currentBalls,
    currentSignature,
    dataset,
    kdIndex,
    loadDraftFromStrategyEntry,
  } = params;

  const signatureKey = makeSignatureKey(currentSignature);

  // 1) signature filter: 해당 signature를 가진 전략이 있는 포지션만
  const withSignature = dataset.filter((rec) =>
    rec.strategies.some((s) => makeSignatureKey(s.signature) === signatureKey)
  );

  // 2) spatial coarse filter
  let candidates = spatialCoarseFilter(
    withSignature,
    currentBalls,
    COARSE_FILTER_RANGE
  );
  if (candidates.length < 2) {
    candidates = withSignature;
  }

  if (!candidates.length) return;

  // 3) KD-tree equivalent TopK: 6D dist2 기준 정렬 후 상위 K개
  const query6d = ballsToPoint6D(currentBalls);
  const scored = candidates.map((rec) => ({
    rec,
    dist2: dist2_6d(query6d, ballsToPoint6D(rec.balls)),
  }));
  scored.sort((a, b) => a.dist2 - b.dist2);
  const nearestList = scored
    .filter((x) => x.dist2 <= MAX_DIST2)
    .slice(0, TOP_K)
    .map((x) => x.rec);

  if (!nearestList.length) return;

  // 4) Weighted Distance 재정렬
  nearestList.sort((a, b) => {
    const da = weightedDistance(a.balls, currentBalls);
    const db = weightedDistance(b.balls, currentBalls);
    return da - db;
  });

  // 5) 최종 Top1 선택
  const best = nearestList[0];

  const entry = best.strategies.find(
    (s) => s.slot === slot && makeSignatureKey(s.signature) === signatureKey
  );

  if (!entry) return;

  const wd = weightedDistance(best.balls, currentBalls);
  loadDraftFromStrategyEntry(slot, entry, {
    positionId: best.positionId,
    score: wd,
  });
}
