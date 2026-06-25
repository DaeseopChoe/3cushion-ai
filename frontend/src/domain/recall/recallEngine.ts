/**
 * Pure spatial recall engine — (dataset, RecallQuery, profile) → SpatialRecallResult
 */

import type { PositionRecord } from "../positionSearchEngine";
import { getRecallProfile } from "./recallProfiles";
import {
  filterRecordsByTargetBallStrict,
  rankRecordsForRecall,
} from "./recallCompare";
import type {
  RecallHintCandidate,
  RunSpatialRecallParams,
  SpatialRecallResult,
} from "./recallTypes";

function rowsToHints(
  rows: ReturnType<typeof rankRecordsForRecall>
): RecallHintCandidate[] {
  return rows.map((r) => ({
    positionId: r.record.positionId,
    distance: r.distance,
    record: r.record,
  }));
}

export function runSpatialRecall(
  params: RunSpatialRecallParams
): SpatialRecallResult {
  const { dataset, query, profile } = params;
  const policy = getRecallProfile(profile);
  const { balls, targetBall } = query;

  if (!dataset.length) {
    return {
      kind: "no-match",
      reason: "empty-dataset",
      meta: { profile },
    };
  }

  let pool: PositionRecord[] = dataset;
  let targetBucketApplied = false;

  if (policy.targetBallFilterMode === "strictWithFallback") {
    const filtered = filterRecordsByTargetBallStrict(pool, targetBall);
    pool = filtered.records;
    targetBucketApplied = filtered.bucketApplied;
  }

  const allRanked = rankRecordsForRecall(pool, balls, {
    coarsePerBall: policy.coarsePerBall,
    allowPermutation: policy.allowTargetSecondPermutation,
    targetBall,
  });

  const coarsePassed = allRanked.filter((r) => r.coarsePass);
  const coarsePassCount = coarsePassed.length;

  const candidateRows = policy.requireCoarsePass
    ? coarsePassed
    : coarsePassed.length > 0
      ? coarsePassed
      : allRanked;

  if (!candidateRows.length) {
    return {
      kind: "no-match",
      reason: "coarse-empty",
      meta: { profile, coarsePassCount, bestDistance: allRanked[0]?.distance },
    };
  }

  const topRows = candidateRows.slice(0, policy.topK);
  const best = topRows[0];
  const metaBase = {
    profile,
    coarsePassCount,
    usedPermutation: best.usedPermutation,
    targetBucketApplied,
    rankedCandidateCount: candidateRows.length,
  };

  if (policy.outputMode === "hintsOnly") {
    if (!topRows.length) {
      return {
        kind: "no-match",
        reason: "no-candidates",
        meta: { profile, coarsePassCount },
      };
    }
    return {
      kind: "hints",
      candidates: rowsToHints(topRows),
      meta: metaBase,
    };
  }

  if (
    policy.totalL1Cap != null &&
    best.distance > policy.totalL1Cap
  ) {
    return {
      kind: "no-match",
      reason: "over-max-distance",
      meta: {
        profile,
        bestDistance: best.distance,
        coarsePassCount,
      },
    };
  }

  return {
    kind: "match",
    positionId: best.record.positionId,
    distance: best.distance,
    record: best.record,
    meta: metaBase,
    hints: policy.topK > 1 ? rowsToHints(topRows) : undefined,
  };
}
