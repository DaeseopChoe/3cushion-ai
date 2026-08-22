/**
 * Phase 3A-324 B5 — Compatibility read adapter tests.
 * Run: npx vitest run src/domain/family/loadFamilyCompatibleDataset.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKING_DATASET_KEY } from "../dataset/infra/datasetStorage";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { WORKSPACE_HISTORY_KEY } from "../workspaceHistory";
import { familyCompatibilityFingerprint } from "./familyHydrate";
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
  persistMigratedFamilyParts,
} from "./familyNormalizedStore";
import {
  hydrateFamilyPartsToCompatibleDataset,
  loadFamilyCompatibleDataset,
} from "./loadFamilyCompatibleDataset";
import { migratePositionRecordsToFamilyParts } from "./migratePositionRecordsToFamilyParts";

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

function authoredEntry(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
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

/** Handcrafted 1 Master worth of legacy records → 16 members after migrate.
 * Exact balls are unique across all records (no Exact-ball collision).
 */
function buildSixteenMemberLegacyDataset(): PositionRecord[] {
  const tracks = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const;
  const ops = [null, "H", "V", "RPI"] as const;
  const dataset: PositionRecord[] = [];
  tracks.forEach((track, ti) => {
    const sourceId = ti === 0 ? "mb_authored" : `mb_sym_${track}`;
    const sourceBalls = {
      cue: { x: 10 + ti * 5, y: 8 + ti },
      target: { x: 40 + ti, y: 20 },
      second: { x: 62, y: 12 + ti },
    };
    dataset.push({
      positionId: `pos_src_${track}`,
      balls: sourceBalls,
      targetBall: "red",
      strategies: {
        S1: authoredEntry({
          memberId: sourceId,
          track,
          memberOrigin: ti === 0 ? "AUTHORED" : "SYMMETRY",
          ...(ti === 0
            ? {}
            : {
                generatedFromMemberId: "mb_authored",
                symmetryOp: ops[ti] as "H" | "V" | "RPI",
                authoringStrategyId: `as_${track}`,
              }),
        }),
      },
    });
    for (let k = 1; k <= 3; k += 1) {
      dataset.push({
        positionId: `pos_der_${track}_${k}`,
        balls: {
          cue: { x: sourceBalls.cue.x + k * 0.5, y: sourceBalls.cue.y },
          target: { x: sourceBalls.target.x, y: sourceBalls.target.y + k },
          second: sourceBalls.second,
        },
        targetBall: "red",
        strategies: {
          S1: authoredEntry({
            memberId: `mb_der_${track}_${k}`,
            track,
            memberOrigin: "DERIVED_CUE_IMPACT",
            generatedFromMemberId: sourceId,
            derivedRule: "CUE_IMPACT_FIRST_30PCT",
            derivedStep: `cue_impact:t:${(0.1 * k).toFixed(6)}`,
            authoringStrategyId: `as_der_${track}_${k}`,
            symmetryOp: undefined,
          }),
        },
      });
    }
  });
  return dataset;
}

function persistSixteenFixture() {
  const legacy = buildSixteenMemberLegacyDataset();
  const migrated = migratePositionRecordsToFamilyParts(legacy);
  if (!migrated.ok) throw new Error(JSON.stringify(migrated.issues));
  const persisted = persistMigratedFamilyParts({
    masters: migrated.masters,
    members: migrated.members,
    corpusGeneration: 1,
  });
  if (!persisted.ok) throw new Error(persisted.reason);
  return { legacy, migrated };
}

function entryOf(record: PositionRecord): StrategyEntry {
  const entry = Object.values(record.strategies)[0];
  if (!entry) throw new Error("missing strategy");
  return entry;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearFamilyNormalizedStoresForTests();
  localStorage.setItem(
    WORKING_DATASET_KEY,
    JSON.stringify([{ sentinel: "positions_dataset" }])
  );
  localStorage.setItem(
    WORKSPACE_HISTORY_KEY,
    JSON.stringify([{ sentinel: "workspace_history" }])
  );
});

describe("feature flag / production isolation", () => {
  it("flag default ON (compatible load remains READ-only)", () => {
    expect(isFamilyNormalizedStorageEnabled()).toBe(true);
  });

  it("does not mutate positions_dataset or workspace_history", () => {
    persistSixteenFixture();
    const beforePos = localStorage.getItem(WORKING_DATASET_KEY);
    const beforeHist = localStorage.getItem(WORKSPACE_HISTORY_KEY);
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(beforePos);
    expect(localStorage.getItem(WORKSPACE_HISTORY_KEY)).toBe(beforeHist);
  });
});

