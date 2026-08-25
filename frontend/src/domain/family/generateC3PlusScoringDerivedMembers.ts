/**
 * generateC3PlusScoringDerivedMembers.ts
 * Phase 3A-359F — C3+ scoring-line Hybrid derived Family members.
 *
 * Does not mutate PositionRecord / SAVE. Does not use Display Cap.
 * Does not apply Cue→Impact VALID_FRACTION.
 * SB closest-point is not a mandatory sample.
 */

import { mintAuthoringStrategyId } from "../authoringStrategyId";
import { createPositionId } from "../positionId";
import type {
  Ball3,
  Point,
  StrategyEntry,
  TargetBall,
} from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";
import {
  extractTemporaryCompatibilityPayload,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import { sourceRefFromIdentityFields, validateDerivedSourceMember } from "./familyDerivedSource";
import {
  isDerivedMemberOrigin,
  mintMemberId,
  readPersistedFamilyIdentity,
  validateFamilyProvenance,
} from "./familyIdentity";
import {
  FAMILY_MASTER_MIGRATION_DEBT,
  TEMPORARY_COMPATIBILITY_DUPLICATION,
} from "./familyMigrationDebt";
import {
  cloneBall3,
  isValidBallCenter,
  pointsEqual,
  validateBall3Centers,
  FAMILY_BALL_CENTER_MIN,
  FAMILY_BALL_CENTER_MAX_X,
  FAMILY_BALL_CENTER_MAX_Y,
} from "./trackSymmetry";
import { resolveC3PlusScoringLine, type C3PlusPoint } from "./c3PlusScoringPath";
import { sampleC3PlusScoringLine } from "./sampleC3PlusScoringLine";

export const C3_PLUS_MEMBER_ORIGIN = "DERIVED_C3_PLUS" as const;
/** Scoring-line hybrid rule — not the withdrawn 2Rg placeholder. */
export const C3_PLUS_DERIVED_RULE = "C3_PLUS_SCORING_LINE_v1" as const;

export type C3PlusSourceMember = {
  balls: Ball3;
  targetBall?: TargetBall;
  entry: StrategyEntry;
};

export type C3PlusExistingDerivedLineage = {
  derivedStep: string;
  memberId: string;
  authoringStrategyId?: string;
  generatedFromMemberId?: string;
};

export type GenerateC3PlusArgs = {
  sourceMember: C3PlusSourceMember;
  /** Corrected buildTrajectory pathNodes (CO…C6). */
  pathNodes: ReadonlyArray<Point | null | undefined>;
  /** Optional; defaults to entry.trajectoryExtensions. */
  extensions?: TrajectoryExtensionPayload | null;
  /** Production HIT_TOLERANCE; defaults to shared resolveTrajectoryHitTolerance(). */
  hitTolerance?: number;
  existingMembers?: C3PlusExistingDerivedLineage[];
};

export type GenerateC3PlusFailureCode =
  | "NOT_FAMILY_AWARE"
  | "INVALID_SOURCE"
  | "INVALID_BALLS"
  | "PATH_FAILED"
  | "NO_SB_HIT"
  | "SAMPLE_FAILED"
  | "DUPLICATE_SAMPLE"
  | "OUT_OF_BOUNDS";

export type GenerateC3PlusResult =
  | {
      ok: true;
      members: LogicalFamilyMemberCandidate[];
      scoringLineIds: string[];
      hitSegment: { fromId: string; toId: string };
    }
  | { ok: false; code: GenerateC3PlusFailureCode; reason: string };

const POINT_EPS = 1e-9;

function isFinitePoint(point: Point | null | undefined): point is Point {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

function pointsNearlyEqual(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= POINT_EPS;
}

function lineageMap(
  existing: C3PlusExistingDerivedLineage[] | undefined
): Map<string, C3PlusExistingDerivedLineage> {
  const map = new Map<string, C3PlusExistingDerivedLineage>();
  for (const row of existing ?? []) {
    if (!map.has(row.derivedStep)) map.set(row.derivedStep, row);
  }
  return map;
}

/**
 * Physical Second Ball center — Phase 6 Role-native.
 * Always balls.second. targetBall is metadata only (ignored for field selection).
 */
export function resolveC3PlusSecondBall(
  balls: Ball3,
  _targetBall?: TargetBall | null
): C3PlusPoint | null {
  void _targetBall;
  return isFinitePoint(balls.second) ? { ...balls.second } : null;
}

function cloneExtensions(
  payload: TrajectoryExtensionPayload | null | undefined
): TrajectoryExtensionPayload | undefined {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(payload)) as TrajectoryExtensionPayload;
}

function clampCueToFamilyBallCenter(point: Point): Point {
  return {
    x: Math.min(
      FAMILY_BALL_CENTER_MAX_X,
      Math.max(FAMILY_BALL_CENTER_MIN, point.x)
    ),
    y: Math.min(
      FAMILY_BALL_CENTER_MAX_Y,
      Math.max(FAMILY_BALL_CENTER_MIN, point.y)
    ),
  };
}

export function generateC3PlusScoringDerivedMembers(
  args: GenerateC3PlusArgs
): GenerateC3PlusResult {
  void FAMILY_MASTER_MIGRATION_DEBT;
  void TEMPORARY_COMPATIBILITY_DUPLICATION;

  const { sourceMember } = args;
  const sourceBalls = sourceMember.balls;
  const identity = readPersistedFamilyIdentity(sourceMember.entry, {
    authoringStrategyId: sourceMember.entry.authoringStrategyId,
    positionId: createPositionId(sourceBalls),
  });
  if (!identity?.familyId || !identity.memberId) {
    return { ok: false, code: "NOT_FAMILY_AWARE", reason: "source member is not Family-aware" };
  }

  const sourceRef = sourceRefFromIdentityFields({
    familyId: identity.familyId,
    memberId: identity.memberId,
    memberOrigin: identity.memberOrigin,
    track: sourceMember.entry.track,
  });
  if (!sourceRef) {
    return { ok: false, code: "INVALID_SOURCE", reason: "source member is missing track identity" };
  }

  const sourceCheck = validateDerivedSourceMember({
    derived: {
      familyId: identity.familyId,
      memberId: "mb_probe",
      memberOrigin: C3_PLUS_MEMBER_ORIGIN,
      generatedFromMemberId: identity.memberId,
      track: sourceRef.track,
    },
    sources: [sourceRef],
  });
  if (!sourceCheck.ok) {
    return { ok: false, code: "INVALID_SOURCE", reason: sourceCheck.reason };
  }

  if (isDerivedMemberOrigin(identity.memberOrigin)) {
    return {
      ok: false,
      code: "INVALID_SOURCE",
      reason: "C3+ scoring derived cannot source another Derived Member",
    };
  }

  if (
    !isFinitePoint(sourceBalls.cue) ||
    !isFinitePoint(sourceBalls.target) ||
    !isFinitePoint(sourceBalls.second)
  ) {
    return {
      ok: false,
      code: "INVALID_BALLS",
      reason: "source Ball3 has non-finite coordinates",
    };
  }

  const sourceInvalid = validateBall3Centers(sourceBalls);
  if (sourceInvalid) {
    return { ok: false, code: "INVALID_BALLS", reason: sourceInvalid };
  }

  const secondBall = resolveC3PlusSecondBall(
    sourceBalls,
    sourceMember.targetBall
  );
  if (!secondBall) {
    return {
      ok: false,
      code: "INVALID_BALLS",
      reason: "Second Ball center unresolved",
    };
  }

  const extensions =
    args.extensions !== undefined
      ? args.extensions
      : sourceMember.entry.trajectoryExtensions ?? null;

  const scoring = resolveC3PlusScoringLine({
    pathNodes: args.pathNodes,
    extensions,
    secondBall,
    hitTolerance: args.hitTolerance ?? resolveTrajectoryHitTolerance(),
  });
  if (!scoring.ok) {
    if (scoring.code === "NO_SB_HIT") {
      return { ok: false, code: "NO_SB_HIT", reason: scoring.reason };
    }
    return { ok: false, code: "PATH_FAILED", reason: scoring.reason };
  }

  const sampled = sampleC3PlusScoringLine(scoring.scoringLine);
  if (!sampled.ok) {
    return { ok: false, code: "SAMPLE_FAILED", reason: sampled.reason };
  }

  const existing = lineageMap(args.existingMembers);
  const compatibility = extractTemporaryCompatibilityPayload(sourceMember.entry);
  const trajectoryExtensions = cloneExtensions(
    extensions ?? sourceMember.entry.trajectoryExtensions
  );
  const reflectionOverride = sourceMember.entry.reflectionOverride
    ? (JSON.parse(
        JSON.stringify(sourceMember.entry.reflectionOverride)
      ) as StrategyEntry["reflectionOverride"])
    : undefined;

  const members: LogicalFamilyMemberCandidate[] = [];
  const seenCue: Point[] = [];

  for (const sample of sampled.samples) {
    const cue = clampCueToFamilyBallCenter(sample.point);
    if (seenCue.some((prev) => pointsNearlyEqual(prev, cue))) {
      continue;
    }
    // Skip Exact duplicate of the authored cue (same Exact packing cell as source).
    if (pointsEqual(cue, sourceBalls.cue)) {
      continue;
    }
    seenCue.push(cue);

    const balls: Ball3 = {
      cue: { x: cue.x, y: cue.y },
      target: { ...sourceBalls.target },
      second: { ...sourceBalls.second },
    };
    if (!isValidBallCenter(cue)) {
      return {
        ok: false,
        code: "OUT_OF_BOUNDS",
        reason: "derived Cue center is outside the Family ball-center contract",
      };
    }
    const bounds = validateBall3Centers(balls);
    if (bounds) {
      return { ok: false, code: "OUT_OF_BOUNDS", reason: bounds };
    }

    const found = existing.get(sample.derivedStep);
    const memberId = found?.memberId ?? mintMemberId();
    const authoringStrategyId =
      found?.authoringStrategyId?.trim() || mintAuthoringStrategyId();

    const candidate: LogicalFamilyMemberCandidate = {
      familyId: identity.familyId,
      memberId,
      memberOrigin: C3_PLUS_MEMBER_ORIGIN,
      generatedFromMemberId: identity.memberId,
      derivedRule: C3_PLUS_DERIVED_RULE,
      derivedStep: sample.derivedStep,
      authoringStrategyId,
      track: sourceRef.track,
      balls: cloneBall3(balls),
      ...(sourceMember.targetBall === "yellow" || sourceMember.targetBall === "red"
        ? { targetBall: sourceMember.targetBall }
        : {}),
      compatibility,
      ...(trajectoryExtensions ? { trajectoryExtensions } : {}),
      ...(reflectionOverride ? { reflectionOverride } : {}),
    };

    const provenance = validateFamilyProvenance(candidate);
    if (!provenance.ok) {
      return { ok: false, code: "INVALID_SOURCE", reason: provenance.reason };
    }
    members.push(candidate);
  }

  if (members.length === 0) {
    return {
      ok: false,
      code: "SAMPLE_FAILED",
      reason: "all scoring-line samples were skipped as Exact source Cue duplicates",
    };
  }

  return {
    ok: true,
    members,
    scoringLineIds: scoring.scoringLine.map((n) => n.id),
    hitSegment: {
      fromId: scoring.hitSegment.from.id,
      toId: scoring.hitSegment.to.id,
    },
  };
}

export function generateC3PlusScoringDerivedMembersForTracks(
  sources: Array<
    C3PlusSourceMember & {
      pathNodes: ReadonlyArray<Point | null | undefined>;
      hitTolerance?: number;
    }
  >,
  options?: { existingMembers?: C3PlusExistingDerivedLineage[] }
):
  | {
      ok: true;
      members: LogicalFamilyMemberCandidate[];
      bySourceMemberId: Record<string, LogicalFamilyMemberCandidate[]>;
    }
  | { ok: false; code: GenerateC3PlusFailureCode; reason: string } {
  const all: LogicalFamilyMemberCandidate[] = [];
  const bySourceMemberId: Record<string, LogicalFamilyMemberCandidate[]> = {};
  for (const source of sources) {
    const sourceId = source.entry.memberId ?? "";
    const existingForSource = (options?.existingMembers ?? []).filter(
      (row) =>
        !row.generatedFromMemberId || row.generatedFromMemberId === sourceId
    );
    const result = generateC3PlusScoringDerivedMembers({
      sourceMember: source,
      pathNodes: source.pathNodes,
      hitTolerance: source.hitTolerance,
      existingMembers: existingForSource,
    });
    if (!result.ok) return result;
    bySourceMemberId[sourceId] = result.members;
    all.push(...result.members);
  }
  return { ok: true, members: all, bySourceMemberId };
}
