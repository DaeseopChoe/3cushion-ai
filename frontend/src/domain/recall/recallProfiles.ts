/**
 * Compare profile policy lock (RECALL_SEARCH_SSOT_SPEC_2026-05).
 */

import type { CompareProfileId } from "./recallTypes";

export type RecallProfilePolicy = {
  id: CompareProfileId;
  coarsePerBall: number;
  /** L1 cap for match; null = no upper cap */
  totalL1Cap: number | null;
  topK: number;
  allowTargetSecondPermutation: boolean;
  /** When true, coarse-fail records are excluded (no allRanked fallback). */
  requireCoarsePass: boolean;
  /** strict bucket filter with fallback (admin) vs rank-all (user/passive) */
  targetBallFilterMode: "strictWithFallback" | "rankOnly";
  /** match return mode */
  outputMode: "top1" | "hintsOnly";
};

export const RECALL_PROFILES: Record<CompareProfileId, RecallProfilePolicy> = {
  adminStrict: {
    id: "adminStrict",
    coarsePerBall: 6,
    totalL1Cap: null,
    topK: 1,
    allowTargetSecondPermutation: false,
    requireCoarsePass: true,
    targetBallFilterMode: "strictWithFallback",
    outputMode: "top1",
  },
  adminSearch: {
    id: "adminSearch",
    coarsePerBall: 5,
    totalL1Cap: 15,
    topK: 1,
    allowTargetSecondPermutation: false,
    requireCoarsePass: true,
    targetBallFilterMode: "rankOnly",
    outputMode: "top1",
  },
  userStrict: {
    id: "userStrict",
    coarsePerBall: 3,
    totalL1Cap: 8,
    topK: 1,
    allowTargetSecondPermutation: true,
    requireCoarsePass: true,
    targetBallFilterMode: "rankOnly",
    outputMode: "top1",
  },
  /** @deprecated Use userStrict for USER Search. Kept for legacy tests; allows allRanked fallback. */
  userRelaxed: {
    id: "userRelaxed",
    coarsePerBall: 10,
    totalL1Cap: 18,
    topK: 3,
    allowTargetSecondPermutation: true,
    requireCoarsePass: false,
    targetBallFilterMode: "rankOnly",
    outputMode: "top1",
  },
  passiveHint: {
    id: "passiveHint",
    coarsePerBall: 12,
    totalL1Cap: null,
    topK: 3,
    allowTargetSecondPermutation: true,
    requireCoarsePass: false,
    targetBallFilterMode: "rankOnly",
    outputMode: "hintsOnly",
  },
};

export function getRecallProfile(profile: CompareProfileId): RecallProfilePolicy {
  return RECALL_PROFILES[profile];
}
