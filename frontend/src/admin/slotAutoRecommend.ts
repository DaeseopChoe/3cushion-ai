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

export type LooseBallsLike = {
  cue?: { x: number; y: number };
  target?: { x: number; y: number };
  target_center?: { x: number; y: number };
  second?: { x: number; y: number };
  impact?: { x: number; y: number };
};

/**
 * UI ballsState SSOT: 노란공은 target_center (렌더·드래그와 동일 우선순위).
 * Ball3.target만 있는 경우 target_center로 hydrate.
 */
export function hydrateBallsStateForUi(
  balls: LooseBallsLike | null | undefined
): Record<string, { x: number; y: number } | undefined> {
  if (!balls || typeof balls !== "object") return {};
  const target_center = balls.target_center ?? balls.target;
  const out: Record<string, { x: number; y: number } | undefined> = {};
  if (balls.cue) out.cue = balls.cue;
  if (target_center) out.target_center = target_center;
  if (balls.second) out.second = balls.second;
  if (balls.impact) out.impact = balls.impact;
  return out;
}

/** target_center 등 다양한 balls 형식을 Ball3로 정규화 (렌더 SSOT와 동일: target_center 우선) */
export function normalizeBallsToBall3(balls: LooseBallsLike): Ball3 {
  const target = balls.target_center ?? balls.target ?? { x: 50, y: 25 };
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
 * flow: runPositionRecall (coarse 볼별 Manhattan → L1 합 최소 Top1; nearest record의 entry 로딩)
 * 슬롯 entry 시그니처 일치는 이 함수에서 별도 검증
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
    targetBall: targetBall ?? null,
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
