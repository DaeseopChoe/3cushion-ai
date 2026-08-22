/**
 * Phase 3A-321 Phase A — normalized FamilyMaster / FamilyMember store + hydrate.
 * Run: npx vitest run src/domain/family/familyNormalizedStorage.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { WORKING_DATASET_KEY } from "../dataset/infra/datasetStorage";
import { WORKSPACE_HISTORY_KEY } from "../workspaceHistory";
import {
  familyCompatibilityFingerprint,
  hydrateFamilyMemberToPositionRecord,
  splitPositionRecordToFamilyParts,
} from "./familyHydrate";
import { isFamilyNormalizedStorageEnabled } from "./familyNormalizedFlag";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  memberHasForbiddenCommonPayload,
  type FamilyMaster,
  type FamilyMember,
} from "./familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  commitFamilyMasterWithMembers,
  readFamilyMaster,
  readFamilyMember,
  readFamilyMembersByFamilyId,
  upsertFamilyMaster,
  upsertFamilyMember,
  validateFamilyStore,
} from "./familyNormalizedStore";

function createMemoryLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

const canonicalHpt = {
  T: "-3/8",
  hit_point: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
};

const signature = {
  systemId: "5_half_system",
  formulaHash: "h1",
  shotType: "뒤돌리기",
};

const sysInputs = { CO_f: 30, C1_f: 10, C3_r: 20 };

function baseMaster(overrides: Partial<FamilyMaster> = {}): FamilyMaster {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId: "fm_family1",
    signature,
    sysInputs,
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    ai: { text: "keep" },
    str: { speed: 2.5 },
    hpT: canonicalHpt,
    ...overrides,
  };
}

function baseMember(
  overrides: Partial<FamilyMember> &
    Pick<FamilyMember, "memberId" | "balls" | "track" | "memberOrigin">
): FamilyMember {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId: "fm_family1",
    targetBall: "red",
    authoringStrategyId: "as_authored",
    sourceSlot: "S1",
    ...overrides,
  };
}

function authoredRecord(): PositionRecord {
  const balls = {
    cue: { x: 10, y: 8 },
    target: { x: 40, y: 20 },
    second: { x: 62, y: 12 },
  };
  const entry: StrategyEntry = {
    slot: "S1",
    signature,
    sysInputs,
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    ai: { text: "keep" },
    str: { speed: 2.5 },
    hpT: canonicalHpt,
    authoringStrategyId: "as_authored",
    familyId: "fm_family1",
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
  };
  return {
    positionId: "100080400200620120",
    balls,
    targetBall: "red",
    strategies: { S1: entry },
    schemaVersion: 2,
  };
}

/** Representative 1 family × 4 tracks × (1 + 3 derived) = 16 members. */
function buildSixteenMemberFixture(): {
  master: FamilyMaster;
  members: FamilyMember[];
} {
  const master = baseMaster();
  const tracks = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const;
  const ops = [undefined, "H", "V", "RPI"] as const;
  const members: FamilyMember[] = [];

  tracks.forEach((track, ti) => {
    const sourceId = `mb_src_${track}`;
    const sourceBalls = {
      cue: { x: 10 + ti * 5, y: 8 + ti },
      target: { x: 40 + ti, y: 20 },
      second: { x: 62, y: 12 + ti },
    };
    if (ti === 0) {
      members.push(
        baseMember({
          memberId: sourceId,
          balls: sourceBalls,
          track,
          memberOrigin: "AUTHORED",
          authoringStrategyId: "as_authored",
        })
      );
    } else {
      members.push(
        baseMember({
          memberId: sourceId,
          balls: sourceBalls,
          track,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: "mb_src_B2T_L",
          symmetryOp: ops[ti],
          authoringStrategyId: `as_sym_${track}`,
        })
      );
    }
    for (let k = 1; k <= 3; k += 1) {
      const t = (0.1 * k).toFixed(6);
      members.push(
        baseMember({
          memberId: `mb_der_${track}_${k}`,
          balls: {
            cue: { x: sourceBalls.cue.x + k * 0.5, y: sourceBalls.cue.y },
            target: { x: sourceBalls.target.x, y: sourceBalls.target.y + k },
            second: sourceBalls.second,
          },
          track,
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: sourceId,
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: `cue_impact:t:${t}`,
          authoringStrategyId: `as_der_${track}_${k}`,
        })
      );
    }
  });

  return { master, members };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearFamilyNormalizedStoresForTests();
  localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify([{ keep: true }]));
  localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify([{ keep: "history" }]));
});

