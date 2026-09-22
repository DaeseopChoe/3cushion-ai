/**
 * Phase C — Local READ / Member-centric spatial Search.
 *
 * AUTHORITY: localStorage normalized_dataset only.
 * NEVER falls back to positions_dataset or family_* shadow.
 *
 * Pipeline:
 *   loadCanonicalNormalizedCorpus
 *   → familyMembers[] Ball3 rank (shared primitives)
 *   → collect all Strategies at winning Position (S1/S2/S3)
 *   → rematerialize ONLY those Members + Masters
 *   → PositionRecord for existing applyPositionRecall UI
 *
 * Does NOT rematerialize the whole corpus before search.
 */

import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, TargetBall } from "../positionSearchEngine";
import {
  loadCanonicalNormalizedCorpus,
  type LoadCanonicalNormalizedCorpusResult,
} from "../dataset/infra/canonicalNormalizedCorpusStore";
import type {
  FamilyMaster,
  FamilyMember,
} from "../family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "../family/rematerializeFamilyPartsToPositionRecords";
import { getRecallProfile } from "./recallProfiles";
import {
  filterBall3CandidatesByTargetBallStrict,
  passesCoarseStrictRoles,
  rankBall3CandidatesForRecall,
  type RecallDistanceMetric,
} from "./recallCompare";
import type { CompareProfileId } from "./recallTypes";

export type NormalizedLocalSearchFailureReason =
  | "canonical-missing"
  | "canonical-invalid"
  | "empty-corpus"
  | "coarse-empty"
  | "over-max-distance"
  | "hydrate-failed"
  | "no-candidates";

export type NormalizedLocalMemberHit = {
  familyId: string;
  memberId: string;
  sourceSlot: "S1" | "S2" | "S3";
  track: string;
  memberOrigin: string;
  positionId: string;
  distance: number;
};

export type NormalizedLocalSearchMatch = {
  kind: "match";
  positionId: string;
  distance: number;
  /** Assembled PositionRecord for the winning Position only (S1/S2/S3 preserved). */
  record: PositionRecord;
  /** All Strategy Members packed into `record`. */
  hits: NormalizedLocalMemberHit[];
  meta: {
    profile: CompareProfileId;
    coarsePassCount: number;
    targetBucketApplied: boolean;
    rankedCandidateCount: number;
    memberCount: number;
    strategySlots: Array<"S1" | "S2" | "S3">;
  };
};

export type NormalizedLocalSearchNoMatch = {
  kind: "no-match";
  reason: NormalizedLocalSearchFailureReason;
  meta?: {
    profile?: CompareProfileId;
    issues?: string[];
    bestDistance?: number;
    coarsePassCount?: number;
  };
};

export type NormalizedLocalSearchResult =
  | NormalizedLocalSearchMatch
  | NormalizedLocalSearchNoMatch;

export type RunNormalizedLocalMemberSearchParams = {
  query: { balls: Ball3; targetBall?: TargetBall | null };
  profile?: CompareProfileId;
  /**
   * Optional preloaded corpus (tests). When omitted, loads from
   * canonical normalized_dataset — never from flat/shadow.
   */
  corpus?: LoadCanonicalNormalizedCorpusResult;
};

function memberTargetBall(m: FamilyMember): TargetBall | null | undefined {
  return m.targetBall;
}

/**
 * Member-centric Local Search against canonical NormalizedDatasetEnvelope.
 */