describe("loadFamilyCompatibleDataset success path", () => {
  it("hydrates valid normalized store to PositionRecord[]", () => {
    const { migrated } = persistSixteenFixture();
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.source).toBe("normalized");
    expect(loaded.masterCount).toBe(1);
    expect(loaded.memberCount).toBe(16);
    expect(loaded.dataset).toHaveLength(16);
    expect(migrated.members).toHaveLength(16);
    // Phase 3A-345: one Exact bucket → one record; no duplicate positionIds
    const ids = loaded.dataset.map((r) => r.positionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("injects Master common payload; Member has no common duplication", () => {
    persistSixteenFixture();
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    for (const record of loaded.dataset) {
      const entry = entryOf(record);
      expect(entry.signature.systemId).toBe("5_half_system");
      expect(entry.sysInputs).toEqual({ CO_f: 30, C1_f: 10, C3_r: 20 });
      expect(entry.hpT).toEqual(canonicalHpt);
      expect(entry.ai).toEqual({ text: "keep" });
      expect(entry.str).toEqual({ speed: 2.5 });
      expect(entry.correctionsStored).toBe(true);
    }
    const rawMembers = JSON.parse(
      localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)!
    ).members;
    for (const row of Object.values(rawMembers) as Record<string, unknown>[]) {
      expect(memberHasForbiddenCommonPayload(row)).toBe(false);
      for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(row, key)).toBe(false);
      }
    }
  });

  it("preserves cue/target/second exact from FamilyMember", () => {
    const { migrated } = persistSixteenFixture();
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const byId = new Map(migrated.members.map((m) => [m.memberId, m]));
    for (const record of loaded.dataset) {
      const entry = entryOf(record);
      const member = byId.get(entry.memberId!)!;
      expect(record.balls.cue).toEqual(member.balls.cue);
      expect(record.balls.target).toEqual(member.balls.target);
      expect(record.balls.second).toEqual(member.balls.second);
      expect(record.balls.cue.x).toBe(member.balls.cue.x);
      expect(record.balls.cue.y).toBe(member.balls.cue.y);
      expect(record.balls.target.x).toBe(member.balls.target.x);
      expect(record.balls.target.y).toBe(member.balls.target.y);
      expect(record.balls.second.x).toBe(member.balls.second.x);
      expect(record.balls.second.y).toBe(member.balls.second.y);
    }
  });

  it("preserves AUTHORED / SYMMETRY / DERIVED provenance", () => {
    persistSixteenFixture();
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const authored = loaded.dataset.find(
      (r) => entryOf(r).memberOrigin === "AUTHORED"
    )!;
    expect(entryOf(authored).memberId).toBe("mb_authored");
    expect(entryOf(authored).symmetryOp).toBeUndefined();

    const sym = loaded.dataset.find(
      (r) => entryOf(r).memberOrigin === "SYMMETRY"
    )!;
    expect(entryOf(sym).generatedFromMemberId).toBe("mb_authored");
    expect(["H", "V", "RPI"]).toContain(entryOf(sym).symmetryOp);
    expect(entryOf(sym).track).toBeTruthy();

    const derived = loaded.dataset.filter(
      (r) => entryOf(r).memberOrigin === "DERIVED_CUE_IMPACT"
    );
    expect(derived).toHaveLength(12);
    for (const record of derived) {
      const e = entryOf(record);
      expect(e.familyId).toBe("fm_family1");
      expect(e.generatedFromMemberId).toBeTruthy();
      expect(e.derivedRule).toBe("CUE_IMPACT_FIRST_30PCT");
      expect(e.derivedStep?.startsWith("cue_impact:t:")).toBe(true);
      expect(e.track).toBeTruthy();
      expect(e.memberId).toBeTruthy();
    }
  });

  it("meaningful-field compatible with migrate→hydrate path", () => {
    const { migrated } = persistSixteenFixture();
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const direct = hydrateFamilyPartsToCompatibleDataset({
      masters: migrated.masters,
      members: migrated.members,
    });
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    const loadedById = new Map(
      loaded.dataset.map((r) => [entryOf(r).memberId!, r])
    );
    for (const record of direct.dataset) {
      const id = entryOf(record).memberId!;
      const fromStore = loadedById.get(id)!;
      expect(familyCompatibilityFingerprint(fromStore, "S1")).toEqual(
        familyCompatibilityFingerprint(record, "S1")
      );
    }
  });

  it("deterministic rematerialize order by canonical positionId", () => {
    const { migrated } = persistSixteenFixture();
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const ids = loaded.dataset.map((r) => r.positionId);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    // Every migrated member appears exactly once across packed records
    const memberIds = loaded.dataset.flatMap((r) =>
      Object.values(r.strategies).map((e) => e!.memberId)
    );
    expect(new Set(memberIds).size).toBe(migrated.members.length);
    expect(memberIds.sort()).toEqual(
      migrated.members.map((m) => m.memberId).sort()
    );
  });
});

