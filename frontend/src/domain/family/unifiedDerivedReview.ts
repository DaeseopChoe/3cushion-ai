/**
 * Unified Derived Review orchestration (Phase 3A-359L + 3A-360 Product).
 *
 * Generators stay separate. Review UI = Cue ∪ C3+ markers.
 * Durable Approve writes Track × Cue × C3+ Product members only.
 */

import type { Point, PositionRecord } from "../positionSearchEngine";
import {
  reconstructFamilyMembers,
  writeFamilyMembers,
  type FamilyWriteFailureCode,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import {
  buildCueC3ProductMembers,
  fingerprintCueC3ProductMembers,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
  type CueC3ProductCardinality,
} from "./buildCueC3ProductMembers";
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
  /**
   * Durable Cartesian Product candidates (Phase 3A-360).
   * Empty when C3+ skipped / inconsistent / product build failed.
   */
  productMembers: LogicalFamilyMemberCandidate[];
  productFingerprint: string;
  productCardinality: CueC3ProductCardinality | null;
  productBuildError: { code: string; reason: string } | null;
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
      code:
        | FamilyWriteFailureCode
        | "REVIEW_REQUIRED"
        | "SESSION_INACTIVE"
        | "CANDIDATE_SET_CHANGED"
        | "EMPTY_APPROVAL"
        | "PRODUCT_BUILD_FAILED"
        | "PRODUCT_SET_CHANGED";
      reason: string;
      dataset: PositionRecord[];
      bag?: UnifiedDerivedReviewBag;
    };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function existingProductLineage(
  dataset: PositionRecord[],
  familyId: string
): Array<{
  derivedStep: string;
  memberId: string;
  authoringStrategyId?: string;
  generatedFromMemberId?: string;
}> {
  const out: Array<{
    derivedStep: string;
    memberId: string;
    authoringStrategyId?: string;
    generatedFromMemberId?: string;
  }> = [];
  for (const loc of reconstructFamilyMembers(dataset, familyId)) {
    if (loc.entry.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN) continue;
    if (!loc.entry.derivedStep || !loc.entry.memberId) continue;
    out.push({
      derivedStep: loc.entry.derivedStep,
      memberId: loc.entry.memberId,
      ...(loc.entry.authoringStrategyId
        ? { authoringStrategyId: loc.entry.authoringStrategyId }
        : {}),
      ...(loc.entry.generatedFromMemberId
        ? { generatedFromMemberId: loc.entry.generatedFromMemberId }
        : {}),
    });
  }
  return out;
}

function buildProductState(args: {
  dataset: PositionRecord[];
  familyId: string;
  cueSession: CueImpactDerivedReviewSession;
  c3PlusSession: C3PlusDerivedReviewSession | null;
}): Pick<
  UnifiedDerivedReviewBag,
  "productMembers" | "productFingerprint" | "productCardinality" | "productBuildError"
> {
  if (!args.c3PlusSession) {
    return {
      productMembers: [],
      productFingerprint: "",
      productCardinality: null,
      productBuildError: null,
    };
  }

  const built = buildCueC3ProductMembers({
    familyId: args.familyId,
    cueMembers: args.cueSession.members,
    c3PlusMembers: args.c3PlusSession.members,
    frozenSourcesByTrack: args.cueSession.frozenSourcesByTrack,
    existingMembers: existingProductLineage(args.dataset, args.familyId),
  });

  if (!built.ok) {
    return {
      productMembers: [],
      productFingerprint: "",
      productCardinality: built.cardinality ?? null,
      productBuildError: { code: built.code, reason: built.reason },
    };
  }

  const members = cloneJson(built.members);
  return {
    productMembers: members,
    productFingerprint: fingerprintCueC3ProductMembers(members),
    productCardinality: built.cardinality,
    productBuildError: null,
  };
}

/**
 * SAVE 직후: Cue create + C3+ create independently from AUTHOR/SYMMETRY sources.
 * Then freeze Track×Cue×C3+ Product candidates for Approve (durable Product-only).
 * Cue failure → fail closed (no C3+-only review — Case D deferred).
 * C3+ ALL NO_SB → Cue-only bag (normal); Product empty.
 * C3+ INCONSISTENT → Cue-only bag + error feedback; Product empty.
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

  const productState = buildProductState({
    dataset,
    familyId,
    cueSession: cueResult.session,
    c3PlusSession,
  });

  const bag: UnifiedDerivedReviewBag = {
    kind: UNIFIED_DERIVED_REVIEW_KIND,
    status: "PENDING",
    familyId,
    authoredTrack: cueResult.session.authoredTrack,
    cueSession: cueResult.session,
    c3PlusSession,
    c3PlusFeedback,
    ...productState,
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

/**
 * Persist frozen Product Candidate Set only (not Cue∪C3 Review union).
 * ALL NO_SB / no Product: Approve succeeds with dataset unchanged.
 */
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

  if (bag.productBuildError) {
    return {
      ok: false,
      code: "PRODUCT_BUILD_FAILED",
      reason: bag.productBuildError.reason,
      dataset,
      bag,
    };
  }

  const productFp = fingerprintCueC3ProductMembers(bag.productMembers);
  if (productFp !== bag.productFingerprint) {
    return {
      ok: false,
      code: "PRODUCT_SET_CHANGED",
      reason: "Product Candidate Set changed",
      dataset,
      bag,
    };
  }

  // ALL NO_SB / C3+ skip: no Product to persist — Approve closes Review only.
  if (!bag.c3PlusSession || bag.productMembers.length === 0) {
    if (bag.c3PlusSession && bag.productMembers.length === 0) {
      return {
        ok: false,
        code: "EMPTY_APPROVAL",
        reason: "C3+ Review present but Product Candidate Set is empty",
        dataset,
        bag,
      };
    }
    return {
      ok: true,
      dataset,
      bag: {
        ...bag,
        status: "APPROVED",
        cueSession: { ...bag.cueSession, status: "APPROVED" },
        c3PlusSession: null,
      },
    };
  }

  if (
    bag.productCardinality &&
    bag.productMembers.length !== bag.productCardinality.expected
  ) {
    return {
      ok: false,
      code: "PRODUCT_BUILD_FAILED",
      reason: `Product cardinality mismatch: expected ${bag.productCardinality.expected}, got ${bag.productMembers.length}`,
      dataset,
      bag,
    };
  }

  const members = cloneJson(bag.productMembers);
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

export {
  frozenReviewSourceForTrack,
  C3_PLUS_FOUR_TRACK_INCONSISTENT,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
};
