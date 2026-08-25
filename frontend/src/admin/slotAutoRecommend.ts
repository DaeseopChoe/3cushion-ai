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
 * UI ballsState SSOT (Phase 2–3 Role): physical Target → balls.target.
 * Accepts Ball3.target or legacy target_center shape alias; emits Role field only.
 * History restore uses this — Role identity preserved (no color→field remap).
 */
export function hydrateBallsStateForUi(
  balls: LooseBallsLike | null | undefined
): Record<string, { x: number; y: number } | undefined> {
  if (!balls || typeof balls !== "object") return {};
  const target = balls.target ?? balls.target_center;
  const out: Record<string, { x: number; y: number } | undefined> = {};
  if (balls.cue) out.cue = { x: balls.cue.x, y: balls.cue.y };
  if (target) out.target = { x: target.x, y: target.y };
  if (balls.second) out.second = { x: balls.second.x, y: balls.second.y };
  if (balls.impact) out.impact = { x: balls.impact.x, y: balls.impact.y };
  return out;
}

/**
 * Phase 3 SAVE / LocalDB Ball3 SSOT — Role-preserving normalization.
 *
 *   balls.cue    = physical Cue
 *   balls.target = physical Target
 *   balls.second = physical Second
 *
 * Never swaps target/second by color. Never emits target_center.
 * target_center is accepted only as a shape alias for missing balls.target.
 */
export function normalizeBallsToBall3(balls: LooseBallsLike): Ball3 {
  const cue = balls.cue ?? { x: 10, y: 10 };
  const target = balls.target ?? balls.target_center ?? { x: 50, y: 25 };
  const second = balls.second ?? { x: 40, y: 20 };
  return {
    cue: { x: cue.x, y: cue.y },
    target: { x: target.x, y: target.y },
    second: { x: second.x, y: second.y },
  };
}

/**
 * History snapshot write: store Role UI balls (no color-slot remapping).
 * Same mapping as hydrate — ensures snapshot.balls.target = physical Target.
 */
export function canonicalizeBallsStateForHistorySnapshot(
  balls: LooseBallsLike | null | undefined
): Record<string, { x: number; y: number } | undefined> {
  return hydrateBallsStateForUi(balls);
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
