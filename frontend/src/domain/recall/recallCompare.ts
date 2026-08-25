/**
 * Pure Ball3 compare helpers (shared across profiles).
 *
 * Distance metrics:
 * - manhattan: per-ball |dx|+|dy|; aggregate = sum of three (legacy profiles)
 * - euclidean: per-ball hypot(dx,dy) in Rg; aggregate = dCue+dTarget+dSecond
 *   (LocalDB ADMIN Search / adminSearch — Phase 3A-360)
 */

import type { Ball3 } from "../positionSearchEngine";
import { normalizeTargetBallForKey } from "../positionMergeEngine";
import type { PositionRecord, TargetBall } from "../positionSearchEngine";

export type RecallDistanceMetric = "manhattan" | "euclidean";

export type Ball3Point = { x: number; y: number };

export function perBallManhattan(a: Ball3Point, b: Ball3Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Euclidean center distance in Ball3 table coordinates (Rg). */
export function perBallEuclidean(a: Ball3Point, b: Ball3Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function perBallDistance(
  a: Ball3Point,
  b: Ball3Point,
  metric: RecallDistanceMetric
): number {
  return metric === "euclidean" ? perBallEuclidean(a, b) : perBallManhattan(a, b);
}

export function ball3L1Sum(a: Ball3, b: Ball3): number {
  return (
    perBallManhattan(a.cue, b.cue) +
    perBallManhattan(a.target, b.target) +
    perBallManhattan(a.second, b.second)
  );
}

/** Sum of three per-ball Euclidean distances (Rg). */
export function ball3EuclideanSum(a: Ball3, b: Ball3): number {
  return (
    perBallEuclidean(a.cue, b.cue) +
    perBallEuclidean(a.target, b.target) +
    perBallEuclidean(a.second, b.second)
  );
}

export function ball3AggregateDistance(
  a: Ball3,
  b: Ball3,
  metric: RecallDistanceMetric
): number {
  return metric === "euclidean" ? ball3EuclideanSum(a, b) : ball3L1Sum(a, b);
}

/** target <-> second swap only; cue fixed */
export function swapTargetSecondBalls(b: Ball3): Ball3 {
  return {
    cue: b.cue,
    target: b.second,
    second: b.target,
  };
}

export function minL1WithTargetSecondPermutation(
  query: Ball3,
  stored: Ball3
): { distance: number; usedPermutation: "none" | "swapTargetSecond" } {
  const direct = ball3L1Sum(query, stored);
  const swapped = ball3L1Sum(query, swapTargetSecondBalls(stored));
  if (swapped < direct) {
    return { distance: swapped, usedPermutation: "swapTargetSecond" };
  }
  return { distance: direct, usedPermutation: "none" };
}

export function minAggregateWithTargetSecondPermutation(
  query: Ball3,
  stored: Ball3,
  metric: RecallDistanceMetric
): { distance: number; usedPermutation: "none" | "swapTargetSecond" } {
  if (metric === "manhattan") {
    return minL1WithTargetSecondPermutation(query, stored);
  }
  const direct = ball3EuclideanSum(query, stored);
  const swapped = ball3EuclideanSum(query, swapTargetSecondBalls(stored));
  if (swapped < direct) {
    return { distance: swapped, usedPermutation: "swapTargetSecond" };
  }
  return { distance: direct, usedPermutation: "none" };
}

export function passesCoarseStrictRoles(
  query: Ball3,
  stored: Ball3,
  tolerance: number,
  metric: RecallDistanceMetric = "manhattan"
): boolean {
  const b = stored;
  return (
    perBallDistance(b.cue, query.cue, metric) <= tolerance &&
    perBallDistance(b.target, query.target, metric) <= tolerance &&
    perBallDistance(b.second, query.second, metric) <= tolerance
  );
}

/** Coarse with optional target<->second swap on object balls (cue strict). */
export function passesCoarseWithPermutation(
  query: Ball3,
  stored: Ball3,
  tolerance: number,
  metric: RecallDistanceMetric = "manhattan"
): boolean {
  if (passesCoarseStrictRoles(query, stored, tolerance, metric)) return true;
  const swapped = swapTargetSecondBalls(stored);
  return (
    perBallDistance(swapped.cue, query.cue, metric) <= tolerance &&
    perBallDistance(swapped.target, query.target, metric) <= tolerance &&
    perBallDistance(swapped.second, query.second, metric) <= tolerance
  );
}

export function filterRecordsByTargetBallStrict(
  records: PositionRecord[],
  targetBall: TargetBall | null | undefined
): { records: PositionRecord[]; bucketApplied: boolean } {
  const want = normalizeTargetBallForKey(targetBall);
  const filtered = records.filter(
    (rec) => normalizeTargetBallForKey(rec.targetBall) === want
  );
  if (filtered.length > 0) {
    return { records: filtered, bucketApplied: true };
  }
  return { records, bucketApplied: false };
}

export type RankedRecallRow = {
  record: PositionRecord;
  distance: number;
  usedPermutation: "none" | "swapTargetSecond";
  coarsePass: boolean;
  targetBallMatch: boolean;
};

export function rankRecordsForRecall(
  records: PositionRecord[],
  query: Ball3,
  policy: {
    coarsePerBall: number;
    allowPermutation: boolean;
    targetBall?: TargetBall | null;
    /** Default manhattan (legacy). adminSearch uses euclidean. */
    distanceMetric?: RecallDistanceMetric;
  }
): RankedRecallRow[] {
  const metric: RecallDistanceMetric = policy.distanceMetric ?? "manhattan";
  const want = normalizeTargetBallForKey(policy.targetBall);
  const rows: RankedRecallRow[] = [];

  for (const rec of records) {
    const stored = rec.balls;
    const coarsePass = policy.allowPermutation
      ? passesCoarseWithPermutation(query, stored, policy.coarsePerBall, metric)
      : passesCoarseStrictRoles(query, stored, policy.coarsePerBall, metric);

    const { distance, usedPermutation } = policy.allowPermutation
      ? minAggregateWithTargetSecondPermutation(query, stored, metric)
      : {
          distance: ball3AggregateDistance(query, stored, metric),
          usedPermutation: "none" as const,
        };

    rows.push({
      record: rec,
      distance,
      usedPermutation,
      coarsePass,
      targetBallMatch: normalizeTargetBallForKey(rec.targetBall) === want,
    });
  }

  rows.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.targetBallMatch !== b.targetBallMatch) {
      return a.targetBallMatch ? -1 : 1;
    }
    return a.record.positionId.localeCompare(b.record.positionId);
  });

  return rows;
}
