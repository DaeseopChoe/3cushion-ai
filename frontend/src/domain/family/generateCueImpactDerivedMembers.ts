/**
 * CUE_IMPACT_FIRST_30PCT Derived Member generator (Phase 3A-3D).
 *
 * Samples physical Cue Ball centers along the straight Cue→Impact segment.
 * Does not mutate PositionRecord / SAVE.
 *
 * Geometry (production primitives only):
 *   C = source.balls.cue
 *   I = calcImpactBall(C, source.balls.target, runtime T)
 *   P(t) = C + t * (I - C),  0 < t <= 0.30
 *
 * I is the Cue Ball center at Target contact — not a rail mark, not CO.
 * CO sys / CO→C1 rail geometry are not inputs.
 *
 * Withdrawn (Phase 3A-3 temporary, never persisted):
 *   CO_C1_2RG, sourceDomainLengthRg, evaluateCoC1RgSteps, co_c1:rg:<offset>
 */

import { calcImpactBall } from "../../data/system/calculator";
import { mintAuthoringStrategyId } from "../authoringStrategyId";
import { createPositionId } from "../positionId";
import type { Ball3, Point, StrategyEntry, TargetBall } from "../positionSearchEngine";

/** Physical Target = the first object ball the cue must hit. Resolved by color, not by field name. */
export function resolvePhysicalTarget(balls: Ball3, targetBall?: TargetBall | null): Point {
  if (targetBall === "red") return balls.second;
  return balls.target;
}
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
import { hydrateFamilyMemberRuntimeThickness } from "./familyRuntimeProjection";
import {
  cloneBall3,
  isValidBallCenter,
  pointsEqual,
  validateBall3Centers,
} from "./trackSymmetry";

export const CUE_IMPACT_VALID_FRACTION = 0.3;
export const CUE_IMPACT_MAX_SAMPLE_SPACING = 3;
export const CUE_IMPACT_MIN_SAMPLE_COUNT = 3;
export const CUE_IMPACT_DERIVED_RULE = "CUE_IMPACT_FIRST_30PCT" as const;
export const CUE_IMPACT_MEMBER_ORIGIN = "DERIVED_CUE_IMPACT" as const;

const DISTANCE_EPS = 1e-9;
const POINT_EPS = 1e-9;
const STEP_FORMAT_DIGITS = 6;

export type CueImpactSourceMember = {
  balls: Ball3;
  targetBall?: TargetBall;
  entry: StrategyEntry;
};

export type CueImpactExistingDerivedLineage = {
  derivedStep: string;
  memberId: string;
  authoringStrategyId?: string;
  generatedFromMemberId?: string;
};

export type GenerateCueImpactArgs = {
  sourceMember: CueImpactSourceMember;
  existingMembers?: CueImpactExistingDerivedLineage[];
};

export type GenerateCueImpactFailureCode =
  | "NOT_FAMILY_AWARE"
  | "INVALID_SOURCE"
  | "INVALID_BALLS"
  | "IMPACT_UNRESOLVED"
  | "ZERO_DISTANCE"
  | "DUPLICATE_SAMPLE"
  | "OUT_OF_BOUNDS";

export type GenerateCueImpactResult =
  | { ok: true; members: LogicalFamilyMemberCandidate[] }
  | { ok: false; code: GenerateCueImpactFailureCode; reason: string };

export type CueImpactSampleParameters = {
  distance: number;
  validLength: number;
  sampleCount: number;
  ts: number[];
};

