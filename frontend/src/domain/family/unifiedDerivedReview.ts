/**
 * Unified Derived Review orchestration (Phase 3A-359L).
 *
 * Generators stay separate. Presentation + one-shot approval only.
 * Cue→Impact = interactive; C3+ = display-only markers.
 */

import type { Point, PositionRecord } from "../positionSearchEngine";
import {
  writeFamilyMembers,
  type FamilyWriteFailureCode,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import {
  CUE_IMPACT_DERIVED_APPROVAL_POLICY,
  createCueImpactDerivedReview,
  cueImpactReviewPreviewMarkers,
  fingerprintCueImpactCandidateSet,
  frozenReviewSourceForTrack,
  getVisibleReviewCandidates,
  type CueImpactDerivedPreviewMarker,
  type CueImpactDerivedReviewSession,
  type CreateCueImpactDerivedReviewResult,
} from "./cueImpactDerivedReview";
import {
  C3_PLUS_DERIVED_REVIEW_KIND,
  classifyC3PlusReviewOpen,
  createC3PlusDerivedReview,
  type C3PlusDerivedReviewSession,
  type C3PlusReviewOpenFeedback,
  type CreateC3PlusDerivedReviewResult,
} from "./c3PlusDerivedReview";
import { CUE_IMPACT_MEMBER_ORIGIN } from "./generateCueImpactDerivedMembers";
import { C3_PLUS_FOUR_TRACK_INCONSISTENT } from "./c3PlusFourTrackConsistency";
import type { FamilyTrack } from "./trackSymmetry";

export const UNIFIED_DERIVED_REVIEW_KIND = "UNIFIED" as const;

export type UnifiedDerivedReviewBag = {
  kind: typeof UNIFIED_DERIVED_REVIEW_KIND;
  status: "PENDING" | "APPROVED" | "DISMISSED";
  familyId: string;
  authoredTrack: FamilyTrack;
  /** Frozen Cue→Impact review — interactive source. */
  cueSession: CueImpactDerivedReviewSession;
  /** Frozen C3+ review when generation succeeded; null on skip/error. */
  c3PlusSession: C3PlusDerivedReviewSession | null;
  /** User-facing C3+ open outcome (skip vs error). */
  c3PlusFeedback: C3PlusReviewOpenFeedback | null;
};

export type CreateUnifiedDerivedReviewResult =
  | {
      ok: true;
      bag: UnifiedDerivedReviewBag;
      dataset: PositionRecord[];
    }
  | {
      ok: false;
      code: string;
      reason: string;
      dataset: PositionRecord[];
      cueResult?: CreateCueImpactDerivedReviewResult;
      c3PlusResult?: CreateC3PlusDerivedReviewResult | null;
    };

export type ApproveUnifiedDerivedReviewResult =
  | {
      ok: true;
      dataset: PositionRecord[];
      bag: UnifiedDerivedReviewBag;
    }
  | {
      ok: false;
      code: FamilyWriteFailureCode | "REVIEW_REQUIRED" | "SESSION_INACTIVE" | "CANDIDATE_SET_CHANGED" | "EMPTY_APPROVAL";
      reason: string;
      dataset: PositionRecord[];
      bag?: UnifiedDerivedReviewBag;
    };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * SAVE 직후: Cue create + C3+ create independently from AUTHOR/SYMMETRY sources.
 * Cue failure → fail closed (no C3+-only review — Case D deferred).
 * C3+ ALL NO_SB → Cue-only bag (normal).
 * C3+ INCONSISTENT → Cue-only bag + error feedback (no C3+ members).
 */
export function createUnifiedDerivedReview(args: {
  dataset: PositionRecord[];
  familyId: string;
  authoredPathNodes: ReadonlyArray<Point | null | undefined>;
  hitTolerance?: number;
}): CreateUnifiedDerivedReviewResult {
  const dataset = Array.isArray(args.dataset) ? args.dataset : [];
  const familyId = args.familyId.trim();
  if (!familyId) {
    return {
      ok: false,
      code: "NOT_FAMILY_AWARE",
      reason: "familyId required",
      dataset,
    };
  }

  const cueResult = createCueImpactDerivedReview({ dataset, familyId });
  if (!cueResult.ok) {
    return {
      ok: false,
      code: cueResult.code,
      reason: cueResult.reason,
      dataset,
      cueResult,
    };
  }

  let c3PlusSession: C3PlusDerivedReviewSession | null = null;
  let c3PlusFeedback: C3PlusReviewOpenFeedback | null = null;
  let c3PlusResult: CreateC3PlusDerivedReviewResult | null = null;

  const pathNodes = args.authoredPathNodes;
  if (!Array.isArray(pathNodes) || pathNodes.length === 0) {
    c3PlusFeedback = classifyC3PlusReviewOpen({ missingPathNodes: true });
  } else {
    c3PlusResult = createC3PlusDerivedReview({
      dataset,
      familyId,
      authoredPathNodes: pathNodes,
      hitTolerance: args.hitTolerance,
    });
    c3PlusFeedback = classifyC3PlusReviewOpen({ result: c3PlusResult });
    if (c3PlusResult.ok && !c3PlusResult.skipped) {
      c3PlusSession = c3PlusResult.session;
    }
  }

  const bag: UnifiedDerivedReviewBag = {
    kind: UNIFIED_DERIVED_REVIEW_KIND,
    status: "PENDING",
    familyId,
    authoredTrack: cueResult.session.authoredTrack,
    cueSession: cueResult.session,
    c3PlusSession,
    c3PlusFeedback,
  };

  return { ok: true, bag, dataset };
}

export function isUnifiedDerivedReviewBag(
  value: unknown
): value is UnifiedDerivedReviewBag {
  return (
    !!value &&
    typeof value === "object" &&
    (value as UnifiedDerivedReviewBag).kind === UNIFIED_DERIVED_REVIEW_KIND
  );
}

/** Display session shape for frozen source / track UI — Cue session. */
export function unifiedPrimarySession(
  bag: UnifiedDerivedReviewBag | null | undefined
): CueImpactDerivedReviewSession | null {
  if (!bag || bag.status !== "PENDING") return null;
  return bag.cueSession;
}

export function getUnifiedVisibleMembers(
  bag: UnifiedDerivedReviewBag | null | undefined,
  viewingTrack: FamilyTrack | null | undefined
): LogicalFamilyMemberCandidate[] {
  if (!bag || bag.status !== "PENDING" || !viewingTrack) return [];
  const cue = getVisibleReviewCandidates(bag.cueSession, viewingTrack);
  const c3 = bag.c3PlusSession
    ? getVisibleReviewCandidates(bag.c3PlusSession, viewingTrack)
    : [];
  return [...cue, ...c3];
}

/** Hit-test / Inspect — Cue→Impact only. */
export function getUnifiedInteractiveMembers(
  bag: UnifiedDerivedReviewBag | null | undefined,
  viewingTrack: FamilyTrack | null | undefined
): LogicalFamilyMemberCandidate[] {
  if (!bag || bag.status !== "PENDING" || !viewingTrack) return [];
  return getVisibleReviewCandidates(bag.cueSession, viewingTrack).filter(
    (m) => m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
  );
}

export function unifiedReviewPreviewMarkers(
  bag: UnifiedDerivedReviewBag | null | undefined,
  viewingTrack?: FamilyTrack | null
): CueImpactDerivedPreviewMarker[] {
  if (!bag || bag.status !== "PENDING") return [];
  const cue = cueImpactReviewPreviewMarkers(bag.cueSession, viewingTrack);
  const c3 = bag.c3PlusSession
    ? cueImpactReviewPreviewMarkers(bag.c3PlusSession, viewingTrack)
    : [];
  return [...cue, ...c3];
}

export function approveUnifiedDerivedReview(args: {
  dataset: PositionRecord[];
  bag: UnifiedDerivedReviewBag;
}): ApproveUnifiedDerivedReviewResult {
  const dataset = Array.isArray(args.dataset) ? args.dataset : [];
  const bag = args.bag;
  if (bag.status !== "PENDING" && bag.status !== "APPROVED") {
    return {
      ok: false,
      code: "SESSION_INACTIVE",
      reason: `unified review status ${bag.status} cannot be approved`,
      dataset,
      bag,
    };
  }
  if (bag.cueSession.policy !== CUE_IMPACT_DERIVED_APPROVAL_POLICY) {
    return {
      ok: false,
      code: "REVIEW_REQUIRED",
      reason: "AUTO_APPROVE is not implemented; REVIEW_REQUIRED only",
      dataset,
      bag,
    };
  }

  const cueFp = fingerprintCueImpactCandidateSet(bag.cueSession.members);
  if (cueFp !== bag.cueSession.reviewedFingerprint) {
    return {
      ok: false,
      code: "CANDIDATE_SET_CHANGED",
      reason: "Cue→Impact Candidate Set changed",
      dataset,
      bag,
    };
  }
  if (bag.c3PlusSession) {
    if (bag.c3PlusSession.kind !== C3_PLUS_DERIVED_REVIEW_KIND) {
      return {
        ok: false,
        code: "CANDIDATE_SET_CHANGED",
        reason: "C3+ session kind mismatch",
        dataset,
        bag,
      };
    }
    const c3Fp = fingerprintCueImpactCandidateSet(bag.c3PlusSession.members);
    if (c3Fp !== bag.c3PlusSession.reviewedFingerprint) {
      return {
        ok: false,
        code: "CANDIDATE_SET_CHANGED",
        reason: "C3+ Candidate Set changed",
        dataset,
        bag,
      };
    }
  }

  const members: LogicalFamilyMemberCandidate[] = [
    ...cloneJson(bag.cueSession.members),
    ...(bag.c3PlusSession ? cloneJson(bag.c3PlusSession.members) : []),
  ];
  if (members.length === 0) {
    return {
      ok: false,
      code: "EMPTY_APPROVAL",
      reason: "no derived members to approve",
      dataset,
      bag,
    };
  }

  const written = writeFamilyMembers(dataset, {
    familyId: bag.familyId,
    members,
  });
  if (!written.ok) {
    return {
      ok: false,
      code: written.code,
      reason: written.reason,
      dataset,
      bag,
    };
  }

  return {
    ok: true,
    dataset: written.dataset,
    bag: {
      ...bag,
      status: "APPROVED",
      cueSession: { ...bag.cueSession, status: "APPROVED" },
      c3PlusSession: bag.c3PlusSession
        ? { ...bag.c3PlusSession, status: "APPROVED" }
        : null,
    },
  };
}

export function notifyPayloadForUnifiedC3PlusFeedback(
  bag: UnifiedDerivedReviewBag
): C3PlusReviewOpenFeedback | null {
  const fb = bag.c3PlusFeedback;
  if (!fb || fb.kind === "opened") return null;
  return fb;
}

export { frozenReviewSourceForTrack, C3_PLUS_FOUR_TRACK_INCONSISTENT };
