/**
 * Phase 3A-3D — Cue→Impact first 30% adaptive Derived generator.
 * Run: npx vitest run src/domain/family/generateCueImpactDerivedMembers.test.ts
 */

import { describe, expect, it } from "vitest";
import { calcImpactBall } from "../../data/system/calculator";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import { createPositionId } from "../positionId";
import type { Ball3, Point, StrategyEntry } from "../positionSearchEngine";
import {
  genericFamilyMemberIdentityKey,
  resolveGenericFamilyMemberIdentity,
} from "./familyIdentity";
import { createFamilyPositionKey } from "./familyPositionKey";
import {
  preflightFamilyMemberWrite,
  projectFamilyMemberToCompatibilityEntry,
  reconstructFamilyMembers,
  writeFamilyMembers,
  writeFourTrackFamilyMembers,
} from "./familyAwareWriter";
import { generateFourTrackMembers } from "./generateFourTrackMembers";
import {
  CUE_IMPACT_DERIVED_RULE,
  CUE_IMPACT_MAX_SAMPLE_SPACING,
  CUE_IMPACT_MEMBER_ORIGIN,
  CUE_IMPACT_MIN_SAMPLE_COUNT,
  CUE_IMPACT_VALID_FRACTION,
  calculateCueImpactDistance,
  calculateCueImpactSampleCount,
  calculateCueImpactSampleParameters,
  encodeCueImpactDerivedStep,
  generateCueImpactDerivedMembers,
  generateCueImpactDerivedMembersForTracks,
  resolvePhysicalTarget,
  sampleCueImpactPoint,
} from "./generateCueImpactDerivedMembers";
import { hydrateFamilyMemberRuntimeThickness } from "./familyRuntimeProjection";
import { FAMILY_TRACKS } from "./trackSymmetry";
import { FAMILY_MASTER_MIGRATION_DEBT } from "./familyMigrationDebt";

const T_EPS = 1e-10;
const DIST_EPS = 1e-6;

const canonicalHpt = {
  T: "8/8",
  hit_point: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
};

