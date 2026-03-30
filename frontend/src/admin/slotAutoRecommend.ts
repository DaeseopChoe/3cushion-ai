/**
 * 관리자 모드 슬롯 자동 추천
 * positionRecallEngine 기반으로 가장 가까운 PositionRecord의 StrategyEntry를 draft에 로딩
 * applied는 절대 수정하지 않음
 */

import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
  StrategySignature,
  TargetBall,
} from "../domain/positionSearchEngine";
import type { PositionKDIndex } from "../domain/search/positionKDIndex";
import { makeSignatureKey } from "../domain/search/signatureKey";
import { runPositionRecall } from "../domain/positionRecallEngine";

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

export type RunAutoRecommendParams = {
  slot: SlotId;
  currentBalls: Ball3;
  currentSignature: StrategySignature;
  dataset: PositionRecord[];
  kdIndex: PositionKDIndex;
  targetBall?: TargetBall | null;
  loadDraftFromStrategyEntry: (
    slot: SlotId,
    entry: StrategyEntry,
    meta?: { positionId: string; score: number }
  ) => void;
};

/**
 * 슬롯 클릭 시 positionRecallEngine으로 nearest 검색 → Top1 StrategyEntry를 draft에 로딩
 *
 * flow: runPositionRecall (signature filter → spatial coarse → 6D TopK → weighted 재정렬 → Top1)
 * 기존 동작 유지: threshold 무제한(Infinity)으로 항상 적용 시도
 */
export function runAutoRecommend(params: RunAutoRecommendParams): void {
  const {
    slot,
    currentBalls,
    currentSignature,
    dataset,
    targetBall,
    loadDraftFromStrategyEntry,
  } = params;

  const signatureKey = makeSignatureKey(currentSignature);

  const result = runPositionRecall({
    dataset,
    balls: currentBalls,
    signatureKey,
    thresholds: { soft: Infinity, hard: Infinity },
    targetBall: targetBall ?? null,
    topK: 5,
  });

  if (result.kind === "no-match") return;

  const best = result.record;
  const entry = best.strategies[slot];
  if (!entry || makeSignatureKey(entry.signature) !== signatureKey) return;

  loadDraftFromStrategyEntry(slot, entry, {
    positionId: best.positionId,
    score: result.distance,
  });
}
