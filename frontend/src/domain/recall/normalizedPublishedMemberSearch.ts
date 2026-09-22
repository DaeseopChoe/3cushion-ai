/**
 * Phase E-2 — Published READ / Member-centric spatial Search.
 *
 * AUTHORITY: FamilyMember[] from Published normalized leaf cache
 *   (v2 in-memory convert / v3 native parse — ONE path; no sourceSchemaVersion branch).
 *
 * Candidate semantics: POSITION (not per-Member).
 *   Members sharing createPositionId(balls) = ONE spatial candidate.
 *   Ranking uses the same Ball3 primitives as runSpatialRecall / PositionRecord[].
 *
 * Pipeline:
 *   FamilyMember[] → Position candidates
 *   → rankBall3CandidatesForRecall (profile-driven; adminStrict / userStrict)
 *   → winning positionId
 *   → sibling Members (S1/S2/S3) at that Position
 *   → FamilyMaster resolve (fail-closed)
 *   → rematerializeFamilyPartsToPositionRecords (winner-only)
 *   → Runtime PositionRecord for existing recall/UI boundary
 *
 * Does NOT use entry.records as Search corpus.
 * Does NOT rematerialize the whole leaf for Search.
 */

import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, TargetBall } from "../positionSearchEngine";
import type {
  FamilyMaster,
  FamilyMember,
  FamilySourceSlot,
} from "../family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "../family/rematerializeFamilyPartsToPositionRecords";
import { getRecallProfile } from "./recallProfiles";
import {
  filterBall3CandidatesByTargetBallStrict,
  rankBall3CandidatesForRecall,
  type RecallDistanceMetric,
} from "./recallCompare";
import type {
  CompareProfileId,
  RecallQuery,
  SpatialRecallResult,
} from "./recallTypes";

export type PublishedPositionCandidate = {
  positionId: string;
  balls: Ball3;
  targetBall: TargetBall | null | undefined;
  members: FamilyMember[];
};

export type RunNormalizedPublishedMemberSearchParams = {
  members: FamilyMember[];
  /** Leaf-scoped Master lookup (derived from envelope; not a second SSOT). */
  masterByFamilyId: Map<string, FamilyMaster>;
  query: RecallQuery;
  /** Published profiles only in production: adminStrict | userStrict. */
  profile: CompareProfileId;
};

function memberTargetBall(m: FamilyMember): TargetBall | null | undefined {
  return m.targetBall;
}

/**
 * Group Members into Position candidates (one per positionId).
 * Same Position ⇒ same spatial distance; Member count must not bias ranking.
 */
export function groupMembersIntoPositionCandidates(
  members: FamilyMember[]
): PublishedPositionCandidate[] {
  const byPosition = new Map<string, PublishedPositionCandidate>();

  for (const member of members) {
    const positionId = createPositionId(member.balls);
    const existing = byPosition.get(positionId);
    if (!existing) {
      byPosition.set(positionId, {
        positionId,
        balls: member.balls,
        targetBall: memberTargetBall(member),
        members: [member],
      });
      continue;
    }
    existing.members.push(member);
    // Prefer first defined targetBall; conflicts fail closed at hydrate.
    if (existing.targetBall == null && memberTargetBall(member) != null) {
      existing.targetBall = memberTargetBall(member);
    }
  }

  return Array.from(byPosition.values());
}

function detectDuplicateSourceSlots(
  siblings: FamilyMember[]
): FamilySourceSlot | null {
  const seen = new Set<FamilySourceSlot>();
  for (const m of siblings) {
    const slot = m.sourceSlot;
    if (seen.has(slot)) return slot;
    seen.add(slot);
  }
  return null;
}

/**
 * Position-level Published Search against normalized Members + Masters.
 * Returns SpatialRecallResult so ADMIN/USER flows keep existing apply/UI boundary.
 */
export function runNormalizedPublishedMemberSearch(
  params: RunNormalizedPublishedMemberSearchParams
): SpatialRecallResult {
  const { members, masterByFamilyId, query, profile: profileId } = params;
  const policy = getRecallProfile(profileId);
  const metric: RecallDistanceMetric = policy.distanceMetric;
  const { balls: queryBalls, targetBall } = query;

  if (!members.length) {
    return {
      kind: "no-match",
      reason: "empty-dataset",
      meta: { profile: profileId },
    };
  }

  let positions = groupMembersIntoPositionCandidates(members);
  let targetBucketApplied = false;

  if (policy.targetBallFilterMode === "strictWithFallback") {
    const filtered = filterBall3CandidatesByTargetBallStrict(
      positions,
      targetBall,
      (p) => p.targetBall
    );
    positions = filtered.candidates;
    targetBucketApplied = filtered.bucketApplied;
  }

  if (!positions.length) {
    return {
      kind: "no-match",
      reason: "empty-dataset",
      meta: { profile: profileId },
    };
  }

  const allRanked = rankBall3CandidatesForRecall(positions, queryBalls, {
    coarsePerBall: policy.coarsePerBall,
    targetBall,
    distanceMetric: metric,
    getBalls: (p) => p.balls,
    getTargetBall: (p) => p.targetBall,
    // Match PositionRecord ranking: tie-break by positionId only.
    getTieBreakId: (p) => p.positionId,
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

  const topRows = candidateRows.slice(0, policy.topK);
  const best = topRows[0]!;
  const metaBase = {
    profile: profileId,
    coarsePassCount,
    targetBucketApplied,
    rankedCandidateCount: candidateRows.length,
  };

  if (policy.outputMode === "hintsOnly") {
    // Published Search does not use hintsOnly; keep shape parity with runSpatialRecall.
    return {
      kind: "no-match",
      reason: "no-candidates",
      meta: { profile: profileId, coarsePassCount },
    };
  }

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

  const winning = best.candidate;
  const bestPositionId = winning.positionId;
  const siblingMembers = winning.members;

  if (!siblingMembers.length) {
    return {
      kind: "no-match",
      reason: "no-candidates",
      meta: { profile: profileId, coarsePassCount },
    };
  }

  const dupSlot = detectDuplicateSourceSlots(siblingMembers);
  if (dupSlot) {
    return {
      kind: "no-match",
      reason: "no-candidates",
      meta: { profile: profileId, coarsePassCount },
    };
  }

  const neededFamilyIds = new Set(siblingMembers.map((m) => m.familyId));
  const neededMasters: FamilyMaster[] = [];
  for (const fid of neededFamilyIds) {
    const master = masterByFamilyId.get(fid);
    if (!master) {
      return {
        kind: "no-match",
        reason: "no-candidates",
        meta: { profile: profileId, coarsePassCount },
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
      reason: "no-candidates",
      meta: { profile: profileId, coarsePassCount },
    };
  }

  const record: PositionRecord | undefined =
    remat.dataset.find((r) => r.positionId === bestPositionId) ??
    remat.dataset[0];
  if (!record) {
    return {
      kind: "no-match",
      reason: "no-candidates",
      meta: { profile: profileId, coarsePassCount },
    };
  }

  return {
    kind: "match",
    positionId: record.positionId,
    distance: best.distance,
    record,
    meta: metaBase,
  };
}
