/**
 * Phase 3A-360 — Track × CueSample × C3PlusSample Cartesian Product builder.
 *
 * Orchestration only: does not chain Cue-derived → C3+ generator.
 * C3+ Review candidates store sample points on balls.cue (transient);
 * Product maps that scoring point P onto balls.second (Role physical Second).
 * balls.target preserves base physical Target. targetBall is metadata only.
 */

import { mintAuthoringStrategyId } from "../authoringStrategyId";
import { placePhysicalSecondSampleOnRoleBall3 } from "../ballRole";
import type { Ball3, Point, StrategyEntry } from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import {
  extractTemporaryCompatibilityPayload,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import type { CueImpactReviewFrozenSource } from "./cueImpactDerivedReview";
import {
  encodeCueC3ProductDerivedStep,
  mintMemberId,
  validateFamilyProvenance,
} from "./familyIdentity";
import {
  CUE_IMPACT_DERIVED_RULE,
  CUE_IMPACT_MEMBER_ORIGIN,
} from "./generateCueImpactDerivedMembers";
import {
  C3_PLUS_DERIVED_RULE,
  C3_PLUS_MEMBER_ORIGIN,
} from "./generateC3PlusScoringDerivedMembers";
import {
  FAMILY_TRACKS,
  cloneBall3,
  isValidBallCenter,
  parseFamilyTrack,
  pointsEqual,
  validateBall3Centers,
  type FamilyTrack,
} from "./trackSymmetry";

export const CUE_C3_PRODUCT_MEMBER_ORIGIN = "DERIVED_CUE_C3_PRODUCT" as const;
export const CUE_C3_PRODUCT_DERIVED_RULE = "CUE_C3_CARTESIAN_PRODUCT_V1" as const;

export type CueC3ProductCardinality = {
  trackCount: number;
  cueSamplesPerTrack: number;
  c3SamplesPerTrack: number;
  expected: number;
  actual: number;
  perTrack: Record<
    FamilyTrack,
    {
      cue: number;
      c3: number;
      cueMarginal?: number;
      c3Marginal?: number;
      crossProduct?: number;
      product: number;
    }
  >;
};

export type CueC3ProductExistingLineage = {
  derivedStep: string;
  memberId: string;
  authoringStrategyId?: string;
  generatedFromMemberId?: string;
};

export type BuildCueC3ProductMembersResult =
  | {
      ok: true;
      members: LogicalFamilyMemberCandidate[];
      cardinality: CueC3ProductCardinality;
    }
  | {
      ok: false;
      code:
        | "MISSING_BASE"
        | "CUE_COUNT_MISMATCH"
        | "C3_COUNT_MISMATCH"
        | "EMPTY_SAMPLES"
        | "CARDINALITY_MISMATCH"
        | "DUPLICATE_IDENTITY"
        | "INVALID_BALLS"
        | "OUT_OF_BOUNDS"
        | "INVALID_PROVENANCE";
      reason: string;
      cardinality?: CueC3ProductCardinality;
    };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneExtensions(
  payload: StrategyEntry["trajectoryExtensions"] | TrajectoryExtensionPayload | null | undefined
): TrajectoryExtensionPayload | undefined {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return undefined;
  }
  return cloneJson(payload) as TrajectoryExtensionPayload;
}

