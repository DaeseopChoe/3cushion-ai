/**
 * Phase F-3D — Published Family identity seed + OVERWRITE preservation guard (unit).
 * Run: npx vitest run src/domain/family/publishedFamilySeed.test.ts
 */
import { describe, expect, it } from "vitest";
import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import type { FamilyMemberLocation } from "./familyAwareWriter";
import type { FamilyMaster, FamilyMember } from "./familyNormalizedSchema";
import { checkOverwriteFamilyPreserved, type OverwriteRecallContext } from "./overwriteFamilyRoot";
import {
  capturePublishedFamilySnapshot,
  seedPublishedFamilyForOverwrite,
  type PublishedFamilySnapshot,
} from "./publishedFamilySeed";
import { transformBall3 } from "./trackSymmetry";

const FAMILY = "fm_seed_family";
const rootBalls: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 40, y: 20 }, second: { x: 60, y: 15 } };
const hBalls = transformBall3("H", rootBalls);
const derivedBalls: Ball3 = { ...hBalls, cue: { x: hBalls.cue.x - 4, y: hBalls.cue.y + 2 } };

const master: FamilyMaster = {
  schemaVersion: 1,
  familyId: FAMILY,
  signature: { systemId: "5_half_system", formulaHash: "h1", shotType: "옆돌리기" } as FamilyMaster["signature"],
  sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
  ai: { text: "원본" },
};

function member(overrides: Partial<FamilyMember>): FamilyMember {
  return {
    schemaVersion: 1,
    memberId: "mb_root",
    familyId: FAMILY,
    balls: rootBalls,
    targetBall: "red",
    track: "B2T_L",
    memberOrigin: "AUTHORED",
    sourceSlot: "S2",
    authoringStrategyId: "as_root",
    ...overrides,
  };
}

const members: FamilyMember[] = [
  member({}),
  member({
    memberId: "mb_h",
    balls: hBalls,
    track: "B2T_R",
    memberOrigin: "SYMMETRY",
    symmetryOp: "H",
    generatedFromMemberId: "mb_root",
    authoringStrategyId: "as_h",
  }),
  member({
    memberId: "mb_d1",
    balls: derivedBalls,
    track: "B2T_R",
    memberOrigin: "DERIVED_C3_PLUS",
    generatedFromMemberId: "mb_h",
    derivedRule: "C3_PLUS_SCORING_LINE_v1",
    derivedStep: "step:0001",
    sourceSlot: "S1",
    authoringStrategyId: "as_d1",
  }),
];

function snapshot(over: Partial<PublishedFamilySnapshot> = {}): PublishedFamilySnapshot {
  return { familyId: FAMILY, master, members: structuredClone(members), ...over };
}

function context(publishedFamily: PublishedFamilySnapshot | null, withRoot = true): OverwriteRecallContext {
  return {
    source: "PUBLISHED",
    familyId: FAMILY,
    recallMember: null,
    authoredRoot: withRoot
      ? { familyId: FAMILY, memberId: "mb_root", balls: rootBalls, targetBall: "red", track: "B2T_L", slot: "S2" }
      : null,
    publishedFamily,
  };
}

function otherFamilyRecord(balls: Ball3, slot: StrategyEntry["slot"], targetBall?: "red" | "yellow"): PositionRecord {
  return {
    positionId: createPositionId(balls),
    balls,
    ...(targetBall ? { targetBall } : {}),
    strategies: {
      [slot]: { slot, familyId: "fm_other", memberId: "mb_other", memberOrigin: "AUTHORED", track: "B2T_L" } as StrategyEntry,
    },
  };
}

function seededIds(dataset: PositionRecord[]) {
  return dataset
    .flatMap((r) => Object.entries(r.strategies).map(([slot, e]) => ({ slot, positionId: r.positionId, ...e! })))
    .filter((e) => e.familyId === FAMILY)
    .map((e) => ({
      memberId: e.memberId,
      slot: e.slot,
      positionId: e.positionId,
      authoringStrategyId: e.authoringStrategyId,
      generatedFromMemberId: e.generatedFromMemberId ?? null,
    }))
    .sort((a, b) => a.memberId!.localeCompare(b.memberId!));
}

describe("capturePublishedFamilySnapshot", () => {
  it("keeps only the recalled Family (deep copies), null without its Master", () => {
    const foreign = member({ memberId: "mb_foreign", familyId: "fm_foreign" });
    const snap = capturePublishedFamilySnapshot({
      familyId: FAMILY,
      members: [...members, foreign],
      masterByFamilyId: new Map([[FAMILY, master]]),
    })!;
    expect(snap.members.map((m) => m.memberId)).toEqual(["mb_root", "mb_h", "mb_d1"]);
    expect(snap.master).toEqual(master);
    expect(snap.members[0]).not.toBe(members[0]);
    expect(
      capturePublishedFamilySnapshot({ familyId: FAMILY, members, masterByFamilyId: new Map() })
    ).toBeNull();
  });
});

