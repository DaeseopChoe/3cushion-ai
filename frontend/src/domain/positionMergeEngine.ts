/**
 * Position 병합 엔진
 * 동일(또는 ε 이내) balls 배치 시 새 PositionRecord 생성 대신 기존에 StrategyEntry 추가/갱신
 */

import type { Ball3, PositionRecord, StrategyEntry } from "./positionSearchEngine";

export const MERGE_EPSILON = 0.5;

export function isSameBalls(
  a: Ball3,
  b: Ball3,
  epsilon: number = MERGE_EPSILON
): boolean {
  return (
    Math.abs(a.cue.x - b.cue.x) < epsilon &&
    Math.abs(a.cue.y - b.cue.y) < epsilon &&
    Math.abs(a.target.x - b.target.x) < epsilon &&
    Math.abs(a.target.y - b.target.y) < epsilon &&
    Math.abs(a.second.x - b.second.x) < epsilon &&
    Math.abs(a.second.y - b.second.y) < epsilon
  );
}

export function findSimilarPosition(
  dataset: PositionRecord[],
  balls: Ball3,
  epsilon: number = MERGE_EPSILON
): PositionRecord | null {
  for (const pos of dataset) {
    if (isSameBalls(pos.balls, balls, epsilon)) return pos;
  }
  return null;
}

export function sameSignature(a: StrategyEntry, b: StrategyEntry): boolean {
  return (
    a.signature.systemId === b.signature.systemId &&
    a.signature.formulaHash === b.signature.formulaHash &&
    a.signature.shotType === b.signature.shotType
  );
}

export function mergeStrategyIntoPosition(
  position: PositionRecord,
  newStrategy: StrategyEntry
): void {
  const idx = position.strategies.findIndex(
    (s) => s.slot === newStrategy.slot && sameSignature(s, newStrategy)
  );

  if (idx >= 0) {
    position.strategies[idx] = newStrategy;
  } else {
    position.strategies.push(newStrategy);
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pos_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function upsertPositionRecord(
  dataset: PositionRecord[],
  balls: Ball3,
  newStrategy: StrategyEntry,
  epsilon: number = MERGE_EPSILON
): PositionRecord[] {
  const found = findSimilarPosition(dataset, balls, epsilon);

  if (found) {
    mergeStrategyIntoPosition(found, newStrategy);
    return [...dataset];
  }

  const newRecord: PositionRecord = {
    positionId: newId(),
    balls,
    strategies: [newStrategy],
  };

  return [...dataset, newRecord];
}
