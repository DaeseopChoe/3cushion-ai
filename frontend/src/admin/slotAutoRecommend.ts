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

export type SlotId = "S1" | "S2" | "S3";

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
  kdIndex: PositionKDIndex;
  loadDraftFromStrategyEntry: (
    slot: SlotId,
    entry: StrategyEntry,
    meta?: { positionId: string; score: number }
  ) => void;
};

/**
 * 슬롯 클릭 시 KD-Tree로 Top1 PositionRecord 검색 후
 * 해당 슬롯의 StrategyEntry를 draft에만 로딩
 */
export function runAutoRecommend(params: RunAutoRecommendParams): void {
  const {
    slot,
    currentBalls,
    currentSignature,
    kdIndex,
    loadDraftFromStrategyEntry,
  } = params;

  const signatureKey = makeSignatureKey(currentSignature);
  const top1 = kdIndex.searchTop1(signatureKey, currentBalls, { maxDist2: MAX_DIST2 });

  if (!top1) return;

  const entry = top1.position.strategies.find(
    (s) =>
      s.slot === slot && makeSignatureKey(s.signature) === signatureKey
  );

  if (!entry) return;

  loadDraftFromStrategyEntry(slot, entry, {
    positionId: top1.position.positionId,
    score: top1.score,
  });
}