function isFinitePoint(point: Point | null | undefined): point is Point {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function groupByTrack(
  members: LogicalFamilyMemberCandidate[],
  origin: string
): Map<FamilyTrack, LogicalFamilyMemberCandidate[]> {
  const map = new Map<FamilyTrack, LogicalFamilyMemberCandidate[]>();
  for (const m of members) {
    if (m.memberOrigin !== origin) continue;
    const track = parseFamilyTrack(m.track);
    if (!track) continue;
    const list = map.get(track) ?? [];
    list.push(m);
    map.set(track, list);
  }
  return map;
}

/**
 * Build durable Product members from frozen Cue + C3+ review candidates.
 * balls.cue ← Cue sample cue;
 * balls.second ← C3+ scoring sample P (physical Second Role);
 * balls.target ← base physical Target (unchanged);
 * extensions ← base COPY.
 */
export function buildCueC3ProductMembers(args: {
  familyId: string;
  cueMembers: LogicalFamilyMemberCandidate[];
  c3PlusMembers: LogicalFamilyMemberCandidate[];
  frozenSourcesByTrack: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>>;
  existingMembers?: CueC3ProductExistingLineage[];
}): BuildCueC3ProductMembersResult {
  const familyId = args.familyId.trim();
  const cueByTrack = groupByTrack(args.cueMembers, CUE_IMPACT_MEMBER_ORIGIN);
  const c3ByTrack = groupByTrack(args.c3PlusMembers, C3_PLUS_MEMBER_ORIGIN);

  const tracksWithCue = FAMILY_TRACKS.filter((t) => (cueByTrack.get(t)?.length ?? 0) > 0);
  const tracksWithC3 = FAMILY_TRACKS.filter((t) => (c3ByTrack.get(t)?.length ?? 0) > 0);

  if (tracksWithCue.length === 0 || tracksWithC3.length === 0) {
    return {
      ok: false,
      code: "EMPTY_SAMPLES",
      reason: "Cue and C3+ samples required to build Product members",
    };
  }

  if (tracksWithCue.length !== FAMILY_TRACKS.length || tracksWithC3.length !== FAMILY_TRACKS.length) {
    return {
      ok: false,
      code: "MISSING_BASE",
      reason: "Product requires Cue and C3+ samples on all four Family tracks",
    };
  }

  const cueCounts = FAMILY_TRACKS.map((t) => cueByTrack.get(t)!.length);
  const c3Counts = FAMILY_TRACKS.map((t) => c3ByTrack.get(t)!.length);
  const nc = cueCounts[0]!;
  const n3 = c3Counts[0]!;

  if (cueCounts.some((n) => n !== nc)) {
    return {
      ok: false,
      code: "CUE_COUNT_MISMATCH",
      reason: `Cue sample count mismatch across tracks: ${cueCounts.join(",")}`,
    };
  }
  if (c3Counts.some((n) => n !== n3)) {
    return {
      ok: false,
      code: "C3_COUNT_MISMATCH",
      reason: `C3+ sample count mismatch across tracks: ${c3Counts.join(",")}`,
    };
  }

  const expected = FAMILY_TRACKS.length * (nc + n3 + nc * n3);
  const perTrack = {} as CueC3ProductCardinality["perTrack"];
  for (const t of FAMILY_TRACKS) {
    perTrack[t] = {
      cue: nc,
      c3: n3,
      cueMarginal: nc,
      c3Marginal: n3,
      crossProduct: nc * n3,
      product: nc + n3 + nc * n3,
    };
  }
  const cardinalityBase: CueC3ProductCardinality = {
    trackCount: FAMILY_TRACKS.length,
    cueSamplesPerTrack: nc,
    c3SamplesPerTrack: n3,
    expected,
    actual: 0,
    perTrack,
  };

  const existing = new Map<string, CueC3ProductExistingLineage>();
  for (const row of args.existingMembers ?? []) {
    const key = `${row.generatedFromMemberId ?? ""}|${row.derivedStep}`;
    if (!existing.has(key)) existing.set(key, row);
  }

  const members: LogicalFamilyMemberCandidate[] = [];
  const seenIdentity = new Set<string>();
  const seenExact = new Set<string>();

  for (const track of FAMILY_TRACKS) {
    const base = args.frozenSourcesByTrack[track];
    if (!base?.entry?.memberId) {
      return {
        ok: false,
        code: "MISSING_BASE",
        reason: `missing AUTHORED/SYMMETRY frozen base for track ${track}`,
        cardinality: cardinalityBase,
      };
    }
    const baseMemberId = base.entry.memberId;
    const resolvedTargetBall =
      base.targetBall === "yellow" || base.targetBall === "red"
        ? base.targetBall
        : undefined;
    // Phase 6 Role: physical Target is always balls.target
    const physicalTargetPoint = isFinitePoint(base.balls.target)
      ? { x: base.balls.target.x, y: base.balls.target.y }
      : null;
    if (!physicalTargetPoint) {
      return {
        ok: false,
        code: "INVALID_BALLS",
        reason: `missing base physical Target (balls.target) on ${track}`,
        cardinality: cardinalityBase,
      };
    }
    const baseCuePoint = isFinitePoint(base.balls.cue)
      ? { x: base.balls.cue.x, y: base.balls.cue.y }
      : null;
    const baseSecondPoint = isFinitePoint(base.balls.second)
      ? { x: base.balls.second.x, y: base.balls.second.y }
      : null;
    if (!baseCuePoint || !baseSecondPoint) {
      return {
        ok: false,
        code: "INVALID_BALLS",
        reason: `missing base physical balls (cue or second) on ${track}`,
        cardinality: cardinalityBase,
      };
    }
    const compatibility = extractTemporaryCompatibilityPayload(base.entry);
    const trajectoryExtensions = cloneExtensions(base.entry.trajectoryExtensions);
    const reflectionOverride = base.entry.reflectionOverride
      ? cloneJson(base.entry.reflectionOverride)
      : undefined;

    const cues = cueByTrack.get(track)!;
    const c3s = c3ByTrack.get(track)!;

    // 1. Cue Marginal (Ci × S0): Cue Derived × Base Second
    for (const cueSample of cues) {
      const cueStep = (cueSample.derivedStep ?? "").trim();
      const cuePoint = cueSample.balls.cue;
      if (!cueStep || !isFinitePoint(cuePoint)) {
        return {
          ok: false,
          code: "INVALID_BALLS",
          reason: `invalid Cue sample on ${track}`,
          cardinality: cardinalityBase,
        };
      }
      if (cueSample.generatedFromMemberId !== baseMemberId) {
        return {
          ok: false,
          code: "INVALID_PROVENANCE",
          reason: `Cue sample ${cueSample.memberId} generatedFrom must be base ${baseMemberId}`,
          cardinality: cardinalityBase,
        };
      }

      const sampleTargetBall =
        resolvedTargetBall ??
        (cueSample.targetBall === "yellow" || cueSample.targetBall === "red"
          ? cueSample.targetBall
          : undefined);

      if (
        pointsEqual(cuePoint, baseSecondPoint) ||
        pointsEqual(cuePoint, physicalTargetPoint) ||
        pointsEqual(baseSecondPoint, physicalTargetPoint)
      ) {
        return {
          ok: false,
          code: "INVALID_BALLS",
          reason: `Cue marginal balls collide on ${track} cue=${cueStep}`,
          cardinality: cardinalityBase,
        };
      }

      const balls: Ball3 = {
        cue: { x: cuePoint.x, y: cuePoint.y },
        target: { x: physicalTargetPoint.x, y: physicalTargetPoint.y },
        second: { x: baseSecondPoint.x, y: baseSecondPoint.y },
      };

      if (
        !isValidBallCenter(balls.cue) ||
        !isValidBallCenter(balls.target) ||
        !isValidBallCenter(balls.second)
      ) {
        return {
          ok: false,
          code: "OUT_OF_BOUNDS",
          reason: `Cue marginal ball center out of range on ${track}`,
          cardinality: cardinalityBase,
        };
      }
      const bounds = validateBall3Centers(balls);
      if (bounds) {
        return {
          ok: false,
          code: "OUT_OF_BOUNDS",
          reason: bounds,
          cardinality: cardinalityBase,
        };
      }

      const exactKey = `${balls.cue.x},${balls.cue.y}|${balls.target.x},${balls.target.y}|${balls.second.x},${balls.second.y}`;
      if (seenExact.has(exactKey)) {
        return {
          ok: false,
          code: "DUPLICATE_IDENTITY",
          reason: `duplicate Exact Cue marginal balls on ${track}`,
          cardinality: cardinalityBase,
        };
      }
      seenExact.add(exactKey);

      const identityKey = `${baseMemberId}|${cueStep}`;
      if (seenIdentity.has(identityKey)) {
        return {
          ok: false,
          code: "DUPLICATE_IDENTITY",
          reason: `duplicate Cue marginal derivedStep ${cueStep}`,
          cardinality: cardinalityBase,
        };
      }
      seenIdentity.add(identityKey);

      const found = existing.get(`${baseMemberId}|${cueStep}`);
      const memberId = found?.memberId ?? mintMemberId();
      const authoringStrategyId =
        found?.authoringStrategyId?.trim() || mintAuthoringStrategyId();

      const candidate: LogicalFamilyMemberCandidate = {
        familyId,
        memberId,
        memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
        generatedFromMemberId: baseMemberId,
        derivedRule: CUE_IMPACT_DERIVED_RULE,
        derivedStep: cueStep,
        authoringStrategyId,
        track,
        balls: cloneBall3(balls),
        ...(sampleTargetBall === "yellow" || sampleTargetBall === "red"
          ? { targetBall: sampleTargetBall }
          : {}),
        compatibility,
        ...(trajectoryExtensions ? { trajectoryExtensions } : {}),
        ...(reflectionOverride ? { reflectionOverride } : {}),
      };

      const provenance = validateFamilyProvenance(candidate);
      if (!provenance.ok) {
        return {
          ok: false,
          code: "INVALID_PROVENANCE",
          reason: provenance.reason,
          cardinality: cardinalityBase,
        };
      }
      members.push(candidate);
    }

    // 2. C3+ Marginal (C0 × Sj): Base Cue × C3+ Scoring
    for (const c3Sample of c3s) {
      const c3Step = (c3Sample.derivedStep ?? "").trim();
      const scoringPointP = c3Sample.balls.cue;
      if (!c3Step || !isFinitePoint(scoringPointP)) {
        return {
          ok: false,
          code: "INVALID_BALLS",
          reason: `invalid C3+ sample on ${track}`,
          cardinality: cardinalityBase,
        };
      }
      if (c3Sample.generatedFromMemberId !== baseMemberId) {
        return {
          ok: false,
          code: "INVALID_PROVENANCE",
          reason: `C3+ sample ${c3Sample.memberId} generatedFrom must be base ${baseMemberId}`,
          cardinality: cardinalityBase,
        };
      }

      const c3TargetBall =
        resolvedTargetBall ??
        (c3Sample.targetBall === "yellow" || c3Sample.targetBall === "red"
          ? c3Sample.targetBall
          : undefined);

      if (
        pointsEqual(baseCuePoint, scoringPointP) ||
        pointsEqual(baseCuePoint, physicalTargetPoint) ||
        pointsEqual(scoringPointP, physicalTargetPoint)
      ) {
        return {
          ok: false,
          code: "INVALID_BALLS",
          reason: `C3+ marginal balls collide on ${track} c3=${c3Step}`,
          cardinality: cardinalityBase,
        };
      }

      const objectSlots = placePhysicalSecondSampleOnRoleBall3(
        base.balls,
        scoringPointP
      );
      const balls: Ball3 = {
        cue: { x: baseCuePoint.x, y: baseCuePoint.y },
        target: objectSlots.target,
        second: objectSlots.second,
      };

      if (
        !isValidBallCenter(balls.cue) ||
        !isValidBallCenter(balls.target) ||
        !isValidBallCenter(balls.second)
      ) {
        return {
          ok: false,
          code: "OUT_OF_BOUNDS",
          reason: `C3+ marginal ball center out of range on ${track}`,
          cardinality: cardinalityBase,
        };
      }
      const bounds = validateBall3Centers(balls);
      if (bounds) {
        return {
          ok: false,
          code: "OUT_OF_BOUNDS",
          reason: bounds,
          cardinality: cardinalityBase,
        };
      }

      const exactKey = `${balls.cue.x},${balls.cue.y}|${balls.target.x},${balls.target.y}|${balls.second.x},${balls.second.y}`;
      if (seenExact.has(exactKey)) {
        return {
          ok: false,
          code: "DUPLICATE_IDENTITY",
          reason: `duplicate Exact C3+ marginal balls on ${track}`,
          cardinality: cardinalityBase,
        };
      }
      seenExact.add(exactKey);

      const identityKey = `${baseMemberId}|${c3Step}`;
      if (seenIdentity.has(identityKey)) {
        return {
          ok: false,
          code: "DUPLICATE_IDENTITY",
          reason: `duplicate C3+ marginal derivedStep ${c3Step}`,
          cardinality: cardinalityBase,
        };
      }
      seenIdentity.add(identityKey);

      const found = existing.get(`${baseMemberId}|${c3Step}`);
      const memberId = found?.memberId ?? mintMemberId();
      const authoringStrategyId =
        found?.authoringStrategyId?.trim() || mintAuthoringStrategyId();

      const candidate: LogicalFamilyMemberCandidate = {
        familyId,
        memberId,
        memberOrigin: C3_PLUS_MEMBER_ORIGIN,
        generatedFromMemberId: baseMemberId,
        derivedRule: C3_PLUS_DERIVED_RULE,
        derivedStep: c3Step,
        authoringStrategyId,
        track,
        balls: cloneBall3(balls),
        ...(c3TargetBall === "yellow" || c3TargetBall === "red"
          ? { targetBall: c3TargetBall }
          : {}),
        compatibility,
        ...(trajectoryExtensions ? { trajectoryExtensions } : {}),
        ...(reflectionOverride ? { reflectionOverride } : {}),
      };

      const provenance = validateFamilyProvenance(candidate);
      if (!provenance.ok) {
        return {
          ok: false,
          code: "INVALID_PROVENANCE",
          reason: provenance.reason,
          cardinality: cardinalityBase,
        };
      }
      members.push(candidate);
    }

    // 3. Cross Product (Ci × Sj): Cue Derived × C3+ Scoring
    for (const cueSample of cues) {
      const cueStep = (cueSample.derivedStep ?? "").trim();
      const cuePoint = cueSample.balls.cue;
      if (!cueStep || !isFinitePoint(cuePoint)) {
        return {
          ok: false,
          code: "INVALID_BALLS",
          reason: `invalid Cue sample on ${track}`,
          cardinality: cardinalityBase,
        };
      }
      if (cueSample.generatedFromMemberId !== baseMemberId) {
        return {
          ok: false,
          code: "INVALID_PROVENANCE",
          reason: `Cue sample ${cueSample.memberId} generatedFrom must be base ${baseMemberId}`,
          cardinality: cardinalityBase,
        };
      }

      const sampleTargetBall =
        resolvedTargetBall ??
        (cueSample.targetBall === "yellow" || cueSample.targetBall === "red"
          ? cueSample.targetBall
          : undefined);

      for (const c3Sample of c3s) {
        const c3Step = (c3Sample.derivedStep ?? "").trim();
        // Review C3+ candidates park the scoring sample on balls.cue (transient).
        const scoringPointP = c3Sample.balls.cue;
        if (!c3Step || !isFinitePoint(scoringPointP)) {
          return {
            ok: false,
            code: "INVALID_BALLS",
            reason: `invalid C3+ sample on ${track}`,
            cardinality: cardinalityBase,
          };
        }
        if (c3Sample.generatedFromMemberId !== baseMemberId) {
          return {
            ok: false,
            code: "INVALID_PROVENANCE",
            reason: `C3+ sample ${c3Sample.memberId} generatedFrom must be base ${baseMemberId}`,
            cardinality: cardinalityBase,
          };
        }

        const c3TargetBall =
          sampleTargetBall ??
          (c3Sample.targetBall === "yellow" || c3Sample.targetBall === "red"
            ? c3Sample.targetBall
            : undefined);

        if (
          pointsEqual(cuePoint, scoringPointP) ||
          pointsEqual(cuePoint, physicalTargetPoint) ||
          pointsEqual(scoringPointP, physicalTargetPoint)
        ) {
          return {
            ok: false,
            code: "INVALID_BALLS",
            reason: `Product balls collide on ${track} cue=${cueStep} c3=${c3Step}`,
            cardinality: cardinalityBase,
          };
        }

        const objectSlots = placePhysicalSecondSampleOnRoleBall3(
          base.balls,
          scoringPointP
        );
        const balls: Ball3 = {
          cue: { x: cuePoint.x, y: cuePoint.y },
          target: objectSlots.target,
          second: objectSlots.second,
        };
        if (
          !isValidBallCenter(balls.cue) ||
          !isValidBallCenter(balls.target) ||
          !isValidBallCenter(balls.second)
        ) {
          return {
            ok: false,
            code: "OUT_OF_BOUNDS",
            reason: `Product ball center out of range on ${track}`,
            cardinality: cardinalityBase,
          };
        }
        const bounds = validateBall3Centers(balls);
        if (bounds) {
          return {
            ok: false,
            code: "OUT_OF_BOUNDS",
            reason: bounds,
            cardinality: cardinalityBase,
          };
        }

        const exactKey = `${balls.cue.x},${balls.cue.y}|${balls.target.x},${balls.target.y}|${balls.second.x},${balls.second.y}`;
        if (seenExact.has(exactKey)) {
          return {
            ok: false,
            code: "DUPLICATE_IDENTITY",
            reason: `duplicate Exact Product balls on ${track}`,
            cardinality: cardinalityBase,
          };
        }
        seenExact.add(exactKey);

        const derivedStep = encodeCueC3ProductDerivedStep(cueStep, c3Step);
        const identityKey = `${baseMemberId}|${derivedStep}`;
        if (seenIdentity.has(identityKey)) {
          return {
            ok: false,
            code: "DUPLICATE_IDENTITY",
            reason: `duplicate Product derivedStep ${derivedStep}`,
            cardinality: cardinalityBase,
          };
        }
        seenIdentity.add(identityKey);

        const found = existing.get(`${baseMemberId}|${derivedStep}`);
        const memberId = found?.memberId ?? mintMemberId();
        const authoringStrategyId =
          found?.authoringStrategyId?.trim() || mintAuthoringStrategyId();

        const candidate: LogicalFamilyMemberCandidate = {
          familyId,
          memberId,
          memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
          generatedFromMemberId: baseMemberId,
          derivedRule: CUE_C3_PRODUCT_DERIVED_RULE,
          derivedStep,
          authoringStrategyId,
          track,
          balls: cloneBall3(balls),
          ...(c3TargetBall === "yellow" || c3TargetBall === "red"
            ? { targetBall: c3TargetBall }
            : {}),
          compatibility,
          ...(trajectoryExtensions ? { trajectoryExtensions } : {}),
          ...(reflectionOverride ? { reflectionOverride } : {}),
        };

        const provenance = validateFamilyProvenance(candidate);
        if (!provenance.ok) {
          return {
            ok: false,
            code: "INVALID_PROVENANCE",
            reason: provenance.reason,
            cardinality: cardinalityBase,
          };
        }
        members.push(candidate);
      }
    }
  }

  const cardinality: CueC3ProductCardinality = {
    ...cardinalityBase,
    actual: members.length,
  };
  if (members.length !== expected) {
    return {
      ok: false,
      code: "CARDINALITY_MISMATCH",
      reason: `expected ${expected} Product members, built ${members.length}`,
      cardinality,
    };
  }

  return { ok: true, members, cardinality };
}

export function fingerprintCueC3ProductMembers(
  members: LogicalFamilyMemberCandidate[]
): string {
  const rows = members
    .map(
      (m) =>
        `${m.track}|${m.memberOrigin}|${m.derivedStep}|${m.generatedFromMemberId ?? ""}|${m.balls.cue.x},${m.balls.cue.y}|${m.balls.target.x},${m.balls.target.y}|${m.balls.second.x},${m.balls.second.y}|${m.targetBall ?? ""}`
    )
    .sort();
  return rows.join("\n");
}
