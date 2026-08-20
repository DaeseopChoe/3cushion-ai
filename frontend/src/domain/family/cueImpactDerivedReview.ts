/**
 * Cue→Impact Derived review / approval boundary (Phase 3A-3E).
 *
 * Generate once → preview the same Candidate Set → approve the same set.
 * Approval must not call generateCueImpactDerivedMembers again.
 *
 * Persistence uses generic writeFamilyMembers (all-or-nothing).
 * Production SAVE still writes AUTHORED → 4-track only.
 *
 * AUTO_APPROVE is out of scope. Policy is REVIEW_REQUIRED only.
 */

import { calcImpactBall } from "../../data/system/calculator";
import type { Ball3, Point, PositionRecord, StrategyEntry, TargetBall } from "../positionSearchEngine";
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
import { FAMILY_TRACKS, parseFamilyTrack, type FamilyTrack } from "./trackSymmetry";
import {
  FAMILY_MASTER_MIGRATION_DEBT,
  TEMPORARY_COMPATIBILITY_DUPLICATION,
} from "./familyMigrationDebt";
import {
  CUE_IMPACT_DERIVED_RULE,
  CUE_IMPACT_MEMBER_ORIGIN,
  generateCueImpactDerivedMembersForTracks,
  resolvePhysicalTarget,
  sampleCueImpactPoint,
  type CueImpactExistingDerivedLineage,
  type CueImpactSourceMember,
  type GenerateCueImpactFailureCode,
} from "./generateCueImpactDerivedMembers";

/** Future AUTO_APPROVE is not implemented in this Phase. */
export const CUE_IMPACT_DERIVED_APPROVAL_POLICY = "REVIEW_REQUIRED" as const;
export type CueImpactDerivedApprovalPolicy =
  typeof CUE_IMPACT_DERIVED_APPROVAL_POLICY;

export type CueImpactDerivedReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "DISMISSED"
  | "FAILED";

/** Frozen AUTHORED/SYMMETRY source for one Track — Review display SSOT. */
export type CueImpactReviewFrozenSource = {
  track: FamilyTrack;
  memberId: string;
  balls: Ball3;
  entry: StrategyEntry;
  /** Thickness basis used by calcImpactBall for this track's derived candidates. */
  runtimeT: string;
  /** Physical target ball color — determines which Ball3 field is the impact target. */
  targetBall?: TargetBall;
};

export type CueImpactDerivedReviewSession = {
  policy: CueImpactDerivedApprovalPolicy;
  status: CueImpactDerivedReviewStatus;
  familyId: string;
  /** AUTHORED source FamilyTrack — immutable for the review lifetime. */
  authoredTrack: FamilyTrack;
  reviewedFingerprint: string;
  members: LogicalFamilyMemberCandidate[];
  /** Per-track frozen source snapshot from review creation dataset. */
  frozenSourcesByTrack: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>>;
};

export type DerivedCandidateIdentity = {
  memberId: string;
  derivedStep: string;
  track: string;
};

/** Preview marker hit radius — matches visible marker circle (BALL_RADIUS_RG ≈ 0.865). */
export const DERIVED_REVIEW_MARKER_HIT_RADIUS_RG = 61.5 / 35.55 / 2;

export type CueImpactDerivedPreviewMarker = {
  familyId: string;
  memberId: string;
  generatedFromMemberId?: string;
  track: string;
  derivedRule?: string;
  derivedStep?: string;
  tLabel: string;
  cue: { x: number; y: number };
  target: { x: number; y: number };
  second: { x: number; y: number };
};

export type CreateCueImpactDerivedReviewResult =
  | { ok: true; session: CueImpactDerivedReviewSession; dataset: PositionRecord[] }
  | {
      ok: false;
      code:
        | GenerateCueImpactFailureCode
        | "NO_TRACK_SOURCE"
        | "NO_AUTHORED_TRACK"
        | "NOT_FAMILY_AWARE";
      reason: string;
      dataset: PositionRecord[];
    };