export function runNormalizedLocalMemberSearch(
  params: RunNormalizedLocalMemberSearchParams
): NormalizedLocalSearchResult {
  const profileId: CompareProfileId = params.profile ?? "adminSearch";
  const policy = getRecallProfile(profileId);
  const metric: RecallDistanceMetric = policy.distanceMetric;
  const { balls: queryBalls, targetBall } = params.query;

  const loaded = params.corpus ?? loadCanonicalNormalizedCorpus();

  if (!loaded.ok) {
    return {
      kind: "no-match",
      reason: "canonical-invalid",
      meta: {
        profile: profileId,
        issues: loaded.issues?.map((i) => i.code) ?? [loaded.reason],
      },
    };
  }

  if (!loaded.present) {
    return {
      kind: "no-match",
      reason: "canonical-missing",
      meta: { profile: profileId },
    };
  }

  const envelope = loaded.envelope;
  const members = envelope.familyMembers;
  const masters = envelope.familyMasters;

  if (members.length === 0) {
    return {
      kind: "no-match",
      reason: "empty-corpus",
      meta: { profile: profileId, coarsePassCount: 0 },
    };
  }

  const masterById = new Map<string, FamilyMaster>(
    masters.map((m) => [m.familyId, m])
  );

  let pool = members;
  let targetBucketApplied = false;
  if (policy.targetBallFilterMode === "strictWithFallback") {
    const filtered = filterBall3CandidatesByTargetBallStrict(
      pool,
      targetBall,
      memberTargetBall
    );
    pool = filtered.candidates;
    targetBucketApplied = filtered.bucketApplied;
  }

  const allRanked = rankBall3CandidatesForRecall(pool, queryBalls, {
    coarsePerBall: policy.coarsePerBall,
    targetBall,
    distanceMetric: metric,
    getBalls: (m) => m.balls,
    getTargetBall: memberTargetBall,
    getTieBreakId: (m) =>
      `${createPositionId(m.balls)}|${m.sourceSlot}|${m.memberId}`,
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
      meta: {
        profile: profileId,
        coarsePassCount,
        bestDistance: allRanked[0]?.distance,
      },
    };
  }

  const best = candidateRows[0]!;
  if (
    policy.totalDistanceCap != null &&
    best.distance > policy.totalDistanceCap
  ) {
    return {
      kind: "no-match",
      reason: "over-max-distance",
      meta: {
        profile: profileId,
        bestDistance: best.distance,
        coarsePassCount,
      },
    };
  }

  const bestPositionId = createPositionId(best.candidate.balls);

  // Preserve all Strategies at the winning Position (S1/S2/S3) — never
  // positionId-only dedupe that drops sibling slots.
  const siblingMembers = members.filter((m) => {
    if (createPositionId(m.balls) !== bestPositionId) return false;
    return passesCoarseStrictRoles(
      queryBalls,
      m.balls,
      policy.coarsePerBall,
      metric
    );
  });

  if (siblingMembers.length === 0) {
    return {
      kind: "no-match",
      reason: "no-candidates",
      meta: { profile: profileId, coarsePassCount },
    };
  }

  const neededFamilyIds = new Set(siblingMembers.map((m) => m.familyId));
  const neededMasters: FamilyMaster[] = [];
  for (const fid of neededFamilyIds) {
    const master = masterById.get(fid);
    if (!master) {
      return {
        kind: "no-match",
        reason: "hydrate-failed",
        meta: {
          profile: profileId,
          issues: [`missing-master:${fid}`],
        },
      };
    }
    neededMasters.push(master);
  }

  const remat = rematerializeFamilyPartsToPositionRecords({
    masters: neededMasters,
    members: siblingMembers,
  });
  if (!remat.ok) {
    return {
      kind: "no-match",
      reason: "hydrate-failed",
      meta: {
        profile: profileId,
        issues: remat.issues.map((i) => i.code),
      },
    };
  }

  const record =
    remat.dataset.find((r) => r.positionId === bestPositionId) ??
    remat.dataset[0];
  if (!record) {
    return {
      kind: "no-match",
      reason: "hydrate-failed",
      meta: { profile: profileId, issues: ["empty-rematerialize"] },
    };
  }

  const hits: NormalizedLocalMemberHit[] = siblingMembers.map((m) => ({
    familyId: m.familyId,
    memberId: m.memberId,
    sourceSlot: m.sourceSlot,
    track: m.track,
    memberOrigin: m.memberOrigin,
    positionId: bestPositionId,
    distance: best.distance,
  }));

  const strategySlots = (
    ["S1", "S2", "S3"] as const
  ).filter((s) => record.strategies[s] != null);

  return {
    kind: "match",
    positionId: record.positionId,
    distance: best.distance,
    record,
    hits,
    meta: {
      profile: profileId,
      coarsePassCount,
      targetBucketApplied,
      rankedCandidateCount: candidateRows.length,
      memberCount: members.length,
      strategySlots,
    },
  };
}
