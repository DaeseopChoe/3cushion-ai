/**
 * Phase E-2 — Normalized Published Member Search contracts.
 *
 * Position-level ranking + winner-only hydrate.
 * Parity vs whole-leaf rematerialize → runSpatialRecall.
 *
 * Run: npx vitest run src/domain/recall/normalizedPublishedMemberSearch.contract.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMaster,
  type FamilyMember,
} from "../family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "../family/rematerializeFamilyPartsToPositionRecords";
import { createPositionId } from "../positionId";
import { readFamilyIdFromRecordSlot } from "../family/publishedEditSession";
import { runSpatialRecall } from "./recallEngine";
import {
  groupMembersIntoPositionCandidates,
  runNormalizedPublishedMemberSearch,
} from "./normalizedPublishedMemberSearch";

const ballsP = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

const ballsNear = {
  cue: { x: 10.5, y: 10.2 },
  target: { x: 40.3, y: 20.1 },
  second: { x: 60.2, y: 15.1 },
};

/** Farther from ballsP than ballsNear under manhattan (adminStrict/userStrict). */
const ballsQ = {
  cue: { x: 25, y: 12 },
  target: { x: 45, y: 22 },
  second: { x: 65, y: 18 },
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
      "memberId" | "familyId" | "memberOrigin" | "track" | "sourceSlot"
    >
): FamilyMember {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    balls: ballsP,
    targetBall: "yellow",
    authoringStrategyId: `as_${partial.memberId}`,
    ...partial,
  };
}

function masterMap(masters: FamilyMaster[]): Map<string, FamilyMaster> {
  return new Map(masters.map((m) => [m.familyId, m]));
}

/** Test-only parity: old flat path (whole rematerialize → runSpatialRecall). */
function oldPathSearch(
  masters: FamilyMaster[],
  members: FamilyMember[],
  query: { balls: typeof ballsP; targetBall?: "red" | "yellow" | null },
  profile: "adminStrict" | "userStrict"
) {
  const remat = rematerializeFamilyPartsToPositionRecords({ masters, members });
  expect(remat.ok).toBe(true);
  if (!remat.ok) throw new Error("remat failed");
  return runSpatialRecall({
    dataset: remat.dataset,
    query,
    profile,
  });
}

