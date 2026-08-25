/**
 * Compare profile policy lock (RECALL_SEARCH_SSOT_SPEC_2026-05).
 *
 * Phase 7C — SEARCH BALL3 = ROLE-BASED DIRECT MATCH:
 * - query.target ↔ candidate.target, query.second ↔ candidate.second
 * - Target↔Second permutation removed (no allowTargetSecondPermutation)
 *
 * LocalDB ADMIN Search (`adminSearch`):
 * - distanceMetric: euclidean (Rg)
 * - coarsePerBall: 2.0 — each ball center must pass independently
 * - totalDistanceCap: null — per-ball gate is primary; aggregate ranks winners
 */

import type { RecallDistanceMetric } from "./recallCompare";
import type { CompareProfileId } from "./recallTypes";

export type RecallProfilePolicy = {
  id: CompareProfileId;
  /** Per-ball coarse cutoff in the profile's distanceMetric units (Rg). */
  coarsePerBall: number;
  /**
   * Aggregate distance cap for match (same metric as ranking).
   * null = no upper cap (rely on per-ball coarse gate).
   */
  totalDistanceCap: number | null;
  /** @deprecated Alias of totalDistanceCap — kept for older call sites. */
  totalL1Cap: number | null;
  topK: number;
  /** When true, coarse-fail records are excluded (no allRanked fallback). */
  requireCoarsePass: boolean;
  /** strict bucket filter with fallback (admin) vs rank-all (user/passive) */
  targetBallFilterMode: "strictWithFallback" | "rankOnly";
  /** match return mode */
  outputMode: "top1" | "hintsOnly";
  /** Default manhattan. LocalDB ADMIN Search uses euclidean. */
  distanceMetric: RecallDistanceMetric;
};

function profile(
  partial: Omit<RecallProfilePolicy, "totalL1Cap"> & {
    totalDistanceCap: number | null;
  }
): RecallProfilePolicy {
  return {
    ...partial,
    totalL1Cap: partial.totalDistanceCap,
  };
}

export const RECALL_PROFILES: Record<CompareProfileId, RecallProfilePolicy> = {
  adminStrict: profile({
    id: "adminStrict",
    coarsePerBall: 6,
    totalDistanceCap: null,
    topK: 1,
    requireCoarsePass: true,
    targetBallFilterMode: "strictWithFallback",
    outputMode: "top1",
    distanceMetric: "manhattan",
  }),
  adminSearch: profile({
    id: "adminSearch",
    /** Euclidean Rg — each of cue/target/second must be within this radius. */
    coarsePerBall: 2.0,
    /** Per-ball gate is sufficient; theoretical max aggregate for candidates = 6. */
    totalDistanceCap: null,
    topK: 1,
    requireCoarsePass: true,
    targetBallFilterMode: "rankOnly",
    outputMode: "top1",
    distanceMetric: "euclidean",
  }),
  userStrict: profile({
    id: "userStrict",
    coarsePerBall: 3,
    totalDistanceCap: 8,
    topK: 1,
    requireCoarsePass: true,
    targetBallFilterMode: "rankOnly",
    outputMode: "top1",
    distanceMetric: "manhattan",
  }),
  /** @deprecated Use userStrict for USER Search. Kept for legacy tests. */
  userRelaxed: profile({
    id: "userRelaxed",
    coarsePerBall: 10,
    totalDistanceCap: 18,
    topK: 3,
    requireCoarsePass: false,
    targetBallFilterMode: "rankOnly",
    outputMode: "top1",
    distanceMetric: "manhattan",
  }),
  passiveHint: profile({
    id: "passiveHint",
    coarsePerBall: 12,
    totalDistanceCap: null,
    topK: 3,
    requireCoarsePass: false,
    targetBallFilterMode: "rankOnly",
    outputMode: "hintsOnly",
    distanceMetric: "manhattan",
  }),
};

export function getRecallProfile(profileId: CompareProfileId): RecallProfilePolicy {
  return RECALL_PROFILES[profileId];
}

/** Soft UI warning: aggregate Euclidean sum above this still matches (adminSearch). */
export const ADMIN_SEARCH_SOFT_DISTANCE_WARN = 4.0;