describe("seedPublishedFamilyForOverwrite", () => {
  it("LOCAL source or a Local copy of the familyId → dataset returned unchanged (no merge)", () => {
    const local = [otherFamilyRecord(rootBalls, "S1")];
    const asLocal = seedPublishedFamilyForOverwrite({
      dataset: local,
      familyId: FAMILY,
      sourceKind: "LOCAL",
      recallContext: context(snapshot()),
    });
    expect(asLocal).toEqual({ ok: true, dataset: local, seeded: false });

    const partial: PositionRecord[] = [
      {
        positionId: createPositionId(rootBalls),
        balls: rootBalls,
        strategies: {
          S2: { slot: "S2", familyId: FAMILY, memberId: "mb_root", memberOrigin: "AUTHORED", track: "B2T_L" } as StrategyEntry,
        },
      },
    ];
    const kept = seedPublishedFamilyForOverwrite({
      dataset: partial,
      familyId: FAMILY,
      sourceKind: "PUBLISHED",
      recallContext: context(snapshot()),
    });
    expect(kept.ok && kept.seeded).toBe(false);
    expect(kept.ok && kept.dataset).toBe(partial);
  });

  it("Published-only → every Member materialized with its exact id / asid / slot / Position / lineage", () => {
    const r = seedPublishedFamilyForOverwrite({
      dataset: [],
      familyId: FAMILY,
      sourceKind: "PUBLISHED",
      recallContext: context(snapshot()),
    });
    expect(r.ok && r.seeded).toBe(true);
    if (!r.ok) return;
    expect(seededIds(r.dataset)).toEqual([
      { memberId: "mb_d1", slot: "S1", positionId: createPositionId(derivedBalls), authoringStrategyId: "as_d1", generatedFromMemberId: "mb_h" },
      { memberId: "mb_h", slot: "S2", positionId: createPositionId(hBalls), authoringStrategyId: "as_h", generatedFromMemberId: "mb_root" },
      { memberId: "mb_root", slot: "S2", positionId: createPositionId(rootBalls), authoringStrategyId: "as_root", generatedFromMemberId: null },
    ]);
  });

  it("merges into a free slot of an existing Local Position without touching the other Family", () => {
    const local = [otherFamilyRecord(rootBalls, "S1", "red")];
    const r = seedPublishedFamilyForOverwrite({
      dataset: local,
      familyId: FAMILY,
      sourceKind: "PUBLISHED",
      recallContext: context(snapshot()),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rec = r.dataset.find((x) => x.positionId === createPositionId(rootBalls))!;
    expect(rec.strategies.S1?.familyId).toBe("fm_other");
    expect(rec.strategies.S2?.memberId).toBe("mb_root");
    expect(local[0].strategies.S2).toBeUndefined();
  });

  it("C-0: another Family on a Published Member's (Position, slot) → fail closed", () => {
    const r = seedPublishedFamilyForOverwrite({
      dataset: [otherFamilyRecord(derivedBalls, "S1")],
      familyId: FAMILY,
      sourceKind: "PUBLISHED",
      recallContext: context(snapshot()),
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("POSITION_STRATEGY_SLOT_CONFLICT");
  });

  it("different target ball at a shared Position → fail closed", () => {
    const r = seedPublishedFamilyForOverwrite({
      dataset: [otherFamilyRecord(rootBalls, "S1", "yellow")],
      familyId: FAMILY,
      sourceKind: "PUBLISHED",
      recallContext: context(snapshot()),
    });
    expect(!r.ok && r.code).toBe("OVERWRITE_PUBLISHED_SEED_CONFLICT");
  });

  it("invalid snapshot (missing lineage / missing snapshot / root mismatch) → fail closed", () => {
    const broken = snapshot({ members: members.filter((m) => m.memberId !== "mb_h") });
    const cases = [
      context(broken),
      context(null),
      context(snapshot({ members: members.map((m) => (m.memberId === "mb_root" ? { ...m, sourceSlot: "S3" as const } : m)) })),
    ];
    for (const recallContext of cases) {
      const r = seedPublishedFamilyForOverwrite({ dataset: [], familyId: FAMILY, sourceKind: "PUBLISHED", recallContext });
      expect(!r.ok && r.code).toBe("OVERWRITE_PUBLISHED_SEED_INVALID");
    }
    const noContext = seedPublishedFamilyForOverwrite({ dataset: [], familyId: FAMILY, sourceKind: "PUBLISHED", recallContext: null });
    expect(noContext).toEqual({ ok: true, dataset: [], seeded: false });
  });
});

describe("checkOverwriteFamilyPreserved", () => {
  function loc(entry: Partial<StrategyEntry>, balls: Ball3 = rootBalls, slot: StrategyEntry["slot"] = "S1"): FamilyMemberLocation {
    return {
      recordIndex: 0,
      slot,
      balls,
      positionId: createPositionId(balls),
      positionKey: null,
      identityKey: null,
      entry: { slot, familyId: FAMILY, memberId: "mb_root", memberOrigin: "AUTHORED", track: "B2T_L", ...entry } as StrategyEntry,
    };
  }

  it("accepts unchanged identity/geometry, and a new asid only where none existed (legacy)", () => {
    expect(checkOverwriteFamilyPreserved({ before: [loc({})], after: [loc({ authoringStrategyId: "as_new" })] }).ok).toBe(true);
  });

  it("rejects relocation, slot move, re-id, asid change and lineage rewrite", () => {
    const before = [loc({ authoringStrategyId: "as_root" })];
    const moved = { ...rootBalls, cue: { x: 10.5, y: 10 } };
    const bad = [
      [loc({ authoringStrategyId: "as_root" }, moved)],
      [loc({ authoringStrategyId: "as_root" }, rootBalls, "S2")],
      [loc({ authoringStrategyId: "as_root", memberId: "mb_other" })],
      [loc({ authoringStrategyId: "as_changed" })],
      [loc({ authoringStrategyId: "as_root", generatedFromMemberId: "mb_x" })],
    ];
    for (const after of bad) {
      const r = checkOverwriteFamilyPreserved({ before, after });
      expect(!r.ok && r.code).toBe("OVERWRITE_FAMILY_GEOMETRY_MISMATCH");
    }
  });
});
