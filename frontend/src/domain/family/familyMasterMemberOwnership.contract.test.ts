/**
 * Family MASTER / MEMBER Ownership SSOT + Hydration Fidelity Contract
 * (ratified 2026-09-20).
 *
 * Run: npx vitest run src/domain/family/familyMasterMemberOwnership.contract.test.ts
 */
import { beforeAll, describe, expect, it } from "vitest";
import { calcImpactBall } from "../../data/system/calculator";
import { createPositionId } from "../positionId";
import type { Ball3, Point, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";
import {
  extractTemporaryCompatibilityPayload,
  projectFamilyMemberToCompatibilityEntry,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import {
  buildCueC3ProductMembers,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "./buildCueC3ProductMembers";
import type { CueImpactReviewFrozenSource } from "./cueImpactDerivedReview";
import {
  familyCompatibilityFingerprint,
  hydrateFamilyMemberToPositionRecord,
  resolveHydratedStrategyMeta,
  splitPositionRecordToFamilyParts,
} from "./familyHydrate";
import { generateFourTrackMembers } from "./generateFourTrackMembers";
import {
  CUE_IMPACT_MEMBER_ORIGIN,
  generateCueImpactDerivedMembers,
} from "./generateCueImpactDerivedMembers";
import {
  C3_PLUS_MEMBER_ORIGIN,
  generateC3PlusScoringDerivedMembers,
} from "./generateC3PlusScoringDerivedMembers";
import { resolveFamilyHpt } from "./hptResolver";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  memberHasForbiddenCommonPayload,
  type FamilyMaster,
  type FamilyMember,
} from "./familyNormalizedSchema";
import { normalizeFamilyMember } from "./familyNormalizedStore";
import {
  familyMasterCommonPayloadFingerprint,
  migratePositionRecordsToFamilyParts,
} from "./migratePositionRecordsToFamilyParts";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";
import { rebuildCanonicalMemberMeta } from "./rebuildCanonicalMemberMeta";
import { FAMILY_TRACKS, type FamilyTrack } from "./trackSymmetry";

beforeAll(() => {
  bindDomainContractSupply({
    getFormulaExpr: () => "C1_f = CO_f - C3_r",
    getFormulaHash: () => "h1",
    getAnchorsData: () => undefined,
  });
});

const CORRECTIONS = {
  slide: 1.5,
  curve_ratio: 0,
  draw: 0,
  departure: 0,
  spin: 0,
  signMode: "authored" as const,
};

const canonicalHpt = {
  T: "-5/8",
  hit_point: { x: -1.5, y: 2 },
  mode: "TIP",
  tipCount: 1,
};

const authoredBalls: Ball3 = {
  cue: { x: 12, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 14 },
};

function commonPayload(entry: StrategyEntry) {
  return {
    signature: entry.signature,
    sysInputs: entry.sysInputs,
    corrections: entry.corrections ?? null,
    correctionsStored:
      entry.correctionsStored === undefined ? null : !!entry.correctionsStored,
    ai: entry.ai === undefined ? null : entry.ai,
    str: entry.str === undefined ? null : entry.str,
    hpT: entry.hpT === undefined ? null : entry.hpT,
  };
}

function authoredEntry(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    corrections: { ...CORRECTIONS },
    correctionsStored: true,
    ai: { text: "", onePointLessons: [{ id: "l1", text: "lesson" }] },
    str: { speed: 2.5, depth: 2 },
    hpT: canonicalHpt,
    familyId: "fm_own_1",
    memberId: "mb_own_authored",
    memberOrigin: "AUTHORED",
    authoringStrategyId: "as_own_1",
    track: "B2T_L",
    meta: {
      impact: { x: 99, y: 99 },
      final: { x: 88, y: 88 },
      angle_ci: 9,
      angle_fs: 9,
    },
    ...overrides,
  };
}

function authoredRecord(slot: StrategyEntry["slot"] = "S1"): PositionRecord {
  const entry = authoredEntry({ slot });
  return {
    positionId: createPositionId(authoredBalls),
    balls: authoredBalls,
    targetBall: "red",
    strategies: { [slot]: entry },
    schemaVersion: 2,
  };
}

function isPlaceholderShape(meta: StrategyEntry["meta"], balls: Ball3): boolean {
  return (
    meta.impact?.x === balls.cue.x &&
    meta.impact?.y === balls.cue.y &&
    meta.final?.x === balls.second.x &&
    meta.final?.y === balls.second.y &&
    meta.angle_ci === 0 &&
    meta.angle_fs === 0
  );
}

function expectMetaMatchesBuilder(
  meta: StrategyEntry["meta"],
  balls: Ball3,
  master: Pick<FamilyMaster, "signature" | "sysInputs" | "hpT">,
  track: string,
  slot: StrategyEntry["slot"] = "S1"
) {
  const expected = rebuildCanonicalMemberMeta({
    balls,
    signature: master.signature,
    sysInputs: { ...master.sysInputs },
    slot,
    track,
    hpT:
      master.hpT && typeof master.hpT === "object" && typeof (master.hpT as { T?: unknown }).T === "string"
        ? { T: (master.hpT as { T: string }).T }
        : undefined,
  });
  expect(meta.impact.x).toBeCloseTo(expected.impact.x, 8);
  expect(meta.impact.y).toBeCloseTo(expected.impact.y, 8);
  expect(meta.final.x).toBeCloseTo(expected.final.x, 8);
  expect(meta.final.y).toBeCloseTo(expected.final.y, 8);
  expect(meta.angle_ci).toBeCloseTo(expected.angle_ci, 10);
  expect(meta.angle_fs).toBeCloseTo(expected.angle_fs, 10);
  const impact = calcImpactBall(
    balls.cue,
    balls.target,
    typeof (master.hpT as { T?: string } | undefined)?.T === "string"
      ? (master.hpT as { T: string }).T
      : "8/8"
  );
  expect(impact).toBeTruthy();
  expect(meta.impact.x).toBeCloseTo(impact!.x, 5);
  expect(meta.impact.y).toBeCloseTo(impact!.y, 5);
  expect(isPlaceholderShape(meta, balls)).toBe(false);
}

describe("CASE 1–2 FamilyMaster / FamilyMember ownership", () => {
  it("CASE 1: FamilyMaster owns common strategy payload keys", () => {
    expect([...FAMILY_MASTER_COMMON_FIELD_KEYS]).toEqual([
      "signature",
      "sysInputs",
      "corrections",
      "correctionsStored",
      "ai",
      "str",
      "hpT",
    ]);
    const split = splitPositionRecordToFamilyParts(authoredRecord(), "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
      expect(split.master).toHaveProperty(key);
    }
    expect(split.master.familyId).toBe("fm_own_1");
    expect((split.master.hpT as { T: string }).T).toBe("-5/8");
  });

  it("CASE 2: FamilyMember forbids authoritative common payload", () => {
    const split = splitPositionRecordToFamilyParts(authoredRecord(), "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(
      memberHasForbiddenCommonPayload(
        split.member as unknown as Record<string, unknown>
      )
    ).toBe(false);
    const dirty = {
      ...split.member,
      signature: split.master.signature,
      sysInputs: split.master.sysInputs,
    };
    expect(memberHasForbiddenCommonPayload(dirty)).toBe(true);
    const rejected = normalizeFamilyMember(dirty as unknown as FamilyMember);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe("FORBIDDEN_COMMON_PAYLOAD");
  });
});

describe("CASE 3–6 common payload identical across member origins", () => {
  it("CASE 3: AUTHORED → SYMMETRY common payload identical", () => {
    const gen = generateFourTrackMembers({
      balls: authoredBalls,
      targetBall: "red",
      entry: authoredEntry(),
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    const seed = commonPayload(gen.set.authored.entry);
    for (const m of gen.set.members) {
      expect(commonPayload(m.entry)).toEqual(seed);
    }
    expect(gen.set.symmetry.H.entry.memberOrigin).toBe("SYMMETRY");
    expect(gen.set.symmetry.H.balls).not.toEqual(authoredBalls);
    expect(gen.set.symmetry.H.track).not.toBe("B2T_L");
  });

  it("CASE 4: AUTHORED → DERIVED_CUE_IMPACT common payload identical", () => {
    const derived = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: authoredBalls,
        targetBall: "red",
        entry: authoredEntry(),
      },
    });
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    expect(derived.members.length).toBeGreaterThan(0);
    const seed = commonPayload(authoredEntry());
    for (const m of derived.members) {
      expect(m.memberOrigin).toBe(CUE_IMPACT_MEMBER_ORIGIN);
      const projected = projectFamilyMemberToCompatibilityEntry(m, "S1");
      expect(commonPayload(projected)).toEqual(seed);
    }
  });

  it("CASE 5: AUTHORED → DERIVED_C3_PLUS common payload identical", () => {
    const pathNodes: Array<Point | null> = [
      { x: 10, y: 0 },
      { x: 40, y: 40 },
      { x: 80, y: 20 },
      { x: 0, y: 20 }, // C3 LEFT
      { x: 80, y: 20 }, // C4 RIGHT — SB at (40,20) hits this segment
      null,
      null,
    ];
    const c3Balls: Ball3 = {
      cue: { x: 12, y: 10 },
      target: { x: 40, y: 20 },
      second: { x: 40, y: 20 },
    };
    const derived = generateC3PlusScoringDerivedMembers({
      sourceMember: {
        balls: c3Balls,
        targetBall: "red",
        entry: authoredEntry({
          trajectoryExtensions: {
            extensionSchemaVersion: 1,
            origin: { kind: "path_node", source: "corrected" },
            items: [
              {
                id: "EXT-S1-01",
                index: 1,
                endpoint: { x: 80, y: 0 },
                userEdited: true,
                createdAt: "t0",
                updatedAt: "t0",
              },
            ],
          },
        }),
      },
      pathNodes,
      hitTolerance: resolveTrajectoryHitTolerance(),
    });
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    expect(derived.members.length).toBeGreaterThan(0);
    const seed = commonPayload(authoredEntry());
    for (const m of derived.members) {
      expect(m.memberOrigin).toBe(C3_PLUS_MEMBER_ORIGIN);
      const projected = projectFamilyMemberToCompatibilityEntry(m, "S1");
      expect(commonPayload(projected)).toEqual(seed);
    }
  });

  it("CASE 6: AUTHORED → DERIVED_CUE_C3_PRODUCT common payload identical", () => {
    const seedEntry = authoredEntry({
      familyId: "fm_prod_own",
      memberId: "mb_B2T_L",
      hpT: { T: "8/8", hit_point: { x: -1, y: 1 }, mode: "TIP", tipCount: 1 },
    });
    const seedCompat = extractTemporaryCompatibilityPayload(seedEntry);
    const frozen: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> = {};
    const cueMembers: LogicalFamilyMemberCandidate[] = [];
    const c3Members: LogicalFamilyMemberCandidate[] = [];
    for (const track of FAMILY_TRACKS) {
      const dx = FAMILY_TRACKS.indexOf(track) * 6;
      const balls: Ball3 = {
        cue: { x: 10 + dx, y: 16 },
        target: { x: 40 + dx, y: 16 },
        second: { x: 20 + dx, y: 8 },
      };
      const memberId = `mb_${track}`;
      frozen[track] = {
        track,
        memberId,
        balls,
        entry: {
          ...seedEntry,
          track,
          memberId,
          memberOrigin: track === "B2T_L" ? "AUTHORED" : "SYMMETRY",
          ...(track !== "B2T_L"
            ? {
                generatedFromMemberId: "mb_B2T_L",
                symmetryOp: "H" as const,
              }
            : {}),
        },
        runtimeT: "8/8",
      };
      cueMembers.push({
        familyId: "fm_prod_own",
        memberId: `mb_cue_${track}`,
        memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
        generatedFromMemberId: memberId,
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "cue_impact:t:0.100000",
        authoringStrategyId: `as_cue_${track}`,
        track,
        balls: {
          cue: { x: 11 + dx, y: 16 },
          target: balls.target,
          second: balls.second,
        },
        compatibility: seedCompat,
      });
      c3Members.push({
        familyId: "fm_prod_own",
        memberId: `mb_c3_${track}`,
        memberOrigin: C3_PLUS_MEMBER_ORIGIN,
        generatedFromMemberId: memberId,
        derivedRule: "C3_PLUS_SCORING_LINE_v1",
        derivedStep: "c3plus:v:C4",
        authoringStrategyId: `as_c3_${track}`,
        track,
        balls: {
          cue: { x: 50 + dx, y: 20 },
          target: balls.target,
          second: balls.second,
        },
        compatibility: seedCompat,
        trajectoryExtensions: seedEntry.trajectoryExtensions,
      });
    }
    const product = buildCueC3ProductMembers({
      familyId: "fm_prod_own",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozen,
    });
    expect(product.ok).toBe(true);
    if (!product.ok) return;
    expect(product.members.length).toBeGreaterThan(0);
    const seed = {
      signature: seedCompat.signature,
      sysInputs: seedCompat.sysInputs,
      corrections: seedCompat.corrections ?? null,
      correctionsStored:
        seedCompat.correctionsStored === undefined
          ? null
          : !!seedCompat.correctionsStored,
      ai: seedCompat.ai === undefined ? null : seedCompat.ai,
      str: seedCompat.str === undefined ? null : seedCompat.str,
      hpT: seedCompat.hpT === undefined ? null : seedCompat.hpT,
    };
    // Product set includes cue-marginal + c3-marginal + cross-product rows;
    // all share the same Family-common compatibility payload from frozen base.
    const cross = product.members.filter(
      (m) => m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    );
    expect(cross.length).toBeGreaterThan(0);
    for (const m of product.members) {
      const projected = projectFamilyMemberToCompatibilityEntry(m, "S1");
      expect(commonPayload(projected)).toEqual(seed);
    }
  });
});

