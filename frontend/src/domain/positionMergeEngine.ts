/**
 * Position 병합 엔진
 * positionId = createPositionId(balls), 슬롯당 전략 1개(slot 키 overwrite)
 */

import { normalizeCanonicalStrategyEntry } from "./canonicalStrategy";
import { createPositionId } from "./positionId";
import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
  SlotStrategiesMap,
  TargetBall,
} from "./positionSearchEngine";

export const MERGE_EPSILON = 0.5;

/** undefined/null → yellow (레거시 dataset 호환) */
export function normalizeTargetBallForKey(
  t: PositionRecord["targetBall"]
): TargetBall {
  return t === "red" ? "red" : "yellow";
}

export function isSamePosition(
  a: PositionRecord,
  b: PositionRecord,
  epsilon: number = MERGE_EPSILON
): boolean {
  return (
    isSameBalls(a.balls, b.balls, epsilon) &&
    normalizeTargetBallForKey(a.targetBall) === normalizeTargetBallForKey(b.targetBall)
  );
}

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
  const pid = createPositionId(balls);
  const byId = dataset.find((r) => r.positionId === pid);
  if (byId) return byId;
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

/** 슬롯당 1전략: 해당 슬롯 키만 덮어쓰기 */
export function mergeStrategyIntoPosition(
  position: PositionRecord,
  newStrategy: StrategyEntry
): void {
  position.strategies[newStrategy.slot] = newStrategy;
}

/** localStorage 등 레거시 strategies 배열 → 슬롯 맵 */
export function normalizePositionRecord(raw: unknown): PositionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const balls = r.balls as Ball3 | undefined;
  if (!balls?.cue || !balls?.target || !balls?.second) return null;

  const strategies: SlotStrategiesMap = {};
  const s = r.strategies;
  if (Array.isArray(s)) {
    for (const e of s) {
      if (!e || typeof e !== "object") continue;
      const ent = e as StrategyEntry;
      if (ent.slot === "S1" || ent.slot === "S2" || ent.slot === "S3") {
        strategies[ent.slot] = ent;
      }
    }
  } else if (s && typeof s === "object") {
    for (const id of ["S1", "S2", "S3"] as const) {
      const e = (s as Record<string, unknown>)[id];
      if (e && typeof e === "object") strategies[id] = e as StrategyEntry;
    }
  }

  for (const id of ["S1", "S2", "S3"] as const) {
    const ent = strategies[id];
    if (ent) strategies[id] = normalizeCanonicalStrategyEntry(ent);
  }

  const canonicalId = createPositionId(balls);
  const positionId =
    typeof r.positionId === "string" && r.positionId.length > 0
      ? r.positionId
      : canonicalId;

  const targetBall = r.targetBall as PositionRecord["targetBall"];

  const schemaVersionRaw = r.schemaVersion;
  const schemaVersion =
    typeof schemaVersionRaw === "number" &&
    Number.isFinite(schemaVersionRaw) &&
    schemaVersionRaw >= 1
      ? Math.floor(schemaVersionRaw)
      : 1;

  let source: PositionRecord["source"];
  const rawSource = r.source;
  if (rawSource && typeof rawSource === "object") {
    const rs = rawSource as Record<string, unknown>;
    const kind = rs.kind;
    if (kind === "local" || kind === "import" || kind === "git") {
      const ref = rs.ref;
      source = {
        kind,
        ...(typeof ref === "string" && ref.length > 0 ? { ref } : {}),
      };
    }
  }

  return {
    positionId,
    balls,
    strategies,
    schemaVersion,
    ...(targetBall === "yellow" || targetBall === "red" ? { targetBall } : {}),
    ...(source ? { source } : {}),
  };
}

export function normalizeDatasetFromStorage(rows: unknown): PositionRecord[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(normalizePositionRecord)
    .filter((r): r is PositionRecord => r != null);
}

export function upsertPositionRecord(
  dataset: PositionRecord[],
  balls: Ball3,
  newStrategy: StrategyEntry,
  epsilon: number = MERGE_EPSILON,
  targetBall?: PositionRecord["targetBall"]
): PositionRecord[] {
  const positionId = createPositionId(balls);
  let idx = dataset.findIndex((r) => r.positionId === positionId);
  if (idx < 0) {
    idx = dataset.findIndex((r) => isSameBalls(r.balls, balls, epsilon));
  }

  const slot = newStrategy.slot;

  if (idx >= 0) {
    const found = dataset[idx];
    const nextStrategies = { ...found.strategies, [slot]: newStrategy };
    const updated: PositionRecord = {
      ...found,
      positionId,
      balls,
      strategies: nextStrategies,
    };
    if (targetBall === "yellow" || targetBall === "red") {
      updated.targetBall = targetBall;
    }
    return dataset.map((r, i) => (i === idx ? updated : r));
  }

  const newRecord: PositionRecord = {
    positionId,
    balls,
    strategies: { [slot]: newStrategy },
    ...(targetBall === "yellow" || targetBall === "red" ? { targetBall } : {}),
  };

  return [...dataset, newRecord];
}
