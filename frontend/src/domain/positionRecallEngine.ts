/**
 * Position Recall Engine (legacy facade)
 * adminStrict → runSpatialRecall. Other helpers unchanged.
 */

import { createPositionId } from "./positionId";
import type { Ball3, PositionRecord, TargetBall } from "./positionSearchEngine";
import { listStrategiesInRecord } from "./positionSearchEngine";
import { normalizeTargetBallForKey } from "./positionMergeEngine";
import { makeSignatureKey } from "./search/signatureKey";
import { ballsToPoint6D, dist2_6d as dist2_6d_raw } from "./search/kdTree6d";
import { runSpatialRecall } from "./recall/recallEngine";
import { ball3L1Sum as ball3L1SumCore } from "./recall/recallCompare";

// ---------------------------------------------------------------------------
// Types (legacy)
// ---------------------------------------------------------------------------

export type PositionRecallResult =
  | {
      kind: "no-match";
      reason: "empty-dataset" | "coarse-empty";
    }
  | {
      kind: "match";
      record: PositionRecord;
      distance: number;
    };

export type RunPositionRecallParams = {
  dataset: PositionRecord[];
  balls: Ball3;
  targetBall?: TargetBall | null;
};

export const RECALL_COARSE_MANHATTAN_PER_BALL = 6;

export function dist2_6d(a: Ball3, b: Ball3): number {
  const pa = ballsToPoint6D(a);
  const pb = ballsToPoint6D(b);
  return dist2_6d_raw(pa, pb);
}

export { ball3L1SumCore as ball3L1Sum };

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

export const RECALL_NEAREST_EPSILON_DEFAULT = 2.0;

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

/**
 * Legacy entry — delegates to pure engine profile adminStrict.
 */
export function runPositionRecall(
  params: RunPositionRecallParams
): PositionRecallResult {
  const { dataset, balls, targetBall } = params;

  const result = runSpatialRecall({
    dataset,
    query: { balls, targetBall },
    profile: "adminStrict",
  });

  if (result.kind === "match") {
    return {
      kind: "match",
      record: result.record,
      distance: result.distance,
    };
  }

  if (result.reason === "empty-dataset" || result.reason === "coarse-empty") {
    return { kind: "no-match", reason: result.reason };
  }

  return { kind: "no-match", reason: "coarse-empty" };
}