function authoredEntry(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    authoringStrategyId: "as_authored",
    familyId: "fm_family1",
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: canonicalHpt,
    str: { speed: 2.5 },
    ai: { text: "keep" },
    reflectionOverride: { rail: "TOP", t: 0.2 },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function collinearBalls(distance: number, cueX = 8, y = 16): Ball3 {
  return {
    cue: { x: cueX, y },
    target: { x: cueX + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y },
    second: { x: 62, y: 12 },
  };
}

function resolvedImpact(balls: Ball3, T = "8/8"): Point {
  const impact = calcImpactBall(balls.cue, balls.target, T);
  if (!impact) throw new Error("expected calcImpactBall");
  return impact;
}

describe("Cue→Impact adaptive sampling formula", () => {
  it("uses first 30%, not 1/3, and requires at least 3 samples", () => {
    expect(CUE_IMPACT_VALID_FRACTION).toBe(0.3);
    expect(CUE_IMPACT_VALID_FRACTION).not.toBeCloseTo(1 / 3, 6);
    expect(CUE_IMPACT_MIN_SAMPLE_COUNT).toBe(3);
    expect(CUE_IMPACT_MAX_SAMPLE_SPACING).toBe(3);
  });

  it.each([
    [20, 3, [0.1, 0.2, 0.3]],
    [30, 3, [0.1, 0.2, 0.3]],
    [60, 6, [0.05, 0.1, 0.15, 0.2, 0.25, 0.3]],
    [100, 10, [0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24, 0.27, 0.3]],
  ] as const)("D=%s → N=%s with last t=0.30", (distance, n, expectedTs) => {
    expect(calculateCueImpactSampleCount(distance)).toBe(n);
    const params = calculateCueImpactSampleParameters(distance);
    expect(params?.sampleCount).toBe(n);
    expect(params?.ts).toHaveLength(n);
    expect(params?.ts.at(-1)).toBe(CUE_IMPACT_VALID_FRACTION);
    expectedTs.forEach((t, i) => {
      expect(params?.ts[i]).toBeCloseTo(t, 10);
    });
    const spacing = distance * CUE_IMPACT_VALID_FRACTION / n;
    expect(spacing).toBeLessThanOrEqual(CUE_IMPACT_MAX_SAMPLE_SPACING + T_EPS);
  });

  it("encodes derivedStep from t, not index or coordinates", () => {
    expect(encodeCueImpactDerivedStep(0.1)).toBe("cue_impact:t:0.100000");
    expect(encodeCueImpactDerivedStep(0.3)).toBe("cue_impact:t:0.300000");
    expect(encodeCueImpactDerivedStep(0.05)).toBe("cue_impact:t:0.050000");
    expect(encodeCueImpactDerivedStep(0.1)).not.toBe("1");
    expect(encodeCueImpactDerivedStep(0.1)).not.toContain("10,8");
  });
});

describe("Cue→Impact geometry", () => {
  it("uses calcImpactBall as the endpoint and interpolates the straight segment", () => {
    const balls = collinearBalls(20);
    const impact = resolvedImpact(balls);
    expect(calculateCueImpactDistance(balls.cue, impact)).toBeCloseTo(20, 6);
    const p10 = sampleCueImpactPoint(balls.cue, impact, 0.1);
    const p30 = sampleCueImpactPoint(balls.cue, impact, 0.3);
    expect(p10.x).toBeCloseTo(balls.cue.x + 2, 6);
    expect(p10.y).toBe(balls.cue.y);
    expect(p30.x).toBeCloseTo(balls.cue.x + 6, 6);
    expect(p30.y).toBe(balls.cue.y);
  });

  it("does not change Derived cue coordinates when CO/C1 sys values change", () => {
    const balls = collinearBalls(20);
    const first = generateCueImpactDerivedMembers({
      sourceMember: { balls, entry: authoredEntry({ sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 } }) },
    });
    const second = generateCueImpactDerivedMembers({
      sourceMember: {
        balls,
        entry: authoredEntry({ sysInputs: { CO_f: 55, C1_f: 1, C3_r: 20 } }),
      },
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.members.map((m) => m.balls.cue)).toEqual(
      second.members.map((m) => m.balls.cue)
    );
  });
});

describe("generateCueImpactDerivedMembers", () => {
  it("builds DERIVED_CUE_IMPACT candidates with cue-only motion and Exact target/second", () => {
    const balls = collinearBalls(20);
    const snapshot = structuredClone(balls);
    const result = generateCueImpactDerivedMembers({
      sourceMember: { balls, targetBall: "yellow", entry: authoredEntry() },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members).toHaveLength(3);
    for (const member of result.members) {
      expect(member.familyId).toBe("fm_family1");
      expect(member.generatedFromMemberId).toBe("mb_authored");
      expect(member.track).toBe("B2T_L");
      expect(member.memberOrigin).toBe(CUE_IMPACT_MEMBER_ORIGIN);
      expect(member.derivedRule).toBe(CUE_IMPACT_DERIVED_RULE);
      expect(member.derivedStep.startsWith("cue_impact:t:")).toBe(true);
      expect(member.symmetryOp).toBeUndefined();
      expect(member.targetBall).toBe("yellow");
      expect(member.balls.cue).not.toEqual(balls.cue);
      expect(member.balls.target).toEqual(balls.target);
      expect(member.balls.second).toEqual(balls.second);
    }
    expect(result.members.at(-1)?.derivedStep).toBe("cue_impact:t:0.300000");
    expect(balls).toEqual(snapshot);
  });

  it.each([
    [20, 3],
    [30, 3],
    [60, 6],
  ] as const)("realizes D=%s as %s in-table Derived members ending at t=0.30", (distance, n) => {
    const balls = collinearBalls(distance);
    const impact = resolvedImpact(balls);
    expect(calculateCueImpactDistance(balls.cue, impact)).toBeCloseTo(distance, 6);
    const result = generateCueImpactDerivedMembers({
      sourceMember: { balls, entry: authoredEntry() },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members).toHaveLength(n);
    expect(result.members.at(-1)?.derivedStep).toBe("cue_impact:t:0.300000");
    const last = result.members.at(-1)?.balls.cue;
    const expectedLast = sampleCueImpactPoint(balls.cue, impact, 0.3);
    expect(last?.x).toBeCloseTo(expectedLast.x, 6);
    expect(last?.y).toBeCloseTo(expectedLast.y, 6);
    for (let i = 1; i < result.members.length; i += 1) {
      const gap = calculateCueImpactDistance(
        result.members[i - 1].balls.cue,
        result.members[i].balls.cue
      );
      expect(gap).toBeLessThanOrEqual(CUE_IMPACT_MAX_SAMPLE_SPACING + DIST_EPS);
    }
  });

  it("keeps logical identity stable across regenerate when source/rule/t match", () => {
    const balls = collinearBalls(20);
    const first = generateCueImpactDerivedMembers({
      sourceMember: { balls, entry: authoredEntry() },
    });
    if (!first.ok) throw new Error(first.reason);
    const existing = first.members.map((m) => ({
      derivedStep: m.derivedStep,
      memberId: m.memberId,
      authoringStrategyId: m.authoringStrategyId,
    }));
    const shifted: Ball3 = {
      cue: { x: balls.cue.x + 1, y: balls.cue.y },
      target: { x: balls.target.x + 1, y: balls.target.y },
      second: { x: balls.second.x, y: balls.second.y },
    };
    const second = generateCueImpactDerivedMembers({
      sourceMember: { balls: shifted, entry: authoredEntry() },
      existingMembers: existing,
    });
    if (!second.ok) throw new Error(second.reason);
    const k1 = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(first.members[0])
    );
    const k2 = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(second.members[0])
    );
    expect(k1).toBe(k2);
    expect(first.members[0].memberId).toBe(second.members[0].memberId);
    expect(k1).not.toContain(createPositionId(balls));
    expect(k1).not.toContain(String(balls.cue.x));
    expect(first.members[0].derivedStep).not.toBe(first.members[1].derivedStep);
  });

  it("does not copy reflectionOverride or persist mirrored HPT", () => {
    const result = generateCueImpactDerivedMembers({
      sourceMember: { balls: collinearBalls(20), entry: authoredEntry() },
    });
    if (!result.ok) throw new Error(result.reason);
    const projected = projectFamilyMemberToCompatibilityEntry(result.members[0], "S1");
    expect(projected.hpT).toEqual(canonicalHpt);
    expect(projected.signature.systemId).toBe("5_half_system");
    expect(projected.reflectionOverride).toBeUndefined();
    expect(projected.trajectoryExtensions).toBeUndefined();
    expect(FAMILY_MASTER_MIGRATION_DEBT).toContain("TEMPORARY");
  });

  it("fails closed on zero Cue→Impact distance", () => {
    const cue = { x: 20, y: 16 };
    const result = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: { cue, target: { ...cue }, second: { x: 62, y: 12 } },
        entry: authoredEntry(),
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ZERO_DISTANCE");
  });

  it("fails closed on non-finite coordinates", () => {
    const balls = collinearBalls(20);
    const result = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: { ...balls, cue: { x: Number.NaN, y: 16 } },
        entry: authoredEntry(),
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_BALLS");
  });

  it("fails closed when a sample would leave the Family ball-center bounds", () => {
    const result = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: {
          cue: { x: 0.6, y: 16 },
          target: { x: 0.8, y: 16 },
          second: { x: 62, y: 12 },
        },
        entry: authoredEntry(),
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("OUT_OF_BOUNDS");
  });

  it("rejects a Derived Member as source", () => {
    const result = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: collinearBalls(20),
        entry: authoredEntry({
          memberId: "mb_derived",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: "mb_authored",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "cue_impact:t:0.100000",
        }),
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_SOURCE");
  });
});

describe("4 Track isolation", () => {
  it("generates each track from its own base memberId and does not H/V/RPI-copy derived", () => {
    const four = generateFourTrackMembers({
      balls: collinearBalls(20),
      entry: authoredEntry({ hpT: { ...canonicalHpt, T: "-3/8" } }),
    });
    if (!four.ok) throw new Error(four.reason);

    const sources = four.set.members.map((member) => ({
      balls: member.balls,
      targetBall: member.targetBall,
      entry: member.entry,
    }));
    const result = generateCueImpactDerivedMembersForTracks(sources);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const base of four.set.members) {
      const derived = result.bySourceMemberId?.[base.entry.memberId ?? ""];
      expect(derived && derived.length > 0).toBe(true);
      for (const row of derived ?? []) {
        expect(row.generatedFromMemberId).toBe(base.entry.memberId);
        expect(row.track).toBe(base.track);
        expect(row.familyId).toBe("fm_family1");
        expect(row.symmetryOp).toBeUndefined();
        expect(row.memberOrigin).toBe("DERIVED_CUE_IMPACT");
      }
    }

    const authoredId = four.set.authored.entry.memberId;
    const hId = four.set.symmetry.H.entry.memberId;
    const hSource = four.set.symmetry.H;
    const hDerived = result.bySourceMemberId?.[hId ?? ""] ?? [];
    expect(hDerived[0].generatedFromMemberId).toBe(hId);
    expect(hDerived[0].track).toBe("B2T_R");
    const hImpact = calcImpactBall(hSource.balls.cue, hSource.balls.target, "+3/8");
    expect(hImpact).toBeTruthy();
    if (!hImpact) return;
    const sample = hDerived[0].balls.cue;
    const cross =
      (sample.x - hSource.balls.cue.x) * (hImpact.y - hSource.balls.cue.y) -
      (sample.y - hSource.balls.cue.y) * (hImpact.x - hSource.balls.cue.x);
    expect(Math.abs(cross)).toBeLessThan(1e-9);
    expect(authoredId).not.toBe(hId);
  });

  it.each(FAMILY_TRACKS)("keeps %s derived cue samples collinear with source C→I", (track) => {
    const four = generateFourTrackMembers({
      balls: collinearBalls(20),
      entry: authoredEntry({ hpT: { ...canonicalHpt, T: "-3/8" } }),
    });
    if (!four.ok) throw new Error(four.reason);
    const sources = four.set.members.map((member) => ({
      balls: member.balls,
      targetBall: member.targetBall,
      entry: member.entry,
    }));
    const result = generateCueImpactDerivedMembersForTracks(sources);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const base = four.set.members.find((m) => m.track === track);
    expect(base).toBeTruthy();
    if (!base) return;
    const runtimeT = hydrateFamilyMemberRuntimeThickness(base.entry) ?? "8/8";
    const impact = calcImpactBall(base.balls.cue, base.balls.target, runtimeT);
    expect(impact).toBeTruthy();
    if (!impact) return;
    const derived = result.members.filter((m) => m.track === track);
    expect(derived.length).toBeGreaterThan(0);
    for (const row of derived) {
      const cross =
        (impact.x - base.balls.cue.x) * (row.balls.cue.y - base.balls.cue.y) -
        (impact.y - base.balls.cue.y) * (row.balls.cue.x - base.balls.cue.x);
      expect(Math.abs(cross)).toBeLessThan(1e-9);
    }
  });
});

