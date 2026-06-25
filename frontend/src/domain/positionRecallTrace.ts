/**
 * STEP 2-2C / Phase 3 — Recall/Search TRACE (read-only; uses recall profiles).
 */

import type { Ball3, PositionRecord, TargetBall } from "./positionSearchEngine";
import type { RunPositionRecallParams } from "./positionRecallEngine";
import { filterRecordsByTargetBallStrict } from "./recall/recallCompare";
import { getRecallProfile } from "./recall/recallProfiles";
import { rankRecordsForRecall } from "./recall/recallCompare";
import type { CompareProfileId } from "./recall/recallTypes";

function ballCompareRow(
  label: string,
  stored: { x: number; y: number },
  query: { x: number; y: number },
  tolerance: number
) {
  const dx = Math.abs(stored.x - query.x);
  const dy = Math.abs(stored.y - query.y);
  const l1 = dx + dy;
  return {
    label,
    dx,
    dy,
    l1,
    pass: l1 <= tolerance,
  };
}

export type RecallTracePayload = {
  tag: string;
  profile: CompareProfileId;
  queryBalls: Ball3;
  targetBall: TargetBall | null;
  datasetLength: number;
  targetFilterApplied: boolean;
  withTargetCount: number;
  coarseCandidateCount: number;
  totalL1Cap: number | null;
  top5: Array<{
    positionId: string;
    storedBalls: Ball3;
    strategyKeys: string[];
    recordTargetBall: TargetBall | null | undefined;
    cue: ReturnType<typeof ballCompareRow>;
    target: ReturnType<typeof ballCompareRow>;
    second: ReturnType<typeof ballCompareRow>;
    coarsePass: boolean;
    l1Sum: number;
    usedPermutation?: "none" | "swapTargetSecond";
  }>;
};

/** Read-only compare dump for DEBUG (mirrors runSpatialRecall profile). */
export function buildRecallTracePayload(
  params: RunPositionRecallParams,
  tag: string,
  profile: CompareProfileId = "adminStrict"
): RecallTracePayload {
  const { dataset, balls, targetBall } = params;
  const policy = getRecallProfile(profile);

  let pool = dataset;
  let targetFilterApplied = false;
  if (policy.targetBallFilterMode === "strictWithFallback") {
    const filtered = filterRecordsByTargetBallStrict(pool, targetBall);
    pool = filtered.records;
    targetFilterApplied = filtered.bucketApplied;
  }

  const ranked = rankRecordsForRecall(pool, balls, {
    coarsePerBall: policy.coarsePerBall,
    allowPermutation: policy.allowTargetSecondPermutation,
    targetBall,
  });

  const coarseCandidateCount = ranked.filter((r) => r.coarsePass).length;
  const tol = policy.coarsePerBall;

  const top5 = ranked.slice(0, 5).map((row) => {
    const b = row.record.balls;
    return {
      positionId: row.record.positionId,
      storedBalls: b,
      strategyKeys: Object.keys(row.record.strategies ?? {}),
      recordTargetBall: row.record.targetBall ?? null,
      cue: ballCompareRow("cue", b.cue, balls.cue, tol),
      target: ballCompareRow("target", b.target, balls.target, tol),
      second: ballCompareRow("second", b.second, balls.second, tol),
      coarsePass: row.coarsePass,
      l1Sum: row.distance,
      usedPermutation: row.usedPermutation,
    };
  });

  return {
    tag,
    profile,
    queryBalls: balls,
    targetBall: targetBall ?? null,
    datasetLength: dataset.length,
    targetFilterApplied,
    withTargetCount: pool.length,
    coarseCandidateCount,
    totalL1Cap: policy.totalL1Cap,
    top5,
  };
}

export function summarizeDatasetRecords(dataset: PositionRecord[]) {
  const first = dataset[0];
  const last = dataset[dataset.length - 1];
  const summarize = (r: PositionRecord | undefined) =>
    r
      ? {
          positionId: r.positionId,
          balls: r.balls,
          targetBall: r.targetBall ?? null,
          strategyKeys: Object.keys(r.strategies ?? {}),
        }
      : null;
  return {
    length: dataset.length,
    first: summarize(first),
    last: summarize(last),
  };
}
