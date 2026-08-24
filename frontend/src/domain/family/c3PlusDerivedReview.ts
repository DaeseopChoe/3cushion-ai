/**
 * C3+ Scoring Derived review / approval boundary (Phase 3A-359H).
 *
 * Separate from Cue→Impact create/generate. Reuses the same frozen-session
 * shape + writeFamilyMembers / REVIEW_REQUIRED approve path.
 *
 * Flow: prepare 4-track sources → atomic consistency → generate all or none.
 */

import type { Ball3, Point, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import {
  reconstructFamilyMembers,
  writeFamilyMembers,
  type FamilyWriteFailureCode,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import { isDerivedMemberOrigin, parseMemberOrigin } from "./familyIdentity";
import {
  findAuthoredFamilyEntry,
  hydrateFamilyMemberRuntimeThickness,
} from "./familyRuntimeProjection";
import {
  FAMILY_TRACKS,
  parseFamilyTrack,
  symmetryOpBetweenTracks,
  transformPathNodes,
  type FamilyTrack,
} from "./trackSymmetry";
import {
  FAMILY_MASTER_MIGRATION_DEBT,
  TEMPORARY_COMPATIBILITY_DUPLICATION,
} from "./familyMigrationDebt";
import {
  C3_PLUS_DERIVED_RULE,
  C3_PLUS_MEMBER_ORIGIN,
  generateC3PlusScoringDerivedMembers,
  type C3PlusExistingDerivedLineage,
  type C3PlusSourceMember,
  type GenerateC3PlusFailureCode,
} from "./generateC3PlusScoringDerivedMembers";
import { parseC3PlusDerivedStepLabel } from "./sampleC3PlusScoringLine";
import {
  C3_PLUS_FOUR_TRACK_INCONSISTENT,
  validateC3PlusFourTrackConsistency,
  type C3PlusPreparedTrackSource,
  type C3PlusTrackScoringFingerprint,
} from "./c3PlusFourTrackConsistency";
import {
  CUE_IMPACT_DERIVED_APPROVAL_POLICY,
  fingerprintCueImpactCandidateSet,
  type CueImpactDerivedReviewSession,
  type CueImpactReviewFrozenSource,
} from "./cueImpactDerivedReview";

export { parseC3PlusDerivedStepLabel };

export const C3_PLUS_DERIVED_REVIEW_KIND = "C3_PLUS" as const;
export const CUE_IMPACT_DERIVED_REVIEW_KIND = "CUE_IMPACT" as const;

export type DerivedReviewKind =
  | typeof C3_PLUS_DERIVED_REVIEW_KIND
  | typeof CUE_IMPACT_DERIVED_REVIEW_KIND;

/** Session shape shared with Cue→Impact approve path; `kind` distinguishes HUD. */
export type C3PlusDerivedReviewSession = CueImpactDerivedReviewSession & {
  kind: typeof C3_PLUS_DERIVED_REVIEW_KIND;
};

export type CreateC3PlusDerivedReviewResult =
  | {
      ok: true;
      skipped: true;
      reason: string;
      fingerprints: C3PlusTrackScoringFingerprint[];
      dataset: PositionRecord[];
    }
  | {
      ok: true;
      skipped?: false;
      session: C3PlusDerivedReviewSession;
      dataset: PositionRecord[];
      fingerprints: C3PlusTrackScoringFingerprint[];
    }
  | {
      ok: false;
      code:
        | GenerateC3PlusFailureCode
        | typeof C3_PLUS_FOUR_TRACK_INCONSISTENT
        | "NO_TRACK_SOURCE"
        | "NO_AUTHORED_TRACK"
        | "NOT_FAMILY_AWARE"
        | "MISSING_PATH_NODES"
        | "PATH_TRANSFORM_FAILED";
      reason: string;
      dataset: PositionRecord[];
      fingerprints?: C3PlusTrackScoringFingerprint[];
    };

export type ApproveC3PlusDerivedReviewResult =
  | {
      ok: true;
      dataset: PositionRecord[];
      session: C3PlusDerivedReviewSession;
    }
  | {
      ok: false;
      code: FamilyWriteFailureCode | "REVIEW_REQUIRED" | "SESSION_INACTIVE" | "CANDIDATE_SET_CHANGED" | "WRONG_KIND";
      reason: string;
      dataset: PositionRecord[];
      session?: C3PlusDerivedReviewSession;
    };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneExtensions(
  payload: StrategyEntry["trajectoryExtensions"]
): TrajectoryExtensionPayload | null {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return null;
  }
  return cloneJson(payload) as TrajectoryExtensionPayload;
}

function trackBaseSources(
  dataset: PositionRecord[],
  familyId: string
): C3PlusSourceMember[] {
  const sources: C3PlusSourceMember[] = [];
  for (const loc of reconstructFamilyMembers(dataset, familyId)) {
    const origin = parseMemberOrigin(loc.entry.memberOrigin);
    if (isDerivedMemberOrigin(origin)) continue;
    if (origin && origin !== "AUTHORED" && origin !== "SYMMETRY") continue;
    const record = dataset[loc.recordIndex];
    sources.push({
      balls: loc.balls,
      ...(record?.targetBall === "yellow" || record?.targetBall === "red"
        ? { targetBall: record.targetBall }
        : {}),
      entry: loc.entry,
    });
  }
  return sources;
}

function existingC3PlusLineage(
  dataset: PositionRecord[],
  familyId: string
): C3PlusExistingDerivedLineage[] {
  const out: C3PlusExistingDerivedLineage[] = [];
  for (const loc of reconstructFamilyMembers(dataset, familyId)) {
    if (loc.entry.memberOrigin !== C3_PLUS_MEMBER_ORIGIN) continue;
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

function resolveAuthoredTrack(
  dataset: PositionRecord[],
  familyId: string
): FamilyTrack | null {
  const authored = findAuthoredFamilyEntry(dataset, familyId);
  if (!authored) return null;
  return parseFamilyTrack(authored.entry.track);
}

function buildFrozenSourcesByTrack(
  sources: C3PlusSourceMember[]
): Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> {
  const out: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> = {};
  for (const source of sources) {
    const track = parseFamilyTrack(source.entry.track);
    if (!track || !source.entry.memberId) continue;
    const runtimeT = hydrateFamilyMemberRuntimeThickness(source.entry) ?? "8/8";
    out[track] = {
      track,
      memberId: source.entry.memberId,
      balls: cloneJson(source.balls) as Ball3,
      entry: cloneJson(source.entry),
      runtimeT,
      ...(source.targetBall === "yellow" || source.targetBall === "red"
        ? { targetBall: source.targetBall }
        : {}),
    };
  }
  return out;
}

/**
 * Prepare pathNodes + extensions for each Family track.
 * PathNodes for non-authored tracks are symmetry-transforms of authoredPathNodes.
 * Extensions come from each source entry (four-track SAVE must already mirror them).
 */
export function prepareC3PlusFourTrackSources(args: {
  sources: C3PlusSourceMember[];
  authoredTrack: FamilyTrack;
  authoredPathNodes: ReadonlyArray<Point | null | undefined>;
}):
  | { ok: true; prepared: C3PlusPreparedTrackSource[] }
  | { ok: false; code: "MISSING_PATH_NODES" | "PATH_TRANSFORM_FAILED" | "NO_TRACK_SOURCE"; reason: string } {
  const { sources, authoredTrack, authoredPathNodes } = args;
  if (!Array.isArray(authoredPathNodes) || authoredPathNodes.length === 0) {
    return {
      ok: false,
      code: "MISSING_PATH_NODES",
      reason: "authored corrected pathNodes required for C3+ review",
    };
  }

  const prepared: C3PlusPreparedTrackSource[] = [];
  for (const source of sources) {
    const track = parseFamilyTrack(source.entry.track);
    if (!track) {
      return {
        ok: false,
        code: "NO_TRACK_SOURCE",
        reason: `source member ${source.entry.memberId ?? "?"} lacks FamilyTrack`,
      };
    }
    let pathNodes: Array<Point | null>;
    if (track === authoredTrack) {
      pathNodes = authoredPathNodes.map((p) =>
        p == null ? null : { x: p.x, y: p.y }
      );
    } else {
      const op = symmetryOpBetweenTracks(authoredTrack, track);
      if (!op) {
        return {
          ok: false,
          code: "PATH_TRANSFORM_FAILED",
          reason: `no symmetry op from ${authoredTrack} to ${track}`,
        };
      }
      pathNodes = transformPathNodes(op, authoredPathNodes);
    }
    prepared.push({
      ...source,
      track,
      pathNodes,
      extensions: cloneExtensions(source.entry.trajectoryExtensions),
    });
  }
  return { ok: true, prepared };
}

/**
 * Generate a frozen C3+ review session. Does not mutate dataset.
 * Atomic: consistency fail → no members; all NO_SB → skipped (no session).
 */
export function createC3PlusDerivedReview(args: {
  dataset: PositionRecord[];
  familyId: string;
  authoredPathNodes: ReadonlyArray<Point | null | undefined>;
  hitTolerance?: number;
}): CreateC3PlusDerivedReviewResult {
  void FAMILY_MASTER_MIGRATION_DEBT;
  void TEMPORARY_COMPATIBILITY_DUPLICATION;

  const dataset = Array.isArray(args.dataset) ? args.dataset : [];
  const familyId = args.familyId.trim();
  if (!familyId) {
    return { ok: false, code: "NOT_FAMILY_AWARE", reason: "familyId required", dataset };
  }

  const sources = trackBaseSources(dataset, familyId);
  if (sources.length === 0) {
    return {
      ok: false,
      code: "NO_TRACK_SOURCE",
      reason: "no AUTHORED/SYMMETRY Track source members for C3+ review",
      dataset,
    };
  }

  const authoredTrack = resolveAuthoredTrack(dataset, familyId);
  if (!authoredTrack) {
    return {
      ok: false,
      code: "NO_AUTHORED_TRACK",
      reason: "AUTHORED FamilyTrack required to start C3+ review",
      dataset,
    };
  }

  const preparedResult = prepareC3PlusFourTrackSources({
    sources,
    authoredTrack,
    authoredPathNodes: args.authoredPathNodes,
  });
  if (!preparedResult.ok) {
    return {
      ok: false,
      code: preparedResult.code,
      reason: preparedResult.reason,
      dataset,
    };
  }

  const consistency = validateC3PlusFourTrackConsistency(preparedResult.prepared, {
    hitTolerance: args.hitTolerance,
  });
  if (!consistency.ok) {
    return {
      ok: false,
      code: consistency.code,
      reason: consistency.reason,
      dataset,
      fingerprints: consistency.fingerprints,
    };
  }

  if (consistency.kind === "SKIP_ALL_NO_SB") {
    return {
      ok: true,
      skipped: true,
      reason: "all four tracks miss Second Ball on C3+ candidate path",
      fingerprints: consistency.fingerprints,
      dataset,
    };
  }

  const existing = existingC3PlusLineage(dataset, familyId);
  const members: LogicalFamilyMemberCandidate[] = [];
  for (const source of preparedResult.prepared) {
    const existingForSource = existing.filter(
      (row) =>
        !row.generatedFromMemberId ||
        row.generatedFromMemberId === (source.entry.memberId ?? "")
    );
    const generated = generateC3PlusScoringDerivedMembers({
      sourceMember: source,
      pathNodes: source.pathNodes,
      extensions: source.extensions,
      hitTolerance: args.hitTolerance,
      existingMembers: existingForSource,
    });
    if (!generated.ok) {
      // Should not happen after GENERATE consistency — fail closed, no partial set.
      return {
        ok: false,
        code: generated.code,
        reason: `C3+ generate failed on ${source.track}: ${generated.reason}`,
        dataset,
        fingerprints: consistency.fingerprints,
      };
    }
    members.push(...generated.members);
  }

  if (members.length === 0) {
    return {
      ok: false,
      code: C3_PLUS_FOUR_TRACK_INCONSISTENT,
      reason: "consistency passed but no C3+ members were generated",
      dataset,
      fingerprints: consistency.fingerprints,
    };
  }

  const frozenSourcesByTrack = buildFrozenSourcesByTrack(sources);
  const session: C3PlusDerivedReviewSession = {
    kind: C3_PLUS_DERIVED_REVIEW_KIND,
    policy: CUE_IMPACT_DERIVED_APPROVAL_POLICY,
    status: "PENDING",
    familyId,
    authoredTrack,
    members: cloneJson(members),
    reviewedFingerprint: fingerprintCueImpactCandidateSet(members),
    frozenSourcesByTrack,
  };

  return {
    ok: true,
    session,
    dataset,
    fingerprints: consistency.fingerprints,
  };
}

/**
 * Persist the frozen C3+ Candidate Set. Must not regenerate.
 */
export function approveC3PlusDerivedReview(args: {
  dataset: PositionRecord[];
  session: C3PlusDerivedReviewSession;
}): ApproveC3PlusDerivedReviewResult {
  const dataset = Array.isArray(args.dataset) ? args.dataset : [];
  const session = args.session;
  if (session.kind !== C3_PLUS_DERIVED_REVIEW_KIND) {
    return {
      ok: false,
      code: "WRONG_KIND",
      reason: "session is not a C3+ derived review",
      dataset,
      session,
    };
  }
  if (session.policy !== CUE_IMPACT_DERIVED_APPROVAL_POLICY) {
    return {
      ok: false,
      code: "REVIEW_REQUIRED",
      reason: "AUTO_APPROVE is not implemented; REVIEW_REQUIRED only",
      dataset,
      session,
    };
  }
  if (session.status !== "PENDING" && session.status !== "APPROVED") {
    return {
      ok: false,
      code: "SESSION_INACTIVE",
      reason: `session status ${session.status} cannot be approved`,
      dataset,
      session,
    };
  }
  const currentFingerprint = fingerprintCueImpactCandidateSet(session.members);
  if (currentFingerprint !== session.reviewedFingerprint) {
    return {
      ok: false,
      code: "CANDIDATE_SET_CHANGED",
      reason: "approval refused because the reviewed Candidate Set changed",
      dataset,
      session,
    };
  }

  const frozen = cloneJson(session.members);
  const written = writeFamilyMembers(dataset, {
    familyId: session.familyId,
    members: frozen,
  });
  if (!written.ok) {
    return {
      ok: false,
      code: written.code,
      reason: written.reason,
      dataset,
      session,
    };
  }
  return {
    ok: true,
    dataset: written.dataset,
    session: { ...session, status: "APPROVED", members: frozen },
  };
}

export function isC3PlusDerivedReviewSession(
  session: CueImpactDerivedReviewSession | C3PlusDerivedReviewSession | null | undefined
): session is C3PlusDerivedReviewSession {
  return (
    !!session &&
    (session as C3PlusDerivedReviewSession).kind === C3_PLUS_DERIVED_REVIEW_KIND
  );
}

/** User-facing open result for App toast/alert — NO_SB ≠ consistency error. */
export type C3PlusReviewOpenFeedback =
  | { kind: "opened" }
  | { kind: "skip_no_sb"; message: string }
  | { kind: "error"; code: string; message: string };

/**
 * Classify createC3PlusDerivedReview / pathNodes outcomes for Admin feedback.
 * Does not mutate dataset. Safe for unit tests without App.
 */
export function classifyC3PlusReviewOpen(args: {
  missingPathNodes?: boolean;
  result?: CreateC3PlusDerivedReviewResult | null;
}): C3PlusReviewOpenFeedback {
  if (args.missingPathNodes) {
    return {
      kind: "error",
      code: "MISSING_PATH_NODES",
      message:
        "C3+ Scoring Review를 시작할 수 없습니다: 궤적 pathNodes를 확보하지 못했습니다.",
    };
  }
  const result = args.result;
  if (!result) {
    return {
      kind: "error",
      code: "UNKNOWN",
      message: "C3+ Scoring Review를 시작할 수 없습니다.",
    };
  }
  if (result.ok && result.skipped) {
    return {
      kind: "skip_no_sb",
      message:
        "C3+ 파생 후보 없음: 4-track 모두 Second Ball이 득점 경로에 없습니다 (정상 skip).",
    };
  }
  if (result.ok) {
    return { kind: "opened" };
  }
  if (result.code === C3_PLUS_FOUR_TRACK_INCONSISTENT) {
    return {
      kind: "error",
      code: result.code,
      message: `C3+ Scoring Review를 시작할 수 없습니다 (4-track 일관성 오류):\n${result.reason}`,
    };
  }
  return {
    kind: "error",
    code: result.code,
    message: `C3+ Scoring Review를 시작할 수 없습니다 (${result.code}):\n${result.reason}`,
  };
}