describe("writer integration", () => {
  it("rejects derived whose generatedFromMemberId is missing from family+dataset", () => {
    const orphan = generateCueImpactDerivedMembers({
      sourceMember: { balls: collinearBalls(20), entry: authoredEntry() },
    });
    if (!orphan.ok) throw new Error(orphan.reason);
    const result = writeFamilyMembers([], {
      familyId: "fm_family1",
      members: orphan.members,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_PROVENANCE");
    expect(result.dataset).toEqual([]);
  });

  it("accepts derived when the source Track Member is already persisted", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: collinearBalls(20),
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const authored = reconstructFamilyMembers(written.dataset, "fm_family1").find(
      (row) => row.entry.memberOrigin === "AUTHORED"
    );
    expect(authored).toBeTruthy();
    const derived = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: authored?.balls ?? collinearBalls(20),
        entry: authored?.entry ?? authoredEntry(),
      },
    });
    if (!derived.ok) throw new Error(derived.reason);
    const result = writeFamilyMembers(written.dataset, {
      familyId: "fm_family1",
      members: derived.members,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      reconstructFamilyMembers(result.dataset, "fm_family1").some(
        (row) => row.entry.memberOrigin === "DERIVED_CUE_IMPACT"
      )
    ).toBe(true);
  });

  it("fails preflight with zero mutation on duplicate logical identity", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: collinearBalls(20),
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const authored = reconstructFamilyMembers(written.dataset, "fm_family1").find(
      (row) => row.entry.memberOrigin === "AUTHORED"
    );
    if (!authored) throw new Error("missing authored");
    const derived = generateCueImpactDerivedMembers({
      sourceMember: { balls: authored.balls, entry: authored.entry },
    });
    if (!derived.ok) throw new Error(derived.reason);
    const doubled = [...derived.members, { ...derived.members[0], memberId: "mb_dup_step" }];
    const before = structuredClone(written.dataset);
    const preflight = preflightFamilyMemberWrite(written.dataset, {
      familyId: "fm_family1",
      members: doubled,
    });
    expect(preflight.ok).toBe(false);
    const result = writeFamilyMembers(written.dataset, {
      familyId: "fm_family1",
      members: doubled,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("DUPLICATE_LOGICAL_IDENTITY");
    expect(result.dataset).toEqual(before);
  });

  it("keeps PositionKey separate from member identity", () => {
    const balls = collinearBalls(20);
    const generated = generateCueImpactDerivedMembers({
      sourceMember: { balls, entry: authoredEntry() },
    });
    if (!generated.ok) throw new Error(generated.reason);
    const positionKey = createFamilyPositionKey("B2T_L", generated.members[0].balls);
    const identity = genericFamilyMemberIdentityKey(
      resolveGenericFamilyMemberIdentity(generated.members[0])
    );
    expect(positionKey).not.toBe(identity);
    expect(identity).toContain("rule:CUE_IMPACT_FIRST_30PCT");
    expect(identity).toContain("step:cue_impact:t:0.100000");
    expect(identity).not.toContain(createPositionId(generated.members[0].balls));
    const laterKey = createFamilyPositionKey("B2T_L", generated.members[1].balls);
    expect(laterKey).not.toBe(positionKey);
  });
});

