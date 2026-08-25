/**
 * Pure Ball3 compare helpers (shared across profiles).
 *
 * Phase 7C — SEARCH BALL3 = ROLE-BASED DIRECT MATCH:
 * Distance compares cue↔cue, target↔target, second↔second only.
 * Target↔Second permutation is removed (not canonical).
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

/** Coarse gate: each Role ball must pass independently (cue/target/second). */
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
  coarsePass: boolean;
  targetBallMatch: boolean;
};

/**
 * Rank candidates by direct Role aggregate distance.
 * targetBall is metadata preference only (tie-break / filter upstream) — not a Role selector.
 */
export function rankRecordsForRecall(
  records: PositionRecord[],
  query: Ball3,
  policy: {
    coarsePerBall: number;
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
    const coarsePass = passesCoarseStrictRoles(
      query,
      stored,
      policy.coarsePerBall,
      metric
    );
    const distance = ball3AggregateDistance(query, stored, metric);

    rows.push({
      record: rec,
      distance,
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