describe("Phase A feature flag", () => {
  it("controlled enable default ON (READ gate only; WRITE SSOT still positions)", () => {
    expect(isFamilyNormalizedStorageEnabled()).toBe(true);
  });
});

describe("FamilyMaster / FamilyMember store invariants", () => {
  it("enforces one familyId → one FamilyMaster", () => {
    const first = upsertFamilyMaster(baseMaster({ ai: { text: "a" } }));
    expect(first.ok).toBe(true);
    const second = upsertFamilyMaster(baseMaster({ ai: { text: "b" } }));
    expect(second.ok).toBe(true);
    const env = JSON.parse(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)!);
    expect(Object.keys(env.masters)).toHaveLength(1);
    expect(readFamilyMaster("fm_family1")?.ai).toEqual({ text: "b" });
  });

  it("rejects orphan FamilyMember upsert", () => {
    const result = upsertFamilyMember(
      baseMember({
        memberId: "mb_orphan",
        balls: {
          cue: { x: 1, y: 1 },
          target: { x: 2, y: 2 },
          second: { x: 3, y: 3 },
        },
        track: "B2T_L",
        memberOrigin: "AUTHORED",
      })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ORPHAN_MEMBER");
  });

  it("rejects FamilyMember carrying family-common writable payload", () => {
    upsertFamilyMaster(baseMaster());
    const dirty = {
      ...baseMember({
        memberId: "mb_dirty",
        balls: {
          cue: { x: 1, y: 1 },
          target: { x: 2, y: 2 },
          second: { x: 3, y: 3 },
        },
        track: "B2T_L",
        memberOrigin: "AUTHORED",
      }),
      sysInputs: { CO_f: 1 },
    } as FamilyMember;
    expect(memberHasForbiddenCommonPayload(dirty as unknown as Record<string, unknown>)).toBe(
      true
    );
    const result = upsertFamilyMember(dirty);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN_COMMON_PAYLOAD");
  });

  it("deterministic upsert replaces same memberId", () => {
    upsertFamilyMaster(baseMaster());
    const a = upsertFamilyMember(
      baseMember({
        memberId: "mb_one",
        balls: {
          cue: { x: 1, y: 1 },
          target: { x: 2, y: 2 },
          second: { x: 3, y: 3 },
        },
        track: "B2T_L",
        memberOrigin: "AUTHORED",
      })
    );
    expect(a.ok).toBe(true);
    const b = upsertFamilyMember(
      baseMember({
        memberId: "mb_one",
        balls: {
          cue: { x: 9, y: 9 },
          target: { x: 2, y: 2 },
          second: { x: 3, y: 3 },
        },
        track: "B2T_L",
        memberOrigin: "AUTHORED",
      })
    );
    expect(b.ok).toBe(true);
    expect(readFamilyMembersByFamilyId("fm_family1")).toHaveLength(1);
    expect(readFamilyMember("mb_one")?.balls.cue).toEqual({ x: 9, y: 9 });
  });

  it("commitFamilyMasterWithMembers writes 1 master + 16 members without common duplication", () => {
    const { master, members } = buildSixteenMemberFixture();
    expect(members).toHaveLength(16);
    const result = commitFamilyMasterWithMembers({ master, members });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.validation.masterCount).toBe(1);
    expect(result.validation.memberCount).toBe(16);
    expect(result.validation.orphanCount).toBe(0);
    expect(result.validation.duplicateMemberIdCount).toBe(0);

    const storedMembers = Object.values(
      JSON.parse(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)!).members
    );
    expect(storedMembers).toHaveLength(16);
    for (const row of storedMembers) {
      for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(row, key)).toBe(false);
      }
    }
    expect(readFamilyMaster("fm_family1")?.hpT).toEqual(canonicalHpt);
  });

  it("does not mutate positions_dataset or workspace_history", () => {
    const { master, members } = buildSixteenMemberFixture();
    commitFamilyMasterWithMembers({ master, members });
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(
      JSON.stringify([{ keep: true }])
    );
    expect(localStorage.getItem(WORKSPACE_HISTORY_KEY)).toBe(
      JSON.stringify([{ keep: "history" }])
    );
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeTruthy();
  });
});

