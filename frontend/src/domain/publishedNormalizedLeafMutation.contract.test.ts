/**
 * Phase D-1 — Normalized whole-leaf Publish mutation contracts.
 *
 * Run: npx vitest run src/domain/publishedNormalizedLeafMutation.contract.test.ts
 */
import { describe, expect, it } from "vitest";
import { createPositionId } from "./positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  memberHasForbiddenCommonPayload,
} from "./family/familyNormalizedSchema";
import type { PublishOperation } from "./publishOperation";
import type { PublishFamilyPayload } from "./publishFamilyPayload";
import {
  applyPublishFamilyToNormalizedLeaf,
  convertPublishFamilyPayloadToNormalizedFamily,
  createEmptyNormalizedPublishedLeaf,
  normalizedPublishedLeavesSemanticallyEqual,
  rematerializeNormalizedFamilyForParity,
} from "./publishedNormalizedLeafMutation";

const LEAF_META = {
  shotType: "뒤돌리기",
  systemId: "5_half_system",
  systemLabel: "파이브앤하프",
};

const FM_A = "fm_d1_aaaa-0000-4000-8000-00000000000a";
const FM_B = "fm_d1_bbbb-0000-4000-8000-00000000000b";
const FM_C = "fm_d1_cccc-0000-4000-8000-00000000000c";
const FM_D = "fm_d1_dddd-0000-4000-8000-00000000000d";

const ballsP1: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};
const ballsP2: Ball3 = {
  cue: { x: 12, y: 12 },
  target: { x: 52, y: 27 },
  second: { x: 42, y: 22 },
};
const ballsP3: Ball3 = {
  cue: { x: 14, y: 14 },
  target: { x: 54, y: 29 },
  second: { x: 44, y: 24 },
};

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId: string;
    memberId: string;
    memberOrigin?: StrategyEntry["memberOrigin"];
    track?: string;
    generatedFromMemberId?: string;
    symmetryOp?: StrategyEntry["symmetryOp"];
    derivedRule?: StrategyEntry["derivedRule"];
    derivedStep?: string;
    sysValue?: number;
    aiText?: string;
  }
): StrategyEntry {
  const e: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: opts.sysValue ?? 40, C1_f: 10, C3_r: 20 },
    corrections: {
      departure: 0,
      spin: 0,
      slide: 1,
      draw: 0,
      curve_ratio: 0,
    },
    correctionsStored: true,
    meta: {
      impact: { x: 1, y: 1 },
      final: { x: 2, y: 2 },
      angle_ci: 0,
      angle_fs: 0,
    },
    ai: { text: opts.aiText ?? "lesson" },
    str: { speed: 2.5 },
    hpT: {
      T: "-5/8",
      hit_point: { x: -1, y: 2 },
      mode: "TIP",
      tipCount: 1,
    },
    authoringStrategyId: `as_${opts.memberId}`,
    familyId: opts.familyId,
    memberId: opts.memberId,
    memberOrigin: opts.memberOrigin ?? "AUTHORED",
    track: opts.track ?? "B2T_L",
  };
  if (opts.generatedFromMemberId) {
    e.generatedFromMemberId = opts.generatedFromMemberId;
  }
  if (opts.symmetryOp) e.symmetryOp = opts.symmetryOp;
  if (opts.derivedRule) e.derivedRule = opts.derivedRule;
  if (opts.derivedStep) e.derivedStep = opts.derivedStep;
  return e;
}

function position(
  balls: Ball3,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>
): PositionRecord {
  return {
    positionId: createPositionId(balls),
    balls,
    strategies: slots,
    schemaVersion: 1,
  };
}

function payload(
  familyId: string,
  records: PositionRecord[]
): PublishFamilyPayload {
  return {
    schemaVersion: 1,
    familyId,
    records: JSON.parse(JSON.stringify(records)),
  };
}

function op(
  intent: "CREATE" | "UPDATE",
  destinationFamilyId: string,
  sourceFamilyId: string | null = intent === "UPDATE" ? destinationFamilyId : null
): PublishOperation {
  return {
    schemaVersion: 1,
    intent,
    sourceFamilyId,
    destinationFamilyId,
  };
}

