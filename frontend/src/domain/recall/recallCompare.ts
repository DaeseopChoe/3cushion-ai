/**
 * Pure Ball3 compare helpers (shared across profiles).
 */

import type { Ball3 } from "../positionSearchEngine";
import { normalizeTargetBallForKey } from "../positionMergeEngine";
import type { PositionRecord, TargetBall } from "../positionSearchEngine";

export function ball3L1Sum(a: Ball3, b: Ball3): number {
  const l1 = (p: { x: number; y: number }, q: { x: number; y: number }) =>
    Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
  return (
    l1(a.cue, b.cue) +
    l1(a.target, b.target) +
    l1(a.second, b.second)
  );
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

export function perBallManhattan(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function passesCoarseStrictRoles(
  query: Ball3,
  stored: Ball3,
  tolerance: number
): boolean {
  const b = stored;
  return (
    perBallManhattan(b.cue, query.cue) <= tolerance &&
    perBallManhattan(b.target, query.target) <= tolerance &&
    perBallManhattan(b.second, query.second) <= tolerance
  );
}

/** Coarse with optional target<->second swap on object balls (cue strict). */
export function passesCoarseWithPermutation(
  query: Ball3,
  stored: Ball3,
  tolerance: number
): boolean {
  if (passesCoarseStrictRoles(query, stored, tolerance)) return true;
  const swapped = swapTargetSecondBalls(stored);
  return (
    perBallManhattan(swapped.cue, query.cue) <= tolerance &&
    perBallManhattan(swapped.target, query.target) <= tolerance &&
    perBallManhattan(swapped.second, query.second) <= tolerance
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
  }
): RankedRecallRow[] {
  const want = normalizeTargetBallForKey(policy.targetBall);
  const rows: RankedRecallRow[] = [];

  for (const rec of records) {
    const stored = rec.balls;
    const coarsePass = policy.allowPermutation
      ? passesCoarseWithPermutation(query, stored, policy.coarsePerBall)
      : passesCoarseStrictRoles(query, stored, policy.coarsePerBall);

    const { distance, usedPermutation } = policy.allowPermutation
      ? minL1WithTargetSecondPermutation(query, stored)
      : { distance: ball3L1Sum(query, stored), usedPermutation: "none" as const };

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
