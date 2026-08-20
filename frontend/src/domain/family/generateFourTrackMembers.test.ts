/**
 * Phase 2B — four-track generator identity / lineage / payload.
 * Run: npx vitest run src/domain/family/generateFourTrackMembers.test.ts
 */

import { describe, expect, it } from "vitest";
import { createPositionId } from "../positionId";
import type { StrategyEntry } from "../positionSearchEngine";
import { FAMILY_MASTER_MIGRATION_DEBT } from "./familyMigrationDebt";
import {
  existingLineageFromEntries,
  generateFourTrackMembers,
} from "./generateFourTrackMembers";
import { resolveFamilyHpt } from "./hptResolver";
import { parseFamilyTrack } from "./trackSymmetry";

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
    corrections: { slide: 1, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
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
    reflectionOverride: { rail: "TOP", t: 0.4 },
    ...overrides,
  };
}

describe("generateFourTrackMembers", () => {
  it("rejects legacy records and system-specific routes", () => {
    expect(
      generateFourTrackMembers({
        balls: authoredBalls,
        entry: authoredEntry({ familyId: undefined, memberId: undefined }),
      }).ok
    ).toBe(false);
    expect(
      generateFourTrackMembers({
        balls: authoredBalls,
        entry: authoredEntry({ track: "RLTR_R" }),
      }).ok
    ).toBe(false);
    expect(parseFamilyTrack("RLTR_R")).toBeNull();
  });

  it("rejects SYMMETRY → SYMMETRY regeneration", () => {
    const result = generateFourTrackMembers({
      balls: authoredBalls,
      entry: authoredEntry({
        memberOrigin: "SYMMETRY",
        symmetryOp: "H",
        generatedFromMemberId: "mb_other",
      }),
    });
    expect(result.ok).toBe(false);
  });

  it("emits 4 members with shared familyId and unique member/asid", () => {
    const result = generateFourTrackMembers({
      balls: authoredBalls,
      targetBall: "red",
      entry: authoredEntry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { set } = result;
    expect(set.members).toHaveLength(4);
    const familyIds = new Set(set.members.map((m) => m.entry.familyId));
    const memberIds = new Set(set.members.map((m) => m.entry.memberId));
    const asids = new Set(set.members.map((m) => m.entry.authoringStrategyId));
    expect(familyIds).toEqual(new Set(["fm_family1"]));
    expect(memberIds.size).toBe(4);
    expect(asids.size).toBe(4);
    expect(set.authored.entry.memberId).toBe("mb_authored");
    expect(set.authored.entry.authoringStrategyId).toBe("as_authored");
    expect(set.authored.entry.memberOrigin).toBe("AUTHORED");
    expect(set.authored.entry.symmetryOp).toBeUndefined();
    expect(set.authored.entry.generatedFromMemberId).toBeUndefined();

    for (const op of ["H", "V", "RPI"] as const) {
      const member = set.symmetry[op];
      expect(member.entry.memberOrigin).toBe("SYMMETRY");
      expect(member.entry.generatedFromMemberId).toBe("mb_authored");
      expect(member.entry.symmetryOp).toBe(op);
      expect(member.entry.memberId).not.toBe(member.positionId);
      expect(member.entry.familyId).not.toBe(member.entry.authoringStrategyId);
      expect(member.targetBall).toBe("red");
      expect(member.entry.sysInputs).toEqual({ CO_f: 30, C1_f: 10, C3_r: 20 });
      expect(member.entry.signature.systemId).toBe("5_half_system");
      expect(member.entry.reflectionOverride).toBeUndefined();
      expect(member.entry.trajectoryExtensions).toBeUndefined();
    }

    expect(set.authored.track).toBe("B2T_L");
    expect(set.symmetry.H.track).toBe("B2T_R");
    expect(set.symmetry.V.track).toBe("T2B_R");
    expect(set.symmetry.RPI.track).toBe("T2B_L");
    expect(FAMILY_MASTER_MIGRATION_DEBT).toContain("TEMPORARY");
  });

  it("creates positionId from transformed balls", () => {
    const result = generateFourTrackMembers({
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.set.authored.positionId).toBe(createPositionId(authoredBalls));
    expect(result.set.symmetry.H.positionId).toBe(
      createPositionId(result.set.symmetry.H.balls)
    );
    expect(result.set.symmetry.H.positionId).not.toBe(result.set.authored.positionId);
  });

  it("does not persist mirrored HPT on SYMMETRY members", () => {
    const result = generateFourTrackMembers({
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!result.ok) throw new Error(result.reason);
    const mirrored = resolveFamilyHpt({
      authoredTrack: "B2T_L",
      requestedTrack: "B2T_R",
      canonicalHpt,
    }).hpt;
    expect(result.set.symmetry.H.entry.hpT).toEqual(canonicalHpt);
    expect(result.set.symmetry.H.entry.hpT).not.toEqual(mirrored);
    expect(result.set.symmetry.RPI.entry.hpT).toEqual(canonicalHpt);
  });

  it("does not copy AUTHORED meta angles onto SYMMETRY members", () => {
    const result = generateFourTrackMembers({
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.set.symmetry.H.entry.meta).not.toEqual(result.set.authored.entry.meta);
    expect(result.set.symmetry.H.entry.meta.impact.x).toBe(68);
  });

  it("reuses memberId / authoringStrategyId for existing symmetry ops", () => {
    const first = generateFourTrackMembers({
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!first.ok) throw new Error(first.reason);
    const second = generateFourTrackMembers(
      { balls: authoredBalls, entry: authoredEntry() },
      {
        existingMembers: existingLineageFromEntries(
          first.set.members.map((m) => m.entry)
        ),
      }
    );
    if (!second.ok) throw new Error(second.reason);
    expect(second.set.authored.entry.memberId).toBe("mb_authored");
    expect(second.set.symmetry.H.entry.memberId).toBe(
      first.set.symmetry.H.entry.memberId
    );
    expect(second.set.symmetry.V.entry.authoringStrategyId).toBe(
      first.set.symmetry.V.entry.authoringStrategyId
    );
  });

  it("can fill a missing V only", () => {
    const first = generateFourTrackMembers({
      balls: authoredBalls,
      entry: authoredEntry(),
    });
    if (!first.ok) throw new Error(first.reason);
    const partial = existingLineageFromEntries(
      [first.set.authored, first.set.symmetry.H, first.set.symmetry.RPI].map(
        (m) => m.entry
      )
    );
    const second = generateFourTrackMembers(
      { balls: authoredBalls, entry: authoredEntry() },
      { existingMembers: partial }
    );
    if (!second.ok) throw new Error(second.reason);
    expect(second.set.symmetry.H.entry.memberId).toBe(
      first.set.symmetry.H.entry.memberId
    );
    expect(second.set.symmetry.RPI.entry.memberId).toBe(
      first.set.symmetry.RPI.entry.memberId
    );
    expect(second.set.symmetry.V.entry.memberId).not.toBe(
      first.set.symmetry.V.entry.memberId
    );
  });
});

describe("base track is the AUTHORED explicit track", () => {
  it.each([
    ["B2T_R", { H: "B2T_L", V: "T2B_L", RPI: "T2B_R" }],
    ["T2B_L", { H: "T2B_R", V: "B2T_R", RPI: "B2T_L" }],
    ["T2B_R", { H: "T2B_L", V: "B2T_L", RPI: "B2T_R" }],
  ] as const)("%s base maps H/V/RPI", (base, mapped) => {
    const result = generateFourTrackMembers({
      balls: authoredBalls,
      entry: authoredEntry({ track: base }),
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.set.authored.track).toBe(base);
    expect(result.set.symmetry.H.track).toBe(mapped.H);
    expect(result.set.symmetry.V.track).toBe(mapped.V);
    expect(result.set.symmetry.RPI.track).toBe(mapped.RPI);
  });
});
