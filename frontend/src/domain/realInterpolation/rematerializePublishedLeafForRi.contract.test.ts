/**
 * Phase E-3 — RI on-demand rematerialize parity vs whole-leaf rematerialize.
 *
 * OLD (E-1 cache): rematerialize at load → entry.records
 * NEW (E-3): rematerializePublishedLeafForRi on demand from Masters/Members
 *
 * Same rematerialize owner → identical PositionRecord[] for RI knot corpus.
 *
 * Run: npx vitest run src/domain/realInterpolation/rematerializePublishedLeafForRi.contract.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMaster,
  type FamilyMember,
} from "../family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "../family/rematerializeFamilyPartsToPositionRecords";
import { runRealInterpolationSearch } from "./engine";
import { rematerializePublishedLeafForRi } from "./rematerializePublishedLeafForRi";
import type { Ball3 } from "../positionSearchEngine";

const ballsA: Ball3 = {
  cue: { x: 19, y: 16 },
  target: { x: 20, y: 20 },
  second: { x: 60, y: 20 },
};

const ballsB: Ball3 = {
  cue: { x: 25, y: 16 },
  target: { x: 20, y: 20 },
  second: { x: 60, y: 20 },
};

function master(
  familyId: string,
  overrides: Partial<FamilyMaster> = {}
): FamilyMaster {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    ai: { text: `ai-${familyId}` },
    str: { speed: 2 },
    hpT: { T: "8/8", hit_point: { x: 0, y: 0 }, mode: "TIP", tipCount: 0 },
    ...overrides,
  };
}

function member(
  partial: Partial<FamilyMember> &
    Pick<
      FamilyMember,
      "memberId" | "familyId" | "memberOrigin" | "track" | "sourceSlot" | "balls"
    >
): FamilyMember {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    targetBall: "yellow",
    authoringStrategyId: `as_${partial.familyId}`,
    ...partial,
  };
}

describe("rematerializePublishedLeafForRi", () => {
  it("parity with rematerializeFamilyPartsToPositionRecords whole leaf", () => {
    const masters = [
      master("fm_a", {
        ai: { text: "A" },
        sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
      }),
      master("fm_b", {
        ai: { text: "B" },
        sysInputs: { CO_f: 40, C1_f: 15, C3_r: 25 },
      }),
    ];
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S1",
        balls: ballsA,
        authoringStrategyId: "as_family_shared",
      }),
      member({
        memberId: "mb_b",
        familyId: "fm_b",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S1",
        balls: ballsB,
        authoringStrategyId: "as_family_shared",
      }),
      member({
        memberId: "mb_a_s2",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S2",
        balls: ballsA,
        authoringStrategyId: "as_other",
      }),
    ];

    const oldRemat = rematerializeFamilyPartsToPositionRecords({
      masters,
      members,
    });
    expect(oldRemat.ok).toBe(true);
    if (!oldRemat.ok) return;

    const neu = rematerializePublishedLeafForRi({
      familyMasters: masters,
      familyMembers: members,
    });
    expect(neu.ok).toBe(true);
    if (!neu.ok) return;

    expect(neu.records.length).toBe(oldRemat.dataset.length);
    expect(JSON.stringify(neu.records)).toBe(JSON.stringify(oldRemat.dataset));

    // Multi-family Position: S1 vs S2 payloads isolated
    const posA = neu.records.find((r) => r.positionId.includes("190") || r.balls.cue.x === 19);
    expect(posA?.strategies.S1?.familyId).toBe("fm_a");
    expect(posA?.strategies.S2?.familyId).toBe("fm_a");
    expect((posA?.strategies.S1?.ai as { text?: string })?.text).toBe("A");
  });

  it("empty members fails closed", () => {
    const r = rematerializePublishedLeafForRi({
      familyMasters: [master("fm_a")],
      familyMembers: [],
    });
    expect(r.ok).toBe(false);
  });

  it("RI engine old/new identical on rematerialized corpus", () => {
    const masters = [
      master("fm_a", { sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 } }),
      master("fm_b", { sysInputs: { CO_f: 50, C1_f: 20, C3_r: 30 } }),
    ];
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S1",
        balls: ballsA,
        authoringStrategyId: "as_shared",
      }),
      member({
        memberId: "mb_b",
        familyId: "fm_b",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S1",
        balls: ballsB,
        authoringStrategyId: "as_shared",
      }),
    ];

    const oldRemat = rematerializeFamilyPartsToPositionRecords({
      masters,
      members,
    });
    const neu = rematerializePublishedLeafForRi({
      familyMasters: masters,
      familyMembers: members,
    });
    expect(oldRemat.ok && neu.ok).toBe(true);
    if (!oldRemat.ok || !neu.ok) return;

    const query: Ball3 = {
      cue: { x: 22, y: 16 },
      target: { x: 20, y: 20 },
      second: { x: 60, y: 20 },
    };

    const envelopeDataset = {
      records: oldRemat.dataset.flatMap((rec) => {
        const slot = rec.strategies.S1 ? "S1" : null;
        if (!slot) return [];
        return [
          {
            strategyRef: `${rec.positionId}.${slot}`,
            target: rec.balls.target,
            cueSet: oldRemat.dataset.map((r) => r.balls.cue),
            secondSet: [
              { x: 50, y: 20 },
              { x: 70, y: 20 },
            ],
          },
        ];
      }),
    };

    const oldResults = runRealInterpolationSearch({
      query,
      positionRecords: oldRemat.dataset,
      envelopeDataset,
    });
    const newResults = runRealInterpolationSearch({
      query,
      positionRecords: neu.records,
      envelopeDataset,
    });

    expect(JSON.stringify(newResults)).toBe(JSON.stringify(oldResults));
  });
});