describe("CASE 7–11 Member identity / packing", () => {
  it("CASE 7–8: SYMMETRY differs geometry/track/provenance; same familyId + common payload", () => {
    const gen = generateFourTrackMembers({
      balls: authoredBalls,
      targetBall: "red",
      entry: authoredEntry(),
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    const a = gen.set.authored;
    const h = gen.set.symmetry.H;
    expect(a.entry.familyId).toBe(h.entry.familyId);
    expect(a.entry.memberId).not.toBe(h.entry.memberId);
    expect(a.positionId).not.toBe(h.positionId);
    expect(a.track).not.toBe(h.track);
    expect(h.entry.memberOrigin).toBe("SYMMETRY");
    expect(h.entry.symmetryOp).toBe("H");
    expect(commonPayload(a.entry)).toEqual(commonPayload(h.entry));
  });

  it("CASE 9: Derived differs coordinates/provenance; same common strategy", () => {
    const derived = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: authoredBalls,
        targetBall: "red",
        entry: authoredEntry(),
      },
    });
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    const m = derived.members[0]!;
    expect(m.familyId).toBe("fm_own_1");
    expect(m.memberId).not.toBe("mb_own_authored");
    expect(m.balls.cue).not.toEqual(authoredBalls.cue);
    expect(m.generatedFromMemberId).toBe("mb_own_authored");
    expect(m.compatibility.sysInputs).toEqual(authoredEntry().sysInputs);
    expect(m.compatibility.hpT).toEqual(canonicalHpt);
  });

  it("CASE 10: sourceSlot survives migrate → rematerialize", () => {
    const rec = authoredRecord("S2");
    const migrated = migratePositionRecordsToFamilyParts([rec]);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.members[0]?.sourceSlot).toBe("S2");
    const remat = rematerializeFamilyPartsToPositionRecords({
      masters: migrated.masters,
      members: migrated.members,
    });
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    expect(remat.dataset[0]?.strategies.S2?.memberId).toBe("mb_own_authored");
    expect(remat.dataset[0]?.strategies.S1).toBeUndefined();
  });

  it("CASE 11: targetBall color does not alter Position identity", () => {
    const red = { ...authoredRecord(), targetBall: "red" as const };
    const yellow = { ...authoredRecord(), targetBall: "yellow" as const };
    expect(createPositionId(red.balls)).toBe(createPositionId(yellow.balls));
    expect(red.positionId).toBe(yellow.positionId);
  });
});

