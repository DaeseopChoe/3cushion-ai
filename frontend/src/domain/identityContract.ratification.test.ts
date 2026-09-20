/**
 * Position / Strategy / Family / Member Identity Contract (ratified 2026-09-20).
 * Behavior lock only — no production algorithm changes.
 *
 * Run: npx vitest run src/domain/identityContract.ratification.test.ts
 */
import { describe, expect, it } from "vitest";
import { createPositionId } from "./positionId";
import type { StrategyEntry } from "./positionSearchEngine";
import {
  genericFamilyMemberIdentityKey,
  resolveFamilyIdentityForSave,
  resolveGenericFamilyMemberIdentity,
} from "./family/familyIdentity";
import { generateFourTrackMembers } from "./family/generateFourTrackMembers";
import { transformBall3 } from "./family/trackSymmetry";

const balls = {
  cue: { x: 30.6, y: 6.1 },
  target: { x: 9.3, y: 24.3 },
  second: { x: 59.4, y: 38.3 },
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
    familyId: "fm_contract_1",
    memberId: "mb_contract_1",
    memberOrigin: "AUTHORED",
    authoringStrategyId: "as_contract_1",
    track: "B2T_L",
    meta: {
      impact: { x: 1, y: 1 },
      final: { x: 2, y: 2 },
      angle_ci: 0,
      angle_fs: 0,
    },
    ...overrides,
  };
}

describe("Identity Contract ratification", () => {
  it("1 — same Ball3 coordinates → same positionId", () => {
    expect(createPositionId(balls)).toBe(createPositionId({ ...balls }));
    expect(createPositionId(balls)).toBe(
      createPositionId({
        cue: { x: 30.64, y: 6.06 },
        target: { x: 9.25, y: 24.34 },
        second: { x: 59.44, y: 38.25 },
      })
    );
  });

  it("2 — physical targetBall color is excluded from Position Key", () => {
    const id = createPositionId(balls);
    // createPositionId has no targetBall parameter — color cannot affect Position Key
    expect(id).toBe(createPositionId(balls));
    expect(id.includes("red") || id.includes("yellow")).toBe(false);
  });

  it("3 — Strategy slot is not part of Position Key", () => {
    const id = createPositionId(balls);
    expect(id).not.toContain("S1");
    expect(id).not.toContain("S2");
    expect(id).not.toContain("S3");
    // Same balls → same Position Key regardless of which slot a Strategy uses
    expect(createPositionId(balls)).toBe(
      createPositionId({
        cue: balls.cue,
        target: balls.target,
        second: balls.second,
      })
    );
  });

  it("4 — same Position + Strategy SAVE twice → different familyId", () => {
    const a = resolveFamilyIdentityForSave({ saveIntent: "CREATE" });
    const b = resolveFamilyIdentityForSave({ saveIntent: "CREATE" });
    expect(a?.familyId).toBeTruthy();
    expect(b?.familyId).toBeTruthy();
    expect(a!.familyId).not.toBe(b!.familyId);
  });

  it("5 — same Family 4 Tracks share familyId", () => {
    const result = generateFourTrackMembers({
      balls,
      entry: authoredEntry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = new Set(result.set.members.map((m) => m.entry.familyId));
    expect(ids.size).toBe(1);
    expect(ids.has("fm_contract_1")).toBe(true);
  });

  it("6 — symmetry transform with different coords → different positionId", () => {
    const h = transformBall3("H", balls);
    expect(createPositionId(h)).not.toBe(createPositionId(balls));
  });

  it("7 — Derived logical identity stays under same familyId", () => {
    const derived = resolveGenericFamilyMemberIdentity({
      familyId: "fm_contract_1",
      memberId: "mb_der_1",
      memberOrigin: "DERIVED_CUE_IMPACT",
      generatedFromMemberId: "mb_contract_1",
      derivedRule: "CUE_IMPACT_FIRST_30PCT",
      derivedStep: "cue_impact:t:0.300000",
    });
    expect(derived?.kind).toBe("DERIVED");
    if (derived?.kind !== "DERIVED") return;
    expect(derived.familyId).toBe("fm_contract_1");
    expect(genericFamilyMemberIdentityKey(derived)).toContain(
      "family:fm_contract_1"
    );
  });

  it("8 — distinct logical Members have distinct memberIds (and keys)", () => {
    const authored = resolveGenericFamilyMemberIdentity(authoredEntry());
    const sym = resolveGenericFamilyMemberIdentity(
      authoredEntry({
        memberId: "mb_sym_h",
        memberOrigin: "SYMMETRY",
        symmetryOp: "H",
        generatedFromMemberId: "mb_contract_1",
      })
    );
    expect(authored?.kind).toBe("AUTHORED");
    expect(sym?.kind).toBe("SYMMETRY");
    expect(genericFamilyMemberIdentityKey(authored)).not.toBe(
      genericFamilyMemberIdentityKey(sym)
    );
    expect(authoredEntry().memberId).not.toBe("mb_sym_h");
  });

  it("9 — OVERWRITE preserves source familyId", () => {
    const familyId = "fm_keep_src";
    const memberId = "mb_keep_src";
    const resolved = resolveFamilyIdentityForSave({
      saveIntent: "UPDATE",
      explicitIdentity: authoredEntry({ familyId, memberId }),
    });
    expect(resolved?.familyId).toBe(familyId);
    expect(resolved?.memberId).toBe(memberId);
  });

  it("10 — SAVE never derives familyId from positionId", () => {
    const positionId = createPositionId(balls);
    const resolved = resolveFamilyIdentityForSave({
      saveIntent: "CREATE",
      positionId,
    });
    expect(resolved?.familyId).toBeTruthy();
    expect(resolved!.familyId).not.toBe(positionId);
    expect(resolved!.familyId.startsWith("fm_")).toBe(true);
    // familyId must not embed the Position Key string
    expect(resolved!.familyId.includes(positionId)).toBe(false);
  });
});