describe("loadFamilyCompatibleDataset fail-closed", () => {
  it("orphan Member (missing Master) fails with no partial dataset", () => {
    localStorage.setItem(
      FAMILY_MASTERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        masters: {},
      })
    );
    localStorage.setItem(
      FAMILY_MEMBERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        members: {
          mb_orphan: {
            schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
            memberId: "mb_orphan",
            familyId: "fm_missing",
            balls: {
              cue: { x: 1, y: 1 },
              target: { x: 2, y: 2 },
              second: { x: 3, y: 3 },
            },
            track: "B2T_L",
            memberOrigin: "AUTHORED",
            sourceSlot: "S1",
          },
        },
      })
    );
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.issues[0]?.code).toBe("ORPHAN_MEMBER");
  });

  it("schemaVersion mismatch fails", () => {
    persistSixteenFixture();
    const masters = JSON.parse(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)!);
    masters.schemaVersion = 999;
    localStorage.setItem(FAMILY_MASTERS_STORAGE_KEY, JSON.stringify(masters));
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.issues[0]?.code).toBe("SCHEMA_MISMATCH");
  });

  it("duplicate memberId key conflict fails validation", () => {
    // Map keys are unique; simulate via validate path with two envelopes built incorrectly
    // by writing a member whose map key !== memberId (FK_MISMATCH in validateFamilyStore).
    persistSixteenFixture();
    const members = JSON.parse(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)!);
    const firstId = Object.keys(members.members)[0]!;
    const row = members.members[firstId];
    members.members["mb_alias_key"] = { ...row, memberId: firstId };
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(members));
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
  });

  it("FK familyId mismatch fails", () => {
    persistSixteenFixture();
    const members = JSON.parse(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)!);
    const firstId = Object.keys(members.members)[0]!;
    members.members[firstId] = {
      ...members.members[firstId],
      familyId: "fm_other_family",
    };
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(members));
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(
      ["ORPHAN_MEMBER", "FK_MISMATCH", "INVALID_IDENTITY"].includes(
        loaded.issues[0]?.code ?? ""
      )
    ).toBe(true);
  });

  it("corrupt JSON yields empty/invalid and does not return partial success with orphans", () => {
    localStorage.setItem(FAMILY_MASTERS_STORAGE_KEY, "{not-json");
    localStorage.setItem(
      FAMILY_MEMBERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        members: {
          mb_x: {
            schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
            memberId: "mb_x",
            familyId: "fm_x",
            balls: {
              cue: { x: 1, y: 1 },
              target: { x: 2, y: 2 },
              second: { x: 3, y: 3 },
            },
            track: "B2T_L",
            memberOrigin: "AUTHORED",
            sourceSlot: "S1",
          },
        },
      })
    );
    // corrupt masters → empty masters envelope; members orphan → fail
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
  });

  it("Master missing required common payload fails normalize/validate", () => {
    localStorage.setItem(
      FAMILY_MASTERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        masters: {
          fm_family1: {
            schemaVersion: 1,
            familyId: "fm_family1",
            // missing signature / sysInputs
          },
        },
      })
    );
    localStorage.setItem(
      FAMILY_MEMBERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        members: {
          mb_authored: {
            schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
            memberId: "mb_authored",
            familyId: "fm_family1",
            balls: {
              cue: { x: 1, y: 1 },
              target: { x: 2, y: 2 },
              second: { x: 3, y: 3 },
            },
            track: "B2T_L",
            memberOrigin: "AUTHORED",
            sourceSlot: "S1",
          },
        },
      })
    );
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
  });

  it("Member carrying forbidden common payload fails", () => {
    const master: FamilyMaster = {
      schemaVersion: 1,
      familyId: "fm_family1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "h1",
        shotType: "뒤돌리기",
      },
      sysInputs: { CO_f: 1 },
    };
    const dirty = {
      schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
      memberId: "mb_authored",
      familyId: "fm_family1",
      balls: {
        cue: { x: 1, y: 1 },
        target: { x: 2, y: 2 },
        second: { x: 3, y: 3 },
      },
      track: "B2T_L",
      memberOrigin: "AUTHORED" as const,
      sourceSlot: "S1" as const,
      sysInputs: { CO_f: 99 },
    };
    localStorage.setItem(
      FAMILY_MASTERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        masters: { fm_family1: master },
      })
    );
    localStorage.setItem(
      FAMILY_MEMBERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        members: { mb_authored: dirty },
      })
    );
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.issues[0]?.code).toBe("FORBIDDEN_COMMON_PAYLOAD");
  });

  it("in-memory hydrate helper fails closed on orphan without partial dataset", () => {
    const members: FamilyMember[] = [
      {
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        memberId: "mb_a",
        familyId: "fm_family1",
        balls: {
          cue: { x: 1, y: 1 },
          target: { x: 2, y: 2 },
          second: { x: 3, y: 3 },
        },
        track: "B2T_L",
        memberOrigin: "AUTHORED",
        sourceSlot: "S1",
      },
    ];
    const result = hydrateFamilyPartsToCompatibleDataset({
      masters: [],
      members,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.code).toBe("ORPHAN_MEMBER");
  });
});