describe("hydrate / split round-trip", () => {
  it("AUTHORED: PositionRecord → split → hydrate preserves meaningful fields", () => {
    const original = authoredRecord();
    const split = splitPositionRecordToFamilyParts(original, "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(memberHasForbiddenCommonPayload(split.member as unknown as Record<string, unknown>)).toBe(
      false
    );
    expect(split.master.hpT).toEqual(canonicalHpt);
    expect(split.member.memberOrigin).toBe("AUTHORED");

    const hydrated = hydrateFamilyMemberToPositionRecord(split.master, split.member, {
      slot: "S1",
      positionId: original.positionId,
      meta: original.strategies.S1!.meta,
    });
    expect(familyCompatibilityFingerprint(hydrated, "S1")).toEqual(
      familyCompatibilityFingerprint(original, "S1")
    );
  });

  it("SYMMETRY round-trip preserves symmetryOp + generatedFromMemberId", () => {
    const original = authoredRecord();
    const entry = original.strategies.S1!;
    entry.memberId = "mb_sym_h";
    entry.memberOrigin = "SYMMETRY";
    entry.generatedFromMemberId = "mb_authored";
    entry.symmetryOp = "H";
    entry.track = "B2T_R";
    entry.authoringStrategyId = "as_sym_h";

    const split = splitPositionRecordToFamilyParts(original, "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(split.member.symmetryOp).toBe("H");
    expect(split.member.generatedFromMemberId).toBe("mb_authored");

    const hydrated = hydrateFamilyMemberToPositionRecord(split.master, split.member, {
      slot: "S1",
      positionId: original.positionId,
      meta: entry.meta,
    });
    expect(hydrated.strategies.S1?.symmetryOp).toBe("H");
    expect(hydrated.strategies.S1?.generatedFromMemberId).toBe("mb_authored");
    expect(hydrated.strategies.S1?.track).toBe("B2T_R");
    expect(hydrated.strategies.S1?.sysInputs).toEqual(sysInputs);
  });

  it("DERIVED_CUE_IMPACT round-trip preserves derivedRule/step and balls", () => {
    const original = authoredRecord();
    const entry = original.strategies.S1!;
    entry.memberId = "mb_derived_1";
    entry.memberOrigin = "DERIVED_CUE_IMPACT";
    entry.generatedFromMemberId = "mb_authored";
    entry.derivedRule = "CUE_IMPACT_FIRST_30PCT";
    entry.derivedStep = "cue_impact:t:0.100000";
    entry.track = "B2T_L";
    original.balls = {
      cue: { x: 11, y: 8 },
      target: { x: 40, y: 20 },
      second: { x: 62, y: 12 },
    };

    const split = splitPositionRecordToFamilyParts(original, "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(split.member.derivedRule).toBe("CUE_IMPACT_FIRST_30PCT");
    expect(split.member.derivedStep).toBe("cue_impact:t:0.100000");
    expect(split.member.balls.cue).toEqual({ x: 11, y: 8 });
    expect(split.member.balls.target).toEqual({ x: 40, y: 20 });
    expect(split.member.balls.second).toEqual({ x: 62, y: 12 });

    const hydrated = hydrateFamilyMemberToPositionRecord(split.master, split.member, {
      slot: "S1",
      meta: entry.meta,
    });
    expect(hydrated.balls).toEqual(original.balls);
    expect(hydrated.targetBall).toBe("red");
    expect(hydrated.strategies.S1?.derivedRule).toBe("CUE_IMPACT_FIRST_30PCT");
    expect(hydrated.strategies.S1?.derivedStep).toBe("cue_impact:t:0.100000");
    expect(hydrated.strategies.S1?.hpT).toEqual(canonicalHpt);
  });

  it("hydrate injects Master common payload for existing consumers", () => {
    const master = baseMaster();
    const member = baseMember({
      memberId: "mb_authored",
      balls: {
        cue: { x: 10, y: 8 },
        target: { x: 40, y: 20 },
        second: { x: 62, y: 12 },
      },
      track: "B2T_L",
      memberOrigin: "AUTHORED",
    });
    const record = hydrateFamilyMemberToPositionRecord(master, member, { slot: "S2" });
    expect(record.strategies.S2?.signature).toEqual(signature);
    expect(record.strategies.S2?.sysInputs).toEqual(sysInputs);
    expect(record.strategies.S2?.correctionsStored).toBe(true);
    expect(record.strategies.S2?.slot).toBe("S2");
    expect(record.strategies.S2?.meta).toBeTruthy();
  });
});

describe("store validation", () => {
  it("validateFamilyStore reports healthy 16-member fixture", () => {
    const { master, members } = buildSixteenMemberFixture();
    const committed = commitFamilyMasterWithMembers({ master, members });
    expect(committed.ok).toBe(true);
    const validation = validateFamilyStore();
    expect(validation).toEqual({
      ok: true,
      masterCount: 1,
      memberCount: 16,
      orphanCount: 0,
      duplicateMemberIdCount: 0,
    });
  });
});