describe("CASE 12–15 HPT / thickness", () => {
  it("CASE 12–13: canonical hpT on Master; forbidden on Member", () => {
    const split = splitPositionRecordToFamilyParts(authoredRecord(), "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(split.master.hpT).toEqual(canonicalHpt);
    expect(
      Object.prototype.hasOwnProperty.call(split.member, "hpT")
    ).toBe(false);
  });

  it("CASE 14–15: opposite-hand HPT is runtime projection; not a new persisted canonical", () => {
    const mirrored = resolveFamilyHpt({
      authoredTrack: "B2T_L",
      requestedTrack: "B2T_R",
      canonicalHpt,
    });
    expect(mirrored.mirrored).toBe(true);
    expect((mirrored.hpt as { T: string }).T).toBe("+5/8");
    // Stored Master remains canonical left T
    const split = splitPositionRecordToFamilyParts(authoredRecord(), "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect((split.master.hpT as { T: string }).T).toBe("-5/8");
  });
});

describe("CASE 16–21 meta hydration fidelity", () => {
  it("CASE 16: AUTHORED hydrate meta matches rebuildCanonicalMemberMeta", () => {
    const split = splitPositionRecordToFamilyParts(authoredRecord(), "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    const hydrated = hydrateFamilyMemberToPositionRecord(
      split.master,
      split.member
    );
    const meta = hydrated.strategies.S1!.meta;
    expectMetaMatchesBuilder(meta, authoredBalls, split.master, "B2T_L", "S1");
  });

  it("CASE 17: SYMMETRY hydrate meta matches Member geometry builder", () => {
    const gen = generateFourTrackMembers({
      balls: authoredBalls,
      targetBall: "red",
      entry: authoredEntry(),
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    const h = gen.set.symmetry.H;
    const split = splitPositionRecordToFamilyParts(
      {
        positionId: h.positionId,
        balls: h.balls,
        targetBall: "red",
        strategies: { S1: h.entry },
        schemaVersion: 2,
      },
      "S1"
    );
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    const hydrated = hydrateFamilyMemberToPositionRecord(
      split.master,
      split.member
    );
    expectMetaMatchesBuilder(
      hydrated.strategies.S1!.meta,
      h.balls,
      split.master,
      h.track,
      "S1"
    );
  });

  it("CASE 18–20: Derived / Product hydrate meta matches builder", () => {
    const derived = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: authoredBalls,
        targetBall: "red",
        entry: authoredEntry(),
      },
    });
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    const cand = derived.members[0]!;
    const master: FamilyMaster = {
      schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
      familyId: cand.familyId,
      signature: cand.compatibility.signature,
      sysInputs: { ...cand.compatibility.sysInputs },
      corrections: cand.compatibility.corrections,
      correctionsStored: cand.compatibility.correctionsStored,
      ai: cand.compatibility.ai,
      str: cand.compatibility.str,
      hpT: cand.compatibility.hpT,
    };
    const member: FamilyMember = {
      schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
      memberId: cand.memberId,
      familyId: cand.familyId,
      balls: cand.balls,
      track: cand.track,
      memberOrigin: cand.memberOrigin,
      sourceSlot: "S1",
      generatedFromMemberId: cand.generatedFromMemberId,
      derivedRule: cand.derivedRule,
      derivedStep: cand.derivedStep,
      authoringStrategyId: cand.authoringStrategyId,
    };
    const hydrated = hydrateFamilyMemberToPositionRecord(master, member);
    expectMetaMatchesBuilder(
      hydrated.strategies.S1!.meta,
      cand.balls,
      master,
      cand.track,
      "S1"
    );
  });

  it("CASE 21: hydrated StrategyEntry must not expose placeholderMeta as final", () => {
    const split = splitPositionRecordToFamilyParts(authoredRecord(), "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    const meta = resolveHydratedStrategyMeta(split.master, split.member, "S1");
    expect(isPlaceholderShape(meta, authoredBalls)).toBe(false);
    expectMetaMatchesBuilder(meta, authoredBalls, split.master, "B2T_L", "S1");
  });
});

describe("Round-trip + COMMON_PAYLOAD_CONFLICT", () => {
  it("flat → migrate → rematerialize preserves strategy + identity; meta rebuilt", () => {
    const original = authoredRecord("S1");
    // Put canonical meta on flat so fingerprint common fields match
    original.strategies.S1!.meta = rebuildCanonicalMemberMeta({
      balls: authoredBalls,
      signature: original.strategies.S1!.signature,
      sysInputs: original.strategies.S1!.sysInputs,
      slot: "S1",
      track: "B2T_L",
      hpT: { T: "-5/8" },
    });
    const migrated = migratePositionRecordsToFamilyParts([original]);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const remat = rematerializeFamilyPartsToPositionRecords({
      masters: migrated.masters,
      members: migrated.members,
    });
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    const out = remat.dataset[0]!;
    expect(familyCompatibilityFingerprint(out, "S1")).toEqual(
      familyCompatibilityFingerprint(original, "S1")
    );
    expectMetaMatchesBuilder(
      out.strategies.S1!.meta,
      authoredBalls,
      migrated.masters[0]!,
      "B2T_L",
      "S1"
    );
  });

  it("same familyId with conflicting common payload fails closed", () => {
    const a = authoredRecord("S1");
    const b: PositionRecord = {
      positionId: createPositionId({
        cue: { x: 20, y: 10 },
        target: { x: 40, y: 20 },
        second: { x: 60, y: 14 },
      }),
      balls: {
        cue: { x: 20, y: 10 },
        target: { x: 40, y: 20 },
        second: { x: 60, y: 14 },
      },
      targetBall: "red",
      strategies: {
        S1: authoredEntry({
          memberId: "mb_conflict_sym",
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: "mb_own_authored",
          symmetryOp: "H",
          track: "B2T_R",
          corrections: { ...CORRECTIONS, slide: 99 },
        }),
      },
      schemaVersion: 2,
    };
    const migrated = migratePositionRecordsToFamilyParts([a, b]);
    expect(migrated.ok).toBe(false);
    if (migrated.ok) return;
    expect(
      migrated.issues.some((i) => i.code === "COMMON_PAYLOAD_CONFLICT")
    ).toBe(true);
  });

  it("familyMasterCommonPayloadFingerprint is stable for identical Master payload", () => {
    const split = splitPositionRecordToFamilyParts(authoredRecord(), "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(familyMasterCommonPayloadFingerprint(split.master)).toBe(
      familyMasterCommonPayloadFingerprint({
        signature: split.master.signature,
        sysInputs: split.master.sysInputs,
        corrections: split.master.corrections,
        correctionsStored: split.master.correctionsStored,
        ai: split.master.ai,
        str: split.master.str,
        hpT: split.master.hpT,
      })
    );
  });
});