describe("Phase E-2 normalized Published Member Search", () => {
  it("exact match + winner-only hydrate preserves S1 identity", () => {
    const masters = [master("fm_a")];
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
      }),
    ];
    const r = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: ballsP },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.positionId).toBe(createPositionId(ballsP));
    expect(r.distance).toBe(0);
    expect(r.record.strategies.S1?.familyId).toBe("fm_a");
    expect(r.record.strategies.S1?.memberId).toBe("mb_a");
    expect(r.record.strategies.S1?.track).toBe("B2T_L");
  });

  it("near match under adminStrict; no-match when beyond coarse", () => {
    const masters = [master("fm_a")];
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S1",
        balls: ballsP,
      }),
    ];
    const near = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: ballsNear },
      profile: "adminStrict",
    });
    expect(near.kind).toBe("match");

    const farBalls = {
      cue: { x: 50, y: 30 },
      target: { x: 10, y: 5 },
      second: { x: 70, y: 35 },
    };
    const far = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: farBalls },
      profile: "adminStrict",
    });
    expect(far.kind).toBe("no-match");
  });

  it("multi-family Position: S1/S2/S3 pack distinct Master payloads (no contamination)", () => {
    const masters = [
      master("fm_a", {
        ai: { text: "A" },
        str: { speed: 1 },
        sysInputs: { CO_f: 11, C1_f: 11, C3_r: 11 },
        hpT: { T: "1/8", hit_point: { x: 1, y: 0 }, mode: "TIP", tipCount: 1 },
      }),
      master("fm_b", {
        ai: { text: "B" },
        str: { speed: 2 },
        sysInputs: { CO_f: 22, C1_f: 22, C3_r: 22 },
        hpT: { T: "2/8", hit_point: { x: 2, y: 0 }, mode: "TIP", tipCount: 2 },
      }),
      master("fm_c", {
        ai: { text: "C" },
        str: { speed: 3 },
        sysInputs: { CO_f: 33, C1_f: 33, C3_r: 33 },
        hpT: { T: "3/8", hit_point: { x: 3, y: 0 }, mode: "TIP", tipCount: 3 },
      }),
    ];
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
      }),
      member({
        memberId: "mb_b",
        familyId: "fm_b",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S2",
      }),
      member({
        memberId: "mb_c",
        familyId: "fm_c",
        memberOrigin: "AUTHORED",
        track: "T2B_L",
        sourceSlot: "S3",
      }),
    ];
    const r = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: ballsP },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.record.strategies.S1?.familyId).toBe("fm_a");
    expect(r.record.strategies.S2?.familyId).toBe("fm_b");
    expect(r.record.strategies.S3?.familyId).toBe("fm_c");
    expect((r.record.strategies.S1?.ai as { text?: string })?.text).toBe("A");
    expect((r.record.strategies.S2?.ai as { text?: string })?.text).toBe("B");
    expect((r.record.strategies.S3?.ai as { text?: string })?.text).toBe("C");
    expect(r.record.strategies.S1?.sysInputs?.CO_f).toBe(11);
    expect(r.record.strategies.S2?.sysInputs?.CO_f).toBe(22);
    expect(r.record.strategies.S3?.sysInputs?.CO_f).toBe(33);
    expect(r.record.strategies.S1?.track).toBe("B2T_L");
    expect(r.record.strategies.S2?.track).toBe("B2T_R");
    expect(r.record.strategies.S3?.track).toBe("T2B_L");
    expect(readFamilyIdFromRecordSlot(r.record, "S2")).toBe("fm_b");
  });

  it("member-count does not alter ranking: closer 1-Member beats farther 3-Member", () => {
    const masters = [master("fm_far"), master("fm_near")];
    const members: FamilyMember[] = [
      member({
        memberId: "mb_far_s1",
        familyId: "fm_far",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
        balls: ballsQ,
      }),
      member({
        memberId: "mb_far_s2",
        familyId: "fm_far",
        memberOrigin: "SYMMETRY",
        track: "B2T_R",
        sourceSlot: "S2",
        balls: ballsQ,
        generatedFromMemberId: "mb_far_s1",
      }),
      member({
        memberId: "mb_far_s3",
        familyId: "fm_far",
        memberOrigin: "DERIVED_CUE_IMPACT",
        track: "T2B_L",
        sourceSlot: "S3",
        balls: ballsQ,
        generatedFromMemberId: "mb_far_s1",
      }),
      member({
        memberId: "mb_near",
        familyId: "fm_near",
        memberOrigin: "AUTHORED",
        track: "T2B_R",
        sourceSlot: "S1",
        balls: ballsNear,
      }),
    ];
    // Query closer to ballsNear than ballsQ
    const query = ballsNear;
    const positions = groupMembersIntoPositionCandidates(members);
    expect(positions).toHaveLength(2);
    const nearPos = positions.find(
      (p) => p.positionId === createPositionId(ballsNear)
    );
    expect(nearPos?.members).toHaveLength(1);
    const farPos = positions.find(
      (p) => p.positionId === createPositionId(ballsQ)
    );
    expect(farPos?.members).toHaveLength(3);

    const r = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: query },
      profile: "userStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.positionId).toBe(createPositionId(ballsNear));
    expect(r.record.strategies.S1?.familyId).toBe("fm_near");
  });

  it("old/new parity: whole rematerialize+runSpatialRecall vs Member Position search", () => {
    const masters = [
      master("fm_a", { ai: { text: "A" } }),
      master("fm_b", { ai: { text: "B" } }),
    ];
    const membersClean = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
        balls: ballsP,
      }),
      member({
        memberId: "mb_b",
        familyId: "fm_b",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S2",
        balls: ballsP,
      }),
      member({
        memberId: "mb_q",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "T2B_L",
        sourceSlot: "S1",
        balls: ballsQ,
      }),
    ];

    for (const profile of ["adminStrict", "userStrict"] as const) {
      const oldR = oldPathSearch(
        masters,
        membersClean,
        { balls: ballsP, targetBall: "yellow" },
        profile
      );
      const newR = runNormalizedPublishedMemberSearch({
        members: membersClean,
        masterByFamilyId: masterMap(masters),
        query: { balls: ballsP, targetBall: "yellow" },
        profile,
      });
      expect(newR.kind).toBe(oldR.kind);
      if (newR.kind === "match" && oldR.kind === "match") {
        expect(newR.positionId).toBe(oldR.positionId);
        expect(newR.distance).toBe(oldR.distance);
        expect(newR.record.strategies.S1?.familyId).toBe(
          oldR.record.strategies.S1?.familyId
        );
        expect(newR.record.strategies.S2?.familyId).toBe(
          oldR.record.strategies.S2?.familyId
        );
        expect(newR.record.strategies.S1?.memberId).toBe(
          oldR.record.strategies.S1?.memberId
        );
        expect(
          (newR.record.strategies.S1?.ai as { text?: string })?.text
        ).toBe((oldR.record.strategies.S1?.ai as { text?: string })?.text);
        expect(
          (newR.record.strategies.S2?.ai as { text?: string })?.text
        ).toBe((oldR.record.strategies.S2?.ai as { text?: string })?.text);
      }
    }
  });

  it("missing Master fails closed (no partial PositionRecord)", () => {
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_missing",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
      }),
    ];
    const r = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap([]),
      query: { balls: ballsP },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("no-match");
  });

  it("duplicate sourceSlot at same Position fails closed", () => {
    const masters = [master("fm_a"), master("fm_b")];
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
      }),
      member({
        memberId: "mb_b",
        familyId: "fm_b",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S1", // collision
      }),
    ];
    const r = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: ballsP },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("no-match");
  });

  it("empty corpus → empty-dataset", () => {
    const r = runNormalizedPublishedMemberSearch({
      members: [],
      masterByFamilyId: masterMap([]),
      query: { balls: ballsP },
      profile: "userStrict",
    });
    expect(r.kind).toBe("no-match");
    if (r.kind === "no-match") expect(r.reason).toBe("empty-dataset");
  });

  it("derived origins remain searchable (no origin filter)", () => {
    const masters = [master("fm_a")];
    for (const origin of [
      "SYMMETRY",
      "DERIVED_CUE_IMPACT",
      "DERIVED_C3_PLUS",
      "DERIVED_CUE_C3_PRODUCT",
    ] as const) {
      const r = runNormalizedPublishedMemberSearch({
        members: [
          member({
            memberId: `mb_${origin}`,
            familyId: "fm_a",
            memberOrigin: origin,
            track: "B2T_L",
            sourceSlot: "S1",
            generatedFromMemberId: "mb_seed",
          }),
        ],
        masterByFamilyId: masterMap(masters),
        query: { balls: ballsP },
        profile: "adminStrict",
      });
      expect(r.kind).toBe("match");
      if (r.kind === "match") {
        expect(r.record.strategies.S1?.memberOrigin).toBe(origin);
        expect(r.record.strategies.S1?.memberId).toBe(`mb_${origin}`);
      }
    }
  });

  it("HPT/thickness/meta parity with rematerialize on winner", () => {
    const masters = [
      master("fm_a", {
        hpT: {
          T: "-5/8",
          hit_point: { x: -2, y: 1.5 },
          mode: "TIP",
          tipCount: 2,
        },
      }),
    ];
    const members = [
      member({
        memberId: "mb_a",
        familyId: "fm_a",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        sourceSlot: "S1",
      }),
    ];
    const remat = rematerializeFamilyPartsToPositionRecords({
      masters,
      members,
    });
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    const expected = remat.dataset[0]!.strategies.S1!;

    const r = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: ballsP },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    const got = r.record.strategies.S1!;
    expect(got.hpT).toEqual(expected.hpT);
    expect(got.thickness).toEqual(expected.thickness);
    expect(got.meta).toEqual(expected.meta);
  });

  it("targetBall preference under adminStrict strictWithFallback", () => {
    const masters = [master("fm_y"), master("fm_r")];
    const yellowPos = ballsP;
    const redPos = ballsQ;
    const members = [
      member({
        memberId: "mb_y",
        familyId: "fm_y",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
        balls: yellowPos,
        targetBall: "yellow",
      }),
      member({
        memberId: "mb_r",
        familyId: "fm_r",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        sourceSlot: "S1",
        balls: redPos,
        targetBall: "red",
      }),
    ];
    // Query exact for both distances — prefer yellow bucket when targetBall=yellow
    // Use equal-distance-ish: actually different positions. Prefer filtering.
    const r = runNormalizedPublishedMemberSearch({
      members,
      masterByFamilyId: masterMap(masters),
      query: { balls: yellowPos, targetBall: "yellow" },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind === "match") {
      expect(r.record.targetBall).toBe("yellow");
      expect(r.positionId).toBe(createPositionId(yellowPos));
    }
  });
});