describe("Physical Target resolution (Phase 5 Role)", () => {
  it("CASE B targetBall=yellow uses balls.target", () => {
    const balls = collinearBalls(20);
    const result = generateCueImpactDerivedMembers({
      sourceMember: { balls, targetBall: "yellow", entry: authoredEntry() },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const impact = calcImpactBall(balls.cue, balls.target, "8/8");
    expect(impact).toBeTruthy();
    if (!impact) return;
    for (const m of result.members) {
      const cross =
        (impact.x - balls.cue.x) * (m.balls.cue.y - balls.cue.y) -
        (impact.y - balls.cue.y) * (m.balls.cue.x - balls.cue.x);
      expect(Math.abs(cross)).toBeLessThan(1e-9);
      expect(m.balls.target).toEqual(balls.target);
      expect(m.balls.second).toEqual(balls.second);
    }
  });

  it("CASE A targetBall=red uses balls.target (Role field, not second)", () => {
    // Role Ball3: physical red Target @ balls.target; yellow Second @ balls.second
    const balls: Ball3 = {
      cue: { x: 8, y: 16 },
      target: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
      second: { x: 62, y: 12 },
    };
    expect(resolvePhysicalTarget(balls, "red")).toEqual(balls.target);
    expect(resolvePhysicalTarget(balls, "red")).not.toEqual(balls.second);

    const result = generateCueImpactDerivedMembers({
      sourceMember: { balls, targetBall: "red", entry: authoredEntry() },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const redImpact = calcImpactBall(balls.cue, balls.target, "8/8");
    expect(redImpact).toBeTruthy();
    if (!redImpact) return;
    for (const m of result.members) {
      const cross =
        (redImpact.x - balls.cue.x) * (m.balls.cue.y - balls.cue.y) -
        (redImpact.y - balls.cue.y) * (m.balls.cue.x - balls.cue.x);
      expect(Math.abs(cross)).toBeLessThan(1e-9);
      expect(m.balls.target).toEqual(balls.target);
      expect(m.balls.second).toEqual(balls.second);
      expect(m.balls.cue).not.toEqual(balls.cue);
    }
    // targetColor must not select second field
    const wrongImpact = calcImpactBall(balls.cue, balls.second, "8/8");
    if (wrongImpact && redImpact) {
      expect(
        Math.hypot(wrongImpact.x - redImpact.x, wrongImpact.y - redImpact.y)
      ).toBeGreaterThan(0.1);
    }
  });

  it("defaults to balls.target when targetBall is undefined", () => {
    const balls = collinearBalls(20);
    const result = generateCueImpactDerivedMembers({
      sourceMember: { balls, entry: authoredEntry() },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const impact = calcImpactBall(balls.cue, balls.target, "8/8");
    expect(impact).toBeTruthy();
    if (!impact) return;
    for (const m of result.members) {
      const cross =
        (impact.x - balls.cue.x) * (m.balls.cue.y - balls.cue.y) -
        (impact.y - balls.cue.y) * (m.balls.cue.x - balls.cue.x);
      expect(Math.abs(cross)).toBeLessThan(1e-9);
    }
  });

  it("D — targetColor/targetBall is not a field selector", () => {
    const roleA: Ball3 = {
      cue: { x: 8, y: 16 },
      target: { x: 30, y: 16 },
      second: { x: 62, y: 12 },
    };
    expect(resolvePhysicalTarget(roleA, "red")).toEqual(roleA.target);
    expect(resolvePhysicalTarget(roleA, "yellow")).toEqual(roleA.target);
    expect(resolvePhysicalTarget(roleA, null)).toEqual(roleA.target);
  });
});

describe("C3+ and SAVE isolation", () => {
  it("does not implement C3_PLUS_2RG generation", () => {
    expect(CUE_IMPACT_DERIVED_RULE).toBe("CUE_IMPACT_FIRST_30PCT");
    expect(CUE_IMPACT_DERIVED_RULE).not.toBe("C3_PLUS_2RG");
  });
});