/** Minimal AUTHORED family on given balls / slot. */
function familyPayload(
  familyId: string,
  memberId: string,
  balls: Ball3,
  slot: "S1" | "S2" | "S3" = "S1",
  extra?: Partial<Parameters<typeof entry>[1]>
): PublishFamilyPayload {
  return payload(familyId, [
    position(balls, {
      [slot]: entry(slot, {
        familyId,
        memberId,
        ...extra,
      }),
    }),
  ]);
}

function emptyLeaf() {
  const r = createEmptyNormalizedPublishedLeaf(LEAF_META);
  if (!r.ok) throw new Error(r.reason);
  return r.envelope;
}

function apply(
  existing: ReturnType<typeof emptyLeaf> | null,
  operation: PublishOperation,
  familyPayload: PublishFamilyPayload
) {
  return applyPublishFamilyToNormalizedLeaf({
    existing,
    operation,
    payload: familyPayload,
    leafMeta: existing == null ? LEAF_META : undefined,
  });
}

describe("Phase D-1 publishedNormalizedLeafMutation", () => {
  it("CASE 1: empty leaf + CREATE → one Family PASS", () => {
    const result = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.familyMasters).toHaveLength(1);
    expect(result.envelope.familyMembers).toHaveLength(1);
    expect(result.envelope.familyMasters[0]!.familyId).toBe(FM_A);
    expect(result.createRetryReplaced).toBe(false);
  });

  it("CASE 2: existing unrelated Family + CREATE → both preserved", () => {
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = apply(
      first.envelope,
      op("CREATE", FM_B),
      familyPayload(FM_B, "mb_b1", ballsP2)
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.envelope.familyMasters.map((m) => m.familyId).sort()).toEqual(
      [FM_A, FM_B].sort()
    );
    expect(second.envelope.familyMembers).toHaveLength(2);
  });

  it("CASE 3: CREATE same destinationFamilyId retry → idempotent full replacement", () => {
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1, "S1", { aiText: "v1", sysValue: 40 })
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const retry = apply(
      first.envelope,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1, "S1", { aiText: "v2", sysValue: 55 })
    );
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.createRetryReplaced).toBe(true);
    expect(retry.envelope.familyMasters).toHaveLength(1);
    expect(retry.envelope.familyMasters[0]!.ai).toEqual({ text: "v2" });
    expect(retry.envelope.familyMasters[0]!.sysInputs?.CO_f).toBe(55);
  });

  it("CASE 4/5: CREATE retry does not duplicate Master or Members", () => {
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const retry = apply(
      first.envelope,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.envelope.familyMasters).toHaveLength(1);
    expect(retry.envelope.familyMembers).toHaveLength(1);
  });

  it("CASE 6: same Position + same Slot different Family → REJECT (POSITION_STRATEGY_SLOT_CONFLICT)", () => {
    // Forbidden: different familyId + same Position+Slot (not CREATE retry).
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1, "S1")
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const conflict = apply(
      first.envelope,
      op("CREATE", FM_B),
      familyPayload(FM_B, "mb_b1", ballsP1, "S1")
    );
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.code).toBe("POSITION_STRATEGY_SLOT_CONFLICT");
    expect(
      conflict.validationIssues?.some(
        (i) => i.code === "POSITION_STRATEGY_SLOT_CONFLICT"
      )
    ).toBe(true);
  });

  it("CASE 7: same Position + different Slot → PASS", () => {
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1, "S1")
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = apply(
      first.envelope,
      op("CREATE", FM_B),
      familyPayload(FM_B, "mb_b1", ballsP1, "S2")
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.envelope.familyMembers).toHaveLength(2);
    const slots = second.envelope.familyMembers
      .map((m) => m.sourceSlot)
      .sort();
    expect(slots).toEqual(["S1", "S2"]);
  });

  it("CASE 8: same Slot + different Position → PASS", () => {
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1, "S1")
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = apply(
      first.envelope,
      op("CREATE", FM_B),
      familyPayload(FM_B, "mb_b1", ballsP2, "S1")
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.envelope.familyMembers).toHaveLength(2);
  });

  it("CASE 9: UPDATE same familyId → full replacement PASS", () => {
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1, "S1", { aiText: "old" })
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const updated = apply(
      first.envelope,
      op("UPDATE", FM_A, FM_A),
      familyPayload(FM_A, "mb_a1", ballsP2, "S1", { aiText: "new" })
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.envelope.familyMasters).toHaveLength(1);
    expect(updated.envelope.familyMasters[0]!.ai).toEqual({ text: "new" });
    expect(updated.envelope.familyMembers[0]!.balls.cue.x).toBe(12);
  });

  it("CASE 10: UPDATE source→destination → source removed, destination inserted", () => {
    const a = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const updated = apply(
      a.envelope,
      op("UPDATE", FM_B, FM_A),
      familyPayload(FM_B, "mb_b1", ballsP2)
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    const ids = updated.envelope.familyMasters.map((m) => m.familyId);
    expect(ids).toEqual([FM_B]);
    expect(updated.purgedFamilyIds).toEqual([FM_A]);
    expect(updated.insertedFamilyId).toBe(FM_B);
  });

  it("CASE 11: UPDATE source missing → REJECT", () => {
    const leaf = emptyLeaf();
    const result = apply(
      leaf,
      op("UPDATE", FM_A, FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UPDATE_SOURCE_NOT_FOUND");
  });

  it("CASE 12: UPDATE destination collision → REJECT", () => {
    const a = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = apply(
      a.envelope,
      op("CREATE", FM_B),
      familyPayload(FM_B, "mb_b1", ballsP2)
    );
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    // UPDATE A → B while B already exists
    const conflict = apply(
      b.envelope,
      op("UPDATE", FM_B, FM_A),
      familyPayload(FM_B, "mb_b2", ballsP3)
    );
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.code).toBe("DESTINATION_FAMILY_CONFLICT");
  });

  it("CASE 13: foreign/unrelated Families untouched", () => {
    const a = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = apply(
      a.envelope,
      op("CREATE", FM_B),
      familyPayload(FM_B, "mb_b1", ballsP2)
    );
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const c = apply(
      b.envelope,
      op("CREATE", FM_C),
      familyPayload(FM_C, "mb_c1", ballsP3)
    );
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const updated = apply(
      c.envelope,
      op("UPDATE", FM_B, FM_B),
      familyPayload(FM_B, "mb_b1", ballsP2, "S1", { aiText: "updated-b" })
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(
      updated.envelope.familyMasters.map((m) => m.familyId).sort()
    ).toEqual([FM_A, FM_B, FM_C].sort());
    const masterB = updated.envelope.familyMasters.find(
      (m) => m.familyId === FM_B
    );
    expect(masterB?.ai).toEqual({ text: "updated-b" });
  });

  it("CASE 14/15: familyId and memberId preserved", () => {
    const mid = "mb_preserve_member";
    const result = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, mid, ballsP1)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.familyMasters[0]!.familyId).toBe(FM_A);
    expect(result.envelope.familyMembers[0]!.memberId).toBe(mid);
    expect(result.envelope.familyMembers[0]!.familyId).toBe(FM_A);
  });

  it("CASE 16: track / sourceSlot / provenance preserved", () => {
    const authoredId = "mb_auth_track";
    const symId = "mb_sym_track";
    const pl = payload(FM_A, [
      position(ballsP1, {
        S1: entry("S1", {
          familyId: FM_A,
          memberId: authoredId,
          track: "B2T_R",
          memberOrigin: "AUTHORED",
        }),
      }),
      position(ballsP2, {
        S1: entry("S1", {
          familyId: FM_A,
          memberId: symId,
          track: "T2B_L",
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: authoredId,
          symmetryOp: "H",
        }),
      }),
    ]);
    const result = apply(null, op("CREATE", FM_A), pl);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const auth = result.envelope.familyMembers.find(
      (m) => m.memberId === authoredId
    );
    const sym = result.envelope.familyMembers.find((m) => m.memberId === symId);
    expect(auth?.track).toBe("B2T_R");
    expect(auth?.sourceSlot).toBe("S1");
    expect(auth?.memberOrigin).toBe("AUTHORED");
    expect(sym?.track).toBe("T2B_L");
    expect(sym?.sourceSlot).toBe("S1");
    expect(sym?.memberOrigin).toBe("SYMMETRY");
    expect(sym?.generatedFromMemberId).toBe(authoredId);
    expect(sym?.symmetryOp).toBe("H");
  });

  it("CASE 17: malformed PublishOperation → REJECT", () => {
    const result = applyPublishFamilyToNormalizedLeaf({
      existing: null,
      leafMeta: LEAF_META,
      operation: {
        schemaVersion: 1,
        intent: "CREATE",
        sourceFamilyId: "should-be-null",
        destinationFamilyId: FM_A,
      } as PublishOperation,
      payload: familyPayload(FM_A, "mb_a1", ballsP1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_PUBLISH_OPERATION");
  });

  it("CASE 18: malformed PublishFamilyPayload → REJECT", () => {
    const result = applyPublishFamilyToNormalizedLeaf({
      existing: null,
      leafMeta: LEAF_META,
      operation: op("CREATE", FM_A),
      payload: {
        schemaVersion: 1,
        familyId: FM_A,
        records: [],
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_FAMILY_PAYLOAD");
  });

  it("CASE 19: mixed-family payload → REJECT", () => {
    const pl = payload(FM_A, [
      position(ballsP1, {
        S1: entry("S1", { familyId: FM_A, memberId: "mb_a1" }),
      }),
      position(ballsP2, {
        S1: entry("S1", { familyId: FM_B, memberId: "mb_b1" }),
      }),
    ]);
    const result = apply(null, op("CREATE", FM_A), pl);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_FAMILY_PAYLOAD");
  });

  it("CASE 20: candidate canonical validation failure → REJECT", () => {
    // FORCE validation fail via occupancy (already covered) — also leaf meta conflict
    const first = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const conflict = applyPublishFamilyToNormalizedLeaf({
      existing: first.envelope,
      leafMeta: {
        shotType: "옆돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
      },
      operation: op("CREATE", FM_B),
      payload: familyPayload(FM_B, "mb_b1", ballsP2),
    });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.code).toBe("LEAF_META_CONFLICT");
  });

  it("CASE 21/22: input existing envelope and payload not mutated", () => {
    const existing = emptyLeaf();
    const existingSnap = JSON.stringify(existing);
    const pl = familyPayload(FM_A, "mb_a1", ballsP1);
    const payloadSnap = JSON.stringify(pl);
    const result = apply(existing, op("CREATE", FM_A), pl);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(existing)).toBe(existingSnap);
    expect(JSON.stringify(pl)).toBe(payloadSnap);
  });

  it("CASE 23: multi-member symmetry/derived Family → PASS", () => {
    const auth = "mb_multi_auth";
    const pl = payload(FM_A, [
      position(ballsP1, {
        S1: entry("S1", {
          familyId: FM_A,
          memberId: auth,
          track: "B2T_L",
          memberOrigin: "AUTHORED",
        }),
      }),
      position(ballsP2, {
        S1: entry("S1", {
          familyId: FM_A,
          memberId: "mb_multi_sym",
          track: "B2T_R",
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: auth,
          symmetryOp: "V",
        }),
      }),
      position(ballsP3, {
        S1: entry("S1", {
          familyId: FM_A,
          memberId: "mb_multi_der",
          track: "T2B_L",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: auth,
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "step1",
        }),
      }),
    ]);
    const result = apply(null, op("CREATE", FM_A), pl);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.familyMasters).toHaveLength(1);
    expect(result.envelope.familyMembers).toHaveLength(3);
  });

  it("CASE 24: DERIVED_CUE_C3_PRODUCT Member → PASS without special storage", () => {
    const auth = "mb_prod_auth";
    const pl = payload(FM_A, [
      position(ballsP1, {
        S1: entry("S1", {
          familyId: FM_A,
          memberId: auth,
          track: "B2T_L",
          memberOrigin: "AUTHORED",
        }),
      }),
      position(ballsP2, {
        S1: entry("S1", {
          familyId: FM_A,
          memberId: "mb_prod_member",
          track: "B2T_L",
          memberOrigin: "DERIVED_CUE_C3_PRODUCT",
          generatedFromMemberId: auth,
          derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
          derivedStep: "product:0",
        }),
      }),
    ]);
    const result = apply(null, op("CREATE", FM_A), pl);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const product = result.envelope.familyMembers.find(
      (m) => m.memberId === "mb_prod_member"
    );
    expect(product?.memberOrigin).toBe("DERIVED_CUE_C3_PRODUCT");
    expect(product?.derivedRule).toBe("CUE_C3_CARTESIAN_PRODUCT_V1");
  });

  it("CASE 25: Master common payload once — no Member strategy duplication", () => {
    const result = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const member = result.envelope.familyMembers[0]!;
    expect(
      memberHasForbiddenCommonPayload(member as unknown as Record<string, unknown>)
    ).toBe(false);
    for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
      expect(
        Object.prototype.hasOwnProperty.call(member, key),
        `member must not own Master field ${key}`
      ).toBe(false);
    }
    const master = result.envelope.familyMasters[0]!;
    expect(master.sysInputs).toBeTruthy();
    expect(master.corrections).toBeTruthy();
    expect(master.ai).toBeTruthy();
    expect(master.str).toBeTruthy();
    expect(master.hpT).toBeTruthy();
  });

  it("conversion + rematerialize parity (SYS/corrections/AI/STR/HPT/track/ids)", () => {
    const pl = familyPayload(FM_A, "mb_parity", ballsP1, "S1", {
      aiText: "parity-lesson",
      sysValue: 33,
      track: "T2B_R",
    });
    const converted = convertPublishFamilyPayloadToNormalizedFamily(pl);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(converted.master.sysInputs?.CO_f).toBe(33);
    expect(converted.master.ai).toEqual({ text: "parity-lesson" });
    expect(converted.members[0]!.track).toBe("T2B_R");
    expect(converted.members[0]!.memberId).toBe("mb_parity");
    expect(converted.members[0]!.sourceSlot).toBe("S1");

    const remat = rematerializeNormalizedFamilyForParity(converted);
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    const slot = remat.records[0]!.strategies.S1!;
    expect(slot.familyId).toBe(FM_A);
    expect(slot.memberId).toBe("mb_parity");
    expect(slot.sysInputs?.CO_f).toBe(33);
    expect(slot.ai).toEqual({ text: "parity-lesson" });
    expect(slot.track).toBe("T2B_R");
    expect(slot.corrections).toBeTruthy();
    expect(slot.str).toBeTruthy();
    expect(slot.hpT).toBeTruthy();
  });

  it("semantic equality helper is order-insensitive for Masters/Members", () => {
    const r = apply(
      null,
      op("CREATE", FM_A),
      familyPayload(FM_A, "mb_a1", ballsP1)
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const withB = apply(
      r.envelope,
      op("CREATE", FM_B),
      familyPayload(FM_B, "mb_b1", ballsP2)
    );
    expect(withB.ok).toBe(true);
    if (!withB.ok) return;
    const shuffled = {
      ...withB.envelope,
      familyMasters: [...withB.envelope.familyMasters].reverse(),
      familyMembers: [...withB.envelope.familyMembers].reverse(),
    };
    expect(
      normalizedPublishedLeavesSemanticallyEqual(withB.envelope, shuffled)
    ).toBe(true);
  });

  it("CREATE retry vs occupancy collision are distinct contracts", () => {
    // Allowed: same destinationFamilyId → idempotent CREATE retry
    const first = apply(
      null,
      op("CREATE", FM_D),
      familyPayload(FM_D, "mb_d1", ballsP1, "S1")
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const retry = apply(
      first.envelope,
      op("CREATE", FM_D),
      familyPayload(FM_D, "mb_d1", ballsP1, "S1", { aiText: "retry" })
    );
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.createRetryReplaced).toBe(true);

    // Forbidden: different familyId + same Position+Slot
    const other = apply(
      retry.envelope,
      op("CREATE", FM_C),
      familyPayload(FM_C, "mb_c1", ballsP1, "S1")
    );
    expect(other.ok).toBe(false);
    if (other.ok) return;
    expect(other.code).toBe("POSITION_STRATEGY_SLOT_CONFLICT");
  });
});