function isFinitePoint(point: Point | null | undefined): point is Point {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

export function calculateCueImpactDistance(cue: Point, impact: Point): number {
  return Math.hypot(impact.x - cue.x, impact.y - cue.y);
}

export function calculateCueImpactSampleCount(distance: number): number {
  if (!Number.isFinite(distance) || distance <= DISTANCE_EPS) return 0;
  const validLength = distance * CUE_IMPACT_VALID_FRACTION;
  return Math.max(
    CUE_IMPACT_MIN_SAMPLE_COUNT,
    Math.ceil(validLength / CUE_IMPACT_MAX_SAMPLE_SPACING)
  );
}

export function cueImpactSampleT(k: number, sampleCount: number): number {
  if (k === sampleCount) return CUE_IMPACT_VALID_FRACTION;
  return (CUE_IMPACT_VALID_FRACTION * k) / sampleCount;
}

export function calculateCueImpactSampleParameters(
  distance: number
): CueImpactSampleParameters | null {
  const sampleCount = calculateCueImpactSampleCount(distance);
  if (sampleCount < CUE_IMPACT_MIN_SAMPLE_COUNT) return null;
  const ts: number[] = [];
  for (let k = 1; k <= sampleCount; k += 1) {
    ts.push(cueImpactSampleT(k, sampleCount));
  }
  return {
    distance,
    validLength: distance * CUE_IMPACT_VALID_FRACTION,
    sampleCount,
    ts,
  };
}

export function sampleCueImpactPoint(cue: Point, impact: Point, t: number): Point {
  return {
    x: cue.x + t * (impact.x - cue.x),
    y: cue.y + t * (impact.y - cue.y),
  };
}

export function encodeCueImpactDerivedStep(t: number): string {
  if (!Number.isFinite(t)) return "cue_impact:t:invalid";
  return `cue_impact:t:${t.toFixed(STEP_FORMAT_DIGITS)}`;
}

function pointsNearlyEqual(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= POINT_EPS;
}

function lineageMap(
  existing: CueImpactExistingDerivedLineage[] | undefined
): Map<string, CueImpactExistingDerivedLineage> {
  const map = new Map<string, CueImpactExistingDerivedLineage>();
  for (const row of existing ?? []) {
    if (!map.has(row.derivedStep)) map.set(row.derivedStep, row);
  }
  return map;
}

function resolveRuntimeThickness(entry: StrategyEntry): string {
  return hydrateFamilyMemberRuntimeThickness(entry) ?? "8/8";
}

export function generateCueImpactDerivedMembers(
  args: GenerateCueImpactArgs
): GenerateCueImpactResult {
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
      memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
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
      reason: "CUE_IMPACT_FIRST_30PCT cannot source a Derived Member",
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

  const runtimeT = resolveRuntimeThickness(sourceMember.entry);
  const physicalTarget = resolvePhysicalTarget(sourceBalls, sourceMember.targetBall);
  const impact = calcImpactBall(sourceBalls.cue, physicalTarget, runtimeT);
  if (!impact || !isFinitePoint(impact)) {
    return {
      ok: false,
      code: "IMPACT_UNRESOLVED",
      reason: "calcImpactBall did not return a finite Cue-center impact",
    };
  }

  const distance = calculateCueImpactDistance(sourceBalls.cue, impact);
  const parameters = calculateCueImpactSampleParameters(distance);
  if (!parameters) {
    return {
      ok: false,
      code: "ZERO_DISTANCE",
      reason: "Cue→Impact distance is zero; no Derived segment exists",
    };
  }

  const existing = lineageMap(args.existingMembers);
  const members: LogicalFamilyMemberCandidate[] = [];
  const compatibility = extractTemporaryCompatibilityPayload(sourceMember.entry);
  const sampled: Point[] = [];

  for (let k = 0; k < parameters.ts.length; k += 1) {
    const t = parameters.ts[k];
    const cue = sampleCueImpactPoint(sourceBalls.cue, impact, t);
    if (!isFinitePoint(cue)) {
      return {
        ok: false,
        code: "INVALID_BALLS",
        reason: `sample t=${t} produced a non-finite Cue coordinate`,
      };
    }
    if (sampled.some((prev) => pointsNearlyEqual(prev, cue))) {
      return {
        ok: false,
        code: "DUPLICATE_SAMPLE",
        reason: `sample t=${t} collapsed onto a previous Cue coordinate`,
      };
    }
    if (pointsEqual(cue, sourceBalls.cue)) {
      return {
        ok: false,
        code: "DUPLICATE_SAMPLE",
        reason: `sample t=${t} equals the source Cue coordinate`,
      };
    }
    sampled.push(cue);

    const balls: Ball3 = {
      cue,
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

    const derivedStep = encodeCueImpactDerivedStep(t);
    const found = existing.get(derivedStep);
    const memberId = found?.memberId ?? mintMemberId();
    const authoringStrategyId =
      found?.authoringStrategyId?.trim() || mintAuthoringStrategyId();

    const candidate: LogicalFamilyMemberCandidate = {
      familyId: identity.familyId,
      memberId,
      memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
      generatedFromMemberId: identity.memberId,
      derivedRule: CUE_IMPACT_DERIVED_RULE,
      derivedStep,
      authoringStrategyId,
      track: sourceRef.track,
      balls: cloneBall3(balls),
      ...(sourceMember.targetBall === "yellow" || sourceMember.targetBall === "red"
        ? { targetBall: sourceMember.targetBall }
        : {}),
      compatibility,
    };

    const provenance = validateFamilyProvenance(candidate);
    if (!provenance.ok) {
      return { ok: false, code: "INVALID_SOURCE", reason: provenance.reason };
    }
    members.push(candidate);
  }

  return { ok: true, members };
}

/**
 * Independent per-Track generation. Does not apply H/V/RPI to derived members.
 */
export function generateCueImpactDerivedMembersForTracks(
  sources: CueImpactSourceMember[],
  options?: Omit<GenerateCueImpactArgs, "sourceMember">
): GenerateCueImpactResult & {
  bySourceMemberId?: Record<string, LogicalFamilyMemberCandidate[]>;
} {
  const all: LogicalFamilyMemberCandidate[] = [];
  const bySourceMemberId: Record<string, LogicalFamilyMemberCandidate[]> = {};
  for (const sourceMember of sources) {
    const sourceId = sourceMember.entry.memberId ?? "";
    const existingForSource = (options?.existingMembers ?? []).filter(
      (row) =>
        !row.generatedFromMemberId || row.generatedFromMemberId === sourceId
    );
    const result = generateCueImpactDerivedMembers({
      ...options,
      sourceMember,
      existingMembers: existingForSource,
    });
    if (!result.ok) return result;
    bySourceMemberId[sourceId] = result.members;
    all.push(...result.members);
  }
  return { ok: true, members: all, bySourceMemberId };
}
