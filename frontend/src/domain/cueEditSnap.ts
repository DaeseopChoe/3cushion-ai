/**
 * Cue-Only Edit Snap & Exact Position Replacement (Authoring normalization).
 *
 * NOT Search / KDTree / Membership / Ranking / Interpolation tolerance.
 * NOT Trajectory Sampling cueSet. Authoring PositionRecord.balls.cue only.
 */

import { createPositionId } from "./positionId";
import type { Ball3, Point, PositionRecord } from "./positionSearchEngine";

/** Cue Edit Snap Tolerance — Authoring SAVE only (Rg). Inclusive boundary. */
export const CUE_EDIT_SNAP_TOLERANCE_RG = 0.5;

export type EditSourceContext = {
  snapshotId: string;
  positionId: string;
  balls: Ball3;
  /** Lineage Authoring Cue centers (same Target+Second Exact as edit source). */
  cueCandidates: Point[];
};

export type CueEditSnapOutcome = {
  balls: Ball3;
  didSnap: boolean;
  distance: number | null;
  reason:
    | "no_edit_source"
    | "target_changed"
    | "second_changed"
    | "snapped"
    | "beyond_tolerance"
    | "no_candidates"
    | "already_exact";
};

export function pointExactEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Exact 3-Ball Position identity (6 coordinates). Not positionId quantization. */
export function ballsExactEqual(a: Ball3, b: Ball3): boolean {
  return (
    pointExactEqual(a.cue, b.cue) &&
    pointExactEqual(a.target, b.target) &&
    pointExactEqual(a.second, b.second)
  );
}

export function euclideanDistanceRg(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Cue Snap candidates from Authoring records in the loaded snapshot dataset
 * that share Exact Target + Exact Second with the edit-source balls.
 * Does not search the whole DB beyond this lineage set.
 */
export function collectLineageCueCandidates(
  dataset: PositionRecord[],
  editSourceBalls: Ball3
): Point[] {
  const out: Point[] = [];
  const seen = new Set<string>();
  for (const rec of dataset) {
    if (!pointExactEqual(rec.balls.target, editSourceBalls.target)) continue;
    if (!pointExactEqual(rec.balls.second, editSourceBalls.second)) continue;
    const key = `${rec.balls.cue.x},${rec.balls.cue.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ x: rec.balls.cue.x, y: rec.balls.cue.y });
  }
  return out;
}

export function buildEditSourceContext(
  snapshotId: string,
  balls: Ball3,
  dataset: PositionRecord[]
): EditSourceContext {
  return {
    snapshotId,
    positionId: createPositionId(balls),
    balls: {
      cue: { ...balls.cue },
      target: { ...balls.target },
      second: { ...balls.second },
    },
    cueCandidates: collectLineageCueCandidates(dataset, balls),
  };
}

function findNearestCue(
  cue: Point,
  candidates: Point[]
): { point: Point; distance: number } | null {
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestD = euclideanDistanceRg(cue, best);
  for (let i = 1; i < candidates.length; i += 1) {
    const d = euclideanDistanceRg(cue, candidates[i]);
    if (d < bestD) {
      best = candidates[i];
      bestD = d;
    }
  }
  return { point: best, distance: bestD };
}

/**
 * Apply Cue-Only Edit Snap gates. Returns balls to persist (possibly snapped).
 * Never uses cueSet / Published samples / global nearest search.
 */
export function applyCueEditSnap(
  current: Ball3,
  editSource: EditSourceContext | null | undefined
): CueEditSnapOutcome {
  if (!editSource) {
    return {
      balls: current,
      didSnap: false,
      distance: null,
      reason: "no_edit_source",
    };
  }

  if (!pointExactEqual(current.target, editSource.balls.target)) {
    return {
      balls: current,
      didSnap: false,
      distance: null,
      reason: "target_changed",
    };
  }

  if (!pointExactEqual(current.second, editSource.balls.second)) {
    return {
      balls: current,
      didSnap: false,
      distance: null,
      reason: "second_changed",
    };
  }

  const nearest = findNearestCue(current.cue, editSource.cueCandidates);
  if (!nearest) {
    return {
      balls: current,
      didSnap: false,
      distance: null,
      reason: "no_candidates",
    };
  }

  if (nearest.distance > CUE_EDIT_SNAP_TOLERANCE_RG) {
    return {
      balls: current,
      didSnap: false,
      distance: nearest.distance,
      reason: "beyond_tolerance",
    };
  }

  if (pointExactEqual(current.cue, nearest.point)) {
    return {
      balls: current,
      didSnap: false,
      distance: nearest.distance,
      reason: "already_exact",
    };
  }

  return {
    balls: {
      cue: { x: nearest.point.x, y: nearest.point.y },
      target: { x: current.target.x, y: current.target.y },
      second: { x: current.second.x, y: current.second.y },
    },
    didSnap: true,
    distance: nearest.distance,
    reason: "snapped",
  };
}