export type ApproveCueImpactDerivedReviewResult =
  | {
      ok: true;
      dataset: PositionRecord[];
      session: CueImpactDerivedReviewSession;
    }
  | {
      ok: false;
      code: FamilyWriteFailureCode | "REVIEW_REQUIRED" | "SESSION_INACTIVE" | "CANDIDATE_SET_CHANGED";
      reason: string;
      dataset: PositionRecord[];
      session?: CueImpactDerivedReviewSession;
    };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function fingerprintCueImpactCandidateSet(
  members: LogicalFamilyMemberCandidate[]
): string {
  const rows = members.map((member) => ({
    familyId: member.familyId,
    memberId: member.memberId,
    memberOrigin: member.memberOrigin,
    generatedFromMemberId: member.generatedFromMemberId ?? "",
    track: member.track,
    derivedRule: member.derivedRule ?? "",
    derivedStep: member.derivedStep ?? "",
    cue: member.balls.cue,
    target: member.balls.target,
    second: member.balls.second,
  }));
  rows.sort((a, b) => {
    const ka = `${a.generatedFromMemberId}|${a.derivedStep}|${a.track}`;
    const kb = `${b.generatedFromMemberId}|${b.derivedStep}|${b.track}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return JSON.stringify(rows);
}

export function sameCueImpactCandidateSet(
  a: LogicalFamilyMemberCandidate[],
  b: LogicalFamilyMemberCandidate[]
): boolean {
  return fingerprintCueImpactCandidateSet(a) === fingerprintCueImpactCandidateSet(b);
}

export function parseCueImpactDerivedStepT(derivedStep: string | undefined): string {
  if (!derivedStep) return "";
  const match = /^cue_impact:t:(-?\d+\.\d+)$/.exec(derivedStep.trim());
  if (!match) return derivedStep;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return derivedStep;
  return n.toFixed(2);
}

export function resolveAuthoredTrackForReview(
  dataset: PositionRecord[],
  familyId: string
): FamilyTrack | null {
  const authored = findAuthoredFamilyEntry(dataset, familyId);
  if (!authored) return null;
  return parseFamilyTrack(authored.entry.track);
}

/** Marker anchor for preview / hit-test. Future C3+ will use balls.second. */
export function resolveDerivedPreviewBall(
  candidate: Pick<LogicalFamilyMemberCandidate, "derivedRule" | "balls">
): Point {
  if (candidate.derivedRule === CUE_IMPACT_DERIVED_RULE) {
    return candidate.balls.cue;
  }
  // Future C3_PLUS_2RG → candidate.balls.second
  return candidate.balls.cue;
}

export function getVisibleReviewCandidates(
  session: CueImpactDerivedReviewSession | null | undefined,
  viewingTrack: FamilyTrack | null | undefined
): LogicalFamilyMemberCandidate[] {
  if (!session || session.status !== "PENDING") return [];
  if (!viewingTrack) return [];
  return session.members.filter((member) => member.track === viewingTrack);
}

export function findFrozenCandidateByIdentity(
  session: CueImpactDerivedReviewSession,
  identity: DerivedCandidateIdentity
): LogicalFamilyMemberCandidate | null {
  return (
    session.members.find(
      (member) =>
        member.memberId === identity.memberId &&
        member.derivedStep === identity.derivedStep &&
        member.track === identity.track
    ) ?? null
  );
}

export function hitTestDerivedReviewMarker(args: {
  pointerRg: Point;
  candidates: LogicalFamilyMemberCandidate[];
  hitRadiusRg?: number;
}): LogicalFamilyMemberCandidate | null {
  const radius = args.hitRadiusRg ?? DERIVED_REVIEW_MARKER_HIT_RADIUS_RG;
  let best: LogicalFamilyMemberCandidate | null = null;
  let minDist = Infinity;
  for (const candidate of args.candidates) {
    const anchor = resolveDerivedPreviewBall(candidate);
    const dist = Math.hypot(args.pointerRg.x - anchor.x, args.pointerRg.y - anchor.y);
    if (dist <= radius && dist < minDist) {
      minDist = dist;
      best = candidate;
    }
  }
  return best;
}

function buildFrozenSourcesByTrack(
  sources: CueImpactSourceMember[]
): Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> {
  const out: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> = {};
  for (const source of sources) {
    const track = parseFamilyTrack(source.entry.track);
    const memberId = source.entry.memberId?.trim();
    if (!track || !memberId) continue;
    out[track] = {
      track,
      memberId,
      balls: cloneJson(source.balls),
      entry: cloneJson(source.entry),
      runtimeT: hydrateFamilyMemberRuntimeThickness(source.entry) ?? "8/8",
      ...(source.targetBall === "yellow" || source.targetBall === "red"
        ? { targetBall: source.targetBall }
        : {}),
    };
  }
  return out;
}

export function frozenReviewSourceForTrack(
  session: CueImpactDerivedReviewSession | null | undefined,
  track: FamilyTrack
): CueImpactReviewFrozenSource | null {
  if (!session) return null;
  return session.frozenSourcesByTrack[track] ?? null;
}

export function resolveReviewDisplayedSourceMemberId(
  session: CueImpactDerivedReviewSession | null | undefined,
  track: FamilyTrack
): string | null {
  return frozenReviewSourceForTrack(session, track)?.memberId ?? null;
}

export function reviewCandidatesCollinearWithFrozenSource(
  session: CueImpactDerivedReviewSession,
  track: FamilyTrack,
  tolerance = 1e-9
): boolean {
  const frozen = frozenReviewSourceForTrack(session, track);
  if (!frozen) return false;
  const physicalTarget = resolvePhysicalTarget(frozen.balls, frozen.targetBall);
  const impact = calcImpactBall(frozen.balls.cue, physicalTarget, frozen.runtimeT);
  if (!impact) return false;
  const candidates = session.members.filter((member) => member.track === track);
  if (candidates.length === 0) return false;
  for (const candidate of candidates) {
    if (candidate.generatedFromMemberId !== frozen.memberId) return false;
    const cross =
      (impact.x - frozen.balls.cue.x) * (candidate.balls.cue.y - frozen.balls.cue.y) -
      (impact.y - frozen.balls.cue.y) * (candidate.balls.cue.x - frozen.balls.cue.x);
    if (Math.abs(cross) > tolerance) return false;
  }
  return true;
}

export function reviewImpactMatchesFrozenSource(
  session: CueImpactDerivedReviewSession,
  track: FamilyTrack
): boolean {
  const frozen = frozenReviewSourceForTrack(session, track);
  if (!frozen) return false;
  const physicalTarget = resolvePhysicalTarget(frozen.balls, frozen.targetBall);
  const impact = calcImpactBall(frozen.balls.cue, physicalTarget, frozen.runtimeT);
  if (!impact) return false;
  const candidates = session.members.filter((member) => member.track === track);
  if (candidates.length === 0) return false;
  for (const candidate of candidates) {
    const tMatch = /^cue_impact:t:(-?\d+\.\d+)$/.exec(candidate.derivedStep ?? "");
    if (!tMatch) continue;
    const t = Number(tMatch[1]);
    if (!Number.isFinite(t) || t <= 0 || t > 0.3 + 1e-9) continue;
    const expected = sampleCueImpactPoint(frozen.balls.cue, impact, t);
    if (
      Math.abs(expected.x - candidate.balls.cue.x) > 1e-6 ||
      Math.abs(expected.y - candidate.balls.cue.y) > 1e-6
    ) {
      return false;
    }
  }
  return true;
}

/** Ambient dataset lookup — not Review display SSOT after session creation. */
export function familySourceMemberForTrack(
  dataset: PositionRecord[],
  familyId: string,
  track: FamilyTrack
): { entry: StrategyEntry; balls: Ball3 } | null {
  for (const loc of reconstructFamilyMembers(dataset, familyId)) {
    const origin = parseMemberOrigin(loc.entry.memberOrigin);
    if (isDerivedMemberOrigin(origin)) continue;
    if (origin && origin !== "AUTHORED" && origin !== "SYMMETRY") continue;
    if (loc.entry.track !== track) continue;
    return { entry: loc.entry, balls: loc.balls };
  }
  return null;
}

export function cueImpactReviewPreviewMarkers(
  session: CueImpactDerivedReviewSession | null | undefined,
  viewingTrack?: FamilyTrack | null
): CueImpactDerivedPreviewMarker[] {
  if (!session || session.status !== "PENDING") {
    return [];
  }
  const members =
    viewingTrack != null
      ? getVisibleReviewCandidates(session, viewingTrack)
      : session.members;
  return members.map((member) => ({
    familyId: member.familyId,
    memberId: member.memberId,
    generatedFromMemberId: member.generatedFromMemberId,
    track: member.track,
    derivedRule: member.derivedRule,
    derivedStep: member.derivedStep,
    tLabel: parseCueImpactDerivedStepT(member.derivedStep),
    cue: { ...member.balls.cue },
    target: { ...member.balls.target },
    second: { ...member.balls.second },
  }));
}

function trackBaseSources(
  dataset: PositionRecord[],
  familyId: string
): CueImpactSourceMember[] {
  const sources: CueImpactSourceMember[] = [];
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

function existingDerivedLineage(
  dataset: PositionRecord[],
  familyId: string
): CueImpactExistingDerivedLineage[] {
  const out: CueImpactExistingDerivedLineage[] = [];
  for (const loc of reconstructFamilyMembers(dataset, familyId)) {
    if (loc.entry.memberOrigin !== CUE_IMPACT_MEMBER_ORIGIN) continue;
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

/**
 * Generate a frozen review session. Does not mutate dataset.
 */
export function createCueImpactDerivedReview(args: {
  dataset: PositionRecord[];
  familyId: string;
}): CreateCueImpactDerivedReviewResult {
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
      reason: "no AUTHORED/SYMMETRY Track source members for review",
      dataset,
    };
  }

  const generated = generateCueImpactDerivedMembersForTracks(sources, {
    existingMembers: existingDerivedLineage(dataset, familyId),
  });
  if (!generated.ok) {
    return { ok: false, code: generated.code, reason: generated.reason, dataset };
  }

  const authoredTrack = resolveAuthoredTrackForReview(dataset, familyId);
  if (!authoredTrack) {
    return {
      ok: false,
      code: "NO_AUTHORED_TRACK",
      reason: "AUTHORED FamilyTrack required to start review (no B2T_L fallback)",
      dataset,
    };
  }

  const members = cloneJson(generated.members);
  const frozenSourcesByTrack = buildFrozenSourcesByTrack(sources);
  const session: CueImpactDerivedReviewSession = {
    policy: CUE_IMPACT_DERIVED_APPROVAL_POLICY,
    status: "PENDING",
    familyId,
    authoredTrack,
    members,
    reviewedFingerprint: fingerprintCueImpactCandidateSet(members),
    frozenSourcesByTrack,
  };
  return { ok: true, session, dataset };
}

export { FAMILY_TRACKS };

export function dismissCueImpactDerivedReview(
  session: CueImpactDerivedReviewSession
): CueImpactDerivedReviewSession {
  return { ...session, status: "DISMISSED" };
}

/**
 * Persist the frozen Candidate Set. Must not regenerate.
 */
export function approveCueImpactDerivedReview(args: {
  dataset: PositionRecord[];
  session: CueImpactDerivedReviewSession;
}): ApproveCueImpactDerivedReviewResult {
  const dataset = Array.isArray(args.dataset) ? args.dataset : [];
  const session = args.session;
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

export function persistedCueImpactDerivedCount(
  dataset: PositionRecord[],
  familyId: string
): number {
  return reconstructFamilyMembers(dataset, familyId).filter(
    (loc) =>
      loc.entry.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN &&
      loc.entry.derivedRule === CUE_IMPACT_DERIVED_RULE
  ).length;
}
