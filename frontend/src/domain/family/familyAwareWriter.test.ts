/**
 * Phase 2B — family-aware writer: collision, idempotency, preflight, persistence.
 * Run: npx vitest run src/domain/family/familyAwareWriter.test.ts
 */

import { describe, expect, it } from "vitest";
import { normalizeDatasetFromStorage } from "../positionMergeEngine";
import { mergePublishedRecords } from "../datasetExportMerge";
import { createPositionId } from "../positionId";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { runSpatialRecall } from "../recall/recallEngine";
import { projectKnot } from "../realInterpolation/knotCorpus";
import {
  familyWriteCandidateFromEntry,
  projectFamilyMemberToCompatibilityEntry,
  preflightFamilyMemberWrite,
  reconstructFamilyMembers,
  writeFamilyMembers,
  writeFourTrackFamilyMembers,
} from "./familyAwareWriter";
import { generateFourTrackMembers } from "./generateFourTrackMembers";
import { resolveRuntimeHptForFamilyMember } from "./familyRuntimeProjection";
import { familySymmetryIdentity } from "./familyIdentity";
import { createFamilyPositionKey } from "./familyPositionKey";

const authoredBalls = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 },
  second: { x: 62, y: 12 },
};

const canonicalHpt = {
  T: "-3/8",
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
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function otherFamilyEntry(
  familyId: string,
  memberId: string,
  asid: string
): StrategyEntry {
  return authoredEntry({
    familyId,
    memberId,
    authoringStrategyId: asid,
    memberOrigin: "AUTHORED",
    track: "B2T_L",
  });
}

function candidateFromEntry(
  balls = authoredBalls,
  overrides: Partial<StrategyEntry> = {},
  targetBall: "yellow" | "red" | undefined = undefined
) {
  const candidate = familyWriteCandidateFromEntry({
    balls,
    ...(targetBall ? { targetBall } : {}),
    entry: authoredEntry(overrides),
  });
  if (!candidate) throw new Error("expected candidate");
  return candidate;
}

describe("family-aware writer persistence", () => {
  it("writes 4 PositionRecords reconstructable by familyId", () => {
    const result = writeFourTrackFamilyMembers([], {
      balls: authoredBalls,
      targetBall: "yellow",
      entry: authoredEntry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dataset).toHaveLength(4);
    const members = reconstructFamilyMembers(result.dataset, "fm_family1");
    expect(members).toHaveLength(4);
    expect(new Set(members.map((m) => m.entry.memberId)).size).toBe(4);
    expect(result.dataset.every((r) => r.targetBall === "yellow")).toBe(true);

    const loaded = normalizeDatasetFromStorage(JSON.parse(JSON.stringify(result.dataset)));
    expect(reconstructFamilyMembers(loaded, "fm_family1")).toHaveLength(4);
    expect(
      loaded.some((r) =>
        Object.values(r.strategies).some((e) => e?.symmetryOp === "H" && e.generatedFromMemberId === "mb_authored")
      )
    ).toBe(true);
  });

  it("is idempotent on generate + write twice", () => {
    const first = writeFourTrackFamilyMembers([], {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!first.ok) throw new Error(first.reason);
    const second = writeFourTrackFamilyMembers(first.dataset, {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!second.ok) throw new Error(second.reason);
    expect(second.dataset).toHaveLength(4);
    const ids1 = reconstructFamilyMembers(first.dataset, "fm_family1").map(
      (m) => `${familySymmetryIdentity(m.entry)}:${m.entry.memberId}`
    );
    const ids2 = reconstructFamilyMembers(second.dataset, "fm_family1").map(
      (m) => `${familySymmetryIdentity(m.entry)}:${m.entry.memberId}`
    );
    expect(ids2.sort()).toEqual(ids1.sort());
  });

  it("fills a missing V on a partial family", () => {
    const first = writeFourTrackFamilyMembers([], {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!first.ok) throw new Error(first.reason);
    const withoutV = first.dataset.filter((record) => {
      const entry = Object.values(record.strategies)[0];
      return entry?.symmetryOp !== "V";
    });
    expect(reconstructFamilyMembers(withoutV, "fm_family1")).toHaveLength(3);
    const second = writeFourTrackFamilyMembers(withoutV, {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!second.ok) throw new Error(second.reason);
    const members = reconstructFamilyMembers(second.dataset, "fm_family1");
    expect(members).toHaveLength(4);
    expect(members.some((m) => m.entry.symmetryOp === "V")).toBe(true);
    const authored = members.find((m) => familySymmetryIdentity(m.entry) === "IDENTITY");
    const h = members.find((m) => m.entry.symmetryOp === "H");
    expect(authored?.entry.memberId).toBe("mb_authored");
    expect(h?.entry.memberId).toBe(
      reconstructFamilyMembers(first.dataset, "fm_family1").find(
        (m) => m.entry.symmetryOp === "H"
      )?.entry.memberId
    );
  });
});

describe("cross-Family collision", () => {
  it("preserves Family A when Family B shares Exact coordinates", () => {
    const familyA = writeFourTrackFamilyMembers([], {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!familyA.ok) throw new Error(familyA.reason);
    const aH = familyA.set.symmetry.H;
    const familyB = writeFourTrackFamilyMembers(familyA.dataset, {
      balls: aH.balls,
      targetBall: "yellow",
      entry: authoredEntry({
        familyId: "fm_familyB",
        memberId: "mb_b_authored",
        authoringStrategyId: "as_b",
        track: "B2T_R",
      }),
    });
    expect(familyB.ok).toBe(true);
    if (!familyB.ok) return;

    const aMembers = reconstructFamilyMembers(familyB.dataset, "fm_family1");
    const bMembers = reconstructFamilyMembers(familyB.dataset, "fm_familyB");
    expect(aMembers).toHaveLength(4);
    expect(bMembers).toHaveLength(4);

    const shared = familyB.dataset.filter(
      (record) => createPositionId(record.balls) === aH.positionId
    );
    expect(shared).toHaveLength(1);
    const slots = Object.values(shared[0].strategies);
    const families = new Set(slots.map((e) => e?.familyId));
    expect(families.has("fm_family1")).toBe(true);
    expect(families.has("fm_familyB")).toBe(true);
    expect(shared[0].strategies.S1?.familyId).toBe("fm_family1");
  });

  it("fails closed when S1–S3 are occupied by unrelated Families", () => {
    const p = authoredBalls;
    const occupied: PositionRecord = {
      positionId: createPositionId(p),
      balls: p,
      strategies: {
        S1: otherFamilyEntry("fm_x", "mb_x", "as_x"),
        S2: otherFamilyEntry("fm_y", "mb_y", "as_y"),
        S3: otherFamilyEntry("fm_z", "mb_z", "as_z"),
      },
      schemaVersion: 1,
    };
    const result = writeFourTrackFamilyMembers([occupied], {
      balls: p,
      entry: authoredEntry(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("SLOT_CAPACITY");
    expect(result.dataset).toHaveLength(1);
    expect(result.dataset[0].strategies.S1?.familyId).toBe("fm_x");
    expect(result.dataset[0].strategies.S2?.familyId).toBe("fm_y");
    expect(result.dataset[0].strategies.S3?.familyId).toBe("fm_z");
    expect(reconstructFamilyMembers(result.dataset, "fm_family1")).toHaveLength(0);
  });
});

describe("legacy + consumer preservation", () => {
  it("does not convert a legacy record into a Family", () => {
    const legacy: PositionRecord = {
      positionId: createPositionId(authoredBalls),
      balls: authoredBalls,
      strategies: {
        S1: {
          slot: "S1",
          signature: {
            systemId: "5_half_system",
            formulaHash: "h1",
            shotType: "뒤돌리기",
          },
          sysInputs: { CO_f: 1 },
          meta: {
            impact: { x: 1, y: 1 },
            final: { x: 2, y: 2 },
            angle_ci: 0,
            angle_fs: 0,
          },
        },
      },
    };
    const generated = generateFourTrackMembers({
      balls: authoredBalls,
      entry: legacy.strategies.S1 as StrategyEntry,
    });
    expect(generated.ok).toBe(false);

    const family = writeFourTrackFamilyMembers([legacy], {
      balls: {
        cue: { x: 11, y: 8 },
        target: { x: 41, y: 20 },
        second: { x: 63, y: 12 },
      },
      entry: authoredEntry(),
    });
    if (!family.ok) throw new Error(family.reason);
    const stillLegacy = family.dataset.find(
      (r) => r.positionId === legacy.positionId
    );
    expect(stillLegacy?.strategies.S1?.familyId).toBeUndefined();
    expect(runSpatialRecall({
      dataset: family.dataset,
      query: { balls: authoredBalls },
      profile: "userStrict",
    }).kind).toBe("match");
  });

  it("keeps RI authoringStrategyId gates distinct within a Family", () => {
    const result = writeFourTrackFamilyMembers([], {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!result.ok) throw new Error(result.reason);
    const knots = result.dataset.map((record) => {
      const slot = (Object.keys(record.strategies)[0] ?? "S1") as "S1" | "S2" | "S3";
      return projectKnot(record, slot);
    });
    const asids = knots.map((k) => k?.authoringStrategyId);
    expect(new Set(asids).size).toBe(4);
    expect(asids.every((id) => id && id !== "fm_family1")).toBe(true);
  });

  it("export merge still keys by positionId + slot, not Family", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const merged = mergePublishedRecords([], written.dataset);
    expect(merged).toHaveLength(4);
    expect(reconstructFamilyMembers(merged, "fm_family1")).toHaveLength(4);
  });

  it("runtime HPT resolver reads AUTHORED canonical, not persisted mirror", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const h = reconstructFamilyMembers(written.dataset, "fm_family1").find(
      (m) => m.entry.symmetryOp === "H"
    );
    expect(h?.entry.hpT).toEqual(canonicalHpt);
    const runtime = resolveRuntimeHptForFamilyMember({
      dataset: written.dataset,
      familyId: "fm_family1",
      requestedTrack: "B2T_R",
    });
    expect(runtime?.mirrored).toBe(true);
    expect((runtime?.hpt as { T: string }).T).toBe("+3/8");
  });
});

describe("generic family writer", () => {
  it("handles arbitrary candidate count without assuming four symmetry members", () => {
    const base = candidateFromEntry(authoredBalls, {
      familyId: "fm_generic",
      memberId: "mb_base",
      authoringStrategyId: "as_base",
    });
    const derived = candidateFromEntry(
      {
        cue: { x: 14, y: 8 },
        target: { x: 44, y: 20 },
        second: { x: 66, y: 12 },
      },
      {
        familyId: "fm_generic",
        memberId: "mb_d1",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_base",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
        track: "B2T_L",
        authoringStrategyId: "as_d1",
      }
    );
    const result = writeFamilyMembers([], {
      familyId: "fm_generic",
      members: [base, derived],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dataset).toHaveLength(2);
    expect(reconstructFamilyMembers(result.dataset, "fm_generic")).toHaveLength(2);
  });

  it("rejects duplicate logical identity even when coordinates differ", () => {
    const base = candidateFromEntry(authoredBalls, {
      familyId: "fm_dup",
      memberId: "mb_base",
      authoringStrategyId: "as_base",
    });
    const d1 = candidateFromEntry(
      {
        cue: { x: 14, y: 8 },
        target: { x: 44, y: 20 },
        second: { x: 66, y: 12 },
      },
      {
        familyId: "fm_dup",
        memberId: "mb_d1",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_base",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
        track: "B2T_L",
      }
    );
    const d2 = candidateFromEntry(
      {
        cue: { x: 15, y: 8 },
        target: { x: 45, y: 20 },
        second: { x: 67, y: 12 },
      },
      {
        familyId: "fm_dup",
        memberId: "mb_d2",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_base",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
        track: "B2T_L",
      }
    );
    const result = writeFamilyMembers([], {
      familyId: "fm_dup",
      members: [base, d1, d2],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("DUPLICATE_LOGICAL_IDENTITY");
    expect(result.dataset).toEqual([]);
  });

  it("fails preflight with zero mutation when capacity is exhausted", () => {
    const occupied: PositionRecord = {
      positionId: createPositionId(authoredBalls),
      balls: authoredBalls,
      strategies: {
        S1: otherFamilyEntry("fm_x", "mb_x", "as_x"),
        S2: otherFamilyEntry("fm_y", "mb_y", "as_y"),
        S3: otherFamilyEntry("fm_z", "mb_z", "as_z"),
      },
      schemaVersion: 1,
    };
    const candidate = candidateFromEntry(authoredBalls, {
      familyId: "fm_overflow",
      memberId: "mb_overflow",
      authoringStrategyId: "as_overflow",
    });
    const preflight = preflightFamilyMemberWrite([occupied], {
      familyId: "fm_overflow",
      members: [candidate],
    });
    expect(preflight.ok).toBe(false);
    const result = writeFamilyMembers([occupied], {
      familyId: "fm_overflow",
      members: [candidate],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("SLOT_CAPACITY");
    expect(result.dataset).toEqual([occupied]);
  });

  it("allows same PositionKey to hold unrelated Families without conflating member identity", () => {
    const familyA = candidateFromEntry(authoredBalls, {
      familyId: "fm_a",
      memberId: "mb_a",
      authoringStrategyId: "as_a",
    });
    const first = writeFamilyMembers([], { familyId: "fm_a", members: [familyA] });
    if (!first.ok) throw new Error(first.reason);

    const familyB = candidateFromEntry(authoredBalls, {
      familyId: "fm_b",
      memberId: "mb_b",
      authoringStrategyId: "as_b",
    });
    const second = writeFamilyMembers(first.dataset, {
      familyId: "fm_b",
      members: [familyB],
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const shared = second.dataset.find((record) => record.positionId === createPositionId(authoredBalls));
    expect(shared).toBeTruthy();
    const families = new Set(Object.values(shared?.strategies ?? {}).map((entry) => entry?.familyId));
    expect(families.has("fm_a")).toBe(true);
    expect(families.has("fm_b")).toBe(true);
    expect(createFamilyPositionKey("B2T_L", authoredBalls)).toBe(
      createFamilyPositionKey("B2T_L", authoredBalls)
    );
  });

  it("rejects invalid derived provenance in the generic writer", () => {
    const invalid = {
      familyId: "fm_bad",
      memberId: "mb_bad",
      memberOrigin: "DERIVED_CUE_IMPACT" as const,
      generatedFromMemberId: "mb_base",
      derivedRule: "CUE_IMPACT_FIRST_30PCT" as const,
      derivedStep: "step:0001",
      symmetryOp: "H" as const,
      authoringStrategyId: "as_bad",
      track: "B2T_L",
      balls: {
        cue: { x: 14, y: 8 },
        target: { x: 44, y: 20 },
        second: { x: 66, y: 12 },
      },
      compatibility: {
        signature: authoredEntry().signature,
        sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
      },
    };
    const result = writeFamilyMembers([], {
      familyId: "fm_bad",
      members: [invalid],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_PROVENANCE");
  });

  it("projects only temporary compatibility payload fields", () => {
    const candidate = candidateFromEntry(authoredBalls, {
      familyId: "fm_proj",
      memberId: "mb_proj",
      reflectionOverride: { rail: "TOP", t: 0.25 },
      trajectoryExtensions: {
        start: { x: 1, y: 1 },
        end: { x: 2, y: 2 },
      },
    });
    const projected = projectFamilyMemberToCompatibilityEntry(candidate, "S2");
    expect(projected.slot).toBe("S2");
    expect(projected.signature.systemId).toBe("5_half_system");
    expect(projected.sysInputs.CO_f).toBe(30);
    expect(projected.hpT).toEqual(canonicalHpt);
    expect(projected.reflectionOverride).toBeUndefined();
    expect(projected.trajectoryExtensions).toBeUndefined();
  });

  it("rejects derived when generatedFromMemberId is not a same-family Track base", () => {
    const derived = candidateFromEntry(
      {
        cue: { x: 14, y: 8 },
        target: { x: 44, y: 20 },
        second: { x: 66, y: 12 },
      },
      {
        familyId: "fm_orphan",
        memberId: "mb_d1",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: "mb_missing",
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "cue_impact:t:0.100000",
        track: "B2T_L",
        authoringStrategyId: "as_d1",
      }
    );
    const result = writeFamilyMembers([], {
      familyId: "fm_orphan",
      members: [derived],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_PROVENANCE");
    expect(result.dataset).toEqual([]);
  });
});
