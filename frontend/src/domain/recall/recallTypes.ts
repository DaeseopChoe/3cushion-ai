/**
 * Recall / Search SSOT types (pure engine — no React/hydrate).
 */

import type { Ball3, PositionRecord, TargetBall } from "../positionSearchEngine";

export type CompareProfileId =
  | "adminStrict"
  | "adminSearch"
  | "userStrict"
  | "userRelaxed"
  | "passiveHint";

export type RecallQuery = {
  balls: Ball3;
  targetBall?: TargetBall | null;
};

export type RecallMatchMeta = {
  profile: CompareProfileId;
  coarsePassCount: number;
  usedPermutation: "none" | "swapTargetSecond";
  targetBucketApplied: boolean;
  rankedCandidateCount: number;
};

export type RecallNoMatchReason =
  | "empty-dataset"
  | "coarse-empty"
  | "over-max-distance"
  | "no-candidates";

export type RecallHintCandidate = {
  positionId: string;
  distance: number;
  record: PositionRecord;
};

export type SpatialRecallResult =
  | {
      kind: "match";
      positionId: string;
      distance: number;
      record: PositionRecord;
      meta: RecallMatchMeta;
      /** passiveHint: additional hint rows (TopK) */
      hints?: RecallHintCandidate[];
    }
  | {
      kind: "hints";
      candidates: RecallHintCandidate[];
      meta: RecallMatchMeta;
    }
  | {
      kind: "no-match";
      reason: RecallNoMatchReason;
      meta: {
        profile: CompareProfileId;
        bestDistance?: number;
        coarsePassCount?: number;
      };
    };

export type RunSpatialRecallParams = {
  dataset: PositionRecord[];
  query: RecallQuery;
  profile: CompareProfileId;
};
