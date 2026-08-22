/**
 * Phase 3A-345 — Exact-ball rematerialization + sourceSlot packing contract.
 * Run: npx vitest run src/domain/family/rematerializeFamilyParts.contract.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ballsExactEqual } from "../cueEditSnap";
import { WORKING_DATASET_KEY } from "../dataset/infra/datasetStorage";
import {
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  writePositionsDatasetCorpusGeneration,
} from "../dataset/infra/positionsDatasetMeta";
import { persistPositionsDatasetWithGeneration } from "../dataset/infra/persistPositionsDatasetWithGeneration";
import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { runSpatialRecall } from "../recall/recallEngine";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import {
  clearFamilyNormalizedStorageEnabledForTests,
  forceFamilyNormalizedStorageEnabledForTests,
} from "./familyNormalizedFlag";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
} from "./familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMembersEnvelope,
  persistMigratedFamilyParts,
} from "./familyNormalizedStore";
import { isNormalizedCorpusFresh } from "./familyCorpusFreshness";
import { syncPositionDatasetToNormalizedFamilyStore } from "./syncPositionDatasetToNormalizedFamilyStore";
import { loadFamilyCompatibleDataset } from "./loadFamilyCompatibleDataset";
import { loadProductionCompatibleDataset } from "./loadProductionCompatibleDataset";
import { migratePositionRecordsToFamilyParts } from "./migratePositionRecordsToFamilyParts";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";
import {
  ONE_POINT_LESSON_LIBRARY_STORAGE_KEY,
  runWorkspaceLocalStorageCleanup,
  WORKSPACE_CLEANUP_PRESERVE_DATASET,
} from "../../hooks/useSettings.js";
import { familyCompatibilityFingerprint } from "./familyHydrate";

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

const ballsX: Ball3 = {
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

function entry(
  overrides: Partial<StrategyEntry> &
    Pick<StrategyEntry, "familyId" | "memberId" | "slot">
): StrategyEntry {
  return {
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
    authoringStrategyId: `as_${overrides.memberId}`,
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

function multiSlotLegacy(): PositionRecord {
  return {
    positionId: createPositionId(ballsX),
    balls: ballsX,
    targetBall: "red",
    schemaVersion: 1,
    strategies: {
      S1: entry({
        slot: "S1",
        familyId: "fm_a",
        memberId: "mb_a",
        memberOrigin: "AUTHORED",
      }),
      S2: entry({
        slot: "S2",
        familyId: "fm_b",
        memberId: "mb_b",
        memberOrigin: "AUTHORED",
        track: "B2T_R",
        authoringStrategyId: "as_b",
      }),
    },
  };
}

function threeSlotLegacy(): PositionRecord {
  const base = multiSlotLegacy();
  return {
    ...base,
    strategies: {
      ...base.strategies,
      S3: entry({
        slot: "S3",
        familyId: "fm_c",
        memberId: "mb_c",
        memberOrigin: "AUTHORED",
        track: "T2B_L",
        authoringStrategyId: "as_c",
      }),
    },
  };
}

/** Two families cannot share one AUTHORED master seed under same familyId —
 * multi-slot uses distinct familyIds so migrate yields multiple masters. */
function migrateOk(dataset: PositionRecord[]) {
  const migrated = migratePositionRecordsToFamilyParts(dataset);
  expect(migrated.ok).toBe(true);
  if (!migrated.ok) throw new Error(JSON.stringify(migrated.issues));
  return migrated;
}

function persistAndSync(dataset: PositionRecord[], gen = 7) {
  localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(dataset));
  writePositionsDatasetCorpusGeneration(gen);
  const migrated = migrateOk(dataset);
  const persisted = persistMigratedFamilyParts({
    masters: migrated.masters,
    members: migrated.members,
    corpusGeneration: gen,
  });
  expect(persisted.ok).toBe(true);
  expect(isNormalizedCorpusFresh()).toBe(true);
  return migrated;
}

describe("Phase 3A-345 rematerialize / sourceSlot packing", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    clearFamilyNormalizedStoresForTests();
    clearPositionsDatasetMetaForTests();
    clearFamilyNormalizedStorageEnabledForTests();
  });

  it("A multiSlotParity: one Exact record S1+S2 round-trips to one packed record", () => {
    const legacy = [multiSlotLegacy()];
    const migrated = persistAndSync(legacy);
    expect(migrated.members.every((m) => m.sourceSlot === "S1" || m.sourceSlot === "S2")).toBe(
      true
    );
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.dataset).toHaveLength(1);
    const rec = loaded.dataset[0]!;
    expect(rec.positionId).toBe(createPositionId(ballsX));
    expect(ballsExactEqual(rec.balls, ballsX)).toBe(true);
    expect(rec.strategies.S1?.memberId).toBe("mb_a");
    expect(rec.strategies.S2?.memberId).toBe("mb_b");
    expect(rec.strategies.S3).toBeUndefined();
    expect(new Set(loaded.dataset.map((r) => r.positionId)).size).toBe(1);
  });

  it("B threeSlotParity: S1/S2/S3 pack into one PositionRecord", () => {
    const legacy = [threeSlotLegacy()];
    persistAndSync(legacy);
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.dataset).toHaveLength(1);
    const rec = loaded.dataset[0]!;
    expect(rec.strategies.S1?.memberId).toBe("mb_a");
    expect(rec.strategies.S2?.memberId).toBe("mb_b");
    expect(rec.strategies.S3?.memberId).toBe("mb_c");
  });

  it("C sameBallsSeparateRecordProtection: rematerialize never fans out Exact balls", () => {
    persistAndSync([multiSlotLegacy()]);
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const sameBalls = loaded.dataset.filter((r) => ballsExactEqual(r.balls, ballsX));
    expect(sameBalls).toHaveLength(1);
  });

  it("D authoredPreferredSlotS2: four-track authored stays on S2 after rematerialize", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: ballsX,
      targetBall: "red",
      entry: entry({
        slot: "S2",
        familyId: "fm_s2",
        memberId: "mb_s2",
        memberOrigin: "AUTHORED",
      }),
    }, { preferredAuthoredSlot: "S2" });
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const authoredRec = written.dataset.find((r) =>
      ballsExactEqual(r.balls, ballsX)
    )!;
    expect(authoredRec.strategies.S2?.memberId).toBe("mb_s2");
    expect(authoredRec.strategies.S1).toBeUndefined();

    persistAndSync(written.dataset, 3);
    const members = loadFamilyMembersEnvelope().members;
    const authoredMember = Object.values(members).find(
      (m) => m.memberId === "mb_s2"
    )!;
    expect(authoredMember.sourceSlot).toBe("S2");

    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const again = loaded.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(again.strategies.S2?.memberId).toBe("mb_s2");
    expect(again.strategies.S1?.memberId).not.toBe("mb_s2");
  });

  it("E slotCollisionFailClosed: same Exact + same sourceSlot → invalid", () => {
    const migrated = persistAndSync([multiSlotLegacy()]);
    const twin = {
      ...migrated.members.find((m) => m.sourceSlot === "S1")!,
      memberId: "mb_collision",
    };
    const result = rematerializeFamilyPartsToPositionRecords({
      masters: migrated.masters,
      members: [...migrated.members, twin],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.code).toBe("SLOT_COLLISION");

    // Corrupt store: inject twin → production-compatible load fails
    const env = loadFamilyMembersEnvelope();
    env.members[twin.memberId] = twin;
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(env));
    forceFamilyNormalizedStorageEnabledForTests(true);
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("legacy");
    expect(["hydration_failed", "freshness_ineligible"]).toContain(prod.reason);
  });

  it("F oldFamilySchemaFallback: schema v1 without sourceSlot → not fresh / legacy", () => {
    persistAndSync([multiSlotLegacy()], 5);
    const masters = JSON.parse(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)!);
    const members = JSON.parse(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)!);
    masters.schemaVersion = 1;
    members.schemaVersion = 1;
    for (const m of Object.values(members.members) as Record<string, unknown>[]) {
      delete m.sourceSlot;
      m.schemaVersion = 1;
    }
    localStorage.setItem(FAMILY_MASTERS_STORAGE_KEY, JSON.stringify(masters));
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(members));
    expect(isNormalizedCorpusFresh()).toBe(false);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("legacy");
    expect(prod.reason).toBe("freshness_ineligible");
  });

  it("G adminLocalDbNormalizedParity: spatial recall identity matches legacy", () => {
    const legacy = [multiSlotLegacy()];
    persistAndSync(legacy);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const norm = loadProductionCompatibleDataset();
    expect(norm.source).toBe("normalized");
    const legacyHit = runSpatialRecall({
      dataset: legacy,
      query: { balls: ballsX, targetBall: "red" },
      profile: "adminSearch",
    });
    const normHit = runSpatialRecall({
      dataset: norm.dataset,
      query: { balls: ballsX, targetBall: "red" },
      profile: "adminSearch",
    });
    expect(legacyHit.kind).toBe("match");
    expect(normHit.kind).toBe("match");
    if (legacyHit.kind !== "match" || normHit.kind !== "match") return;
    expect(normHit.record.positionId).toBe(legacyHit.record.positionId);
    expect(normHit.record.balls).toEqual(legacyHit.record.balls);
    expect(normHit.record.targetBall).toBe(legacyHit.record.targetBall);
    expect(normHit.record.strategies.S1?.memberId).toBe(
      legacyHit.record.strategies.S1?.memberId
    );
    expect(normHit.record.strategies.S2?.memberId).toBe(
      legacyHit.record.strategies.S2?.memberId
    );
    expect(normHit.distance).toBe(legacyHit.distance);
  });

  it("H normalizedRecallEditSaveParity: sibling slots survive SAVE after rematerialize view", () => {
    const legacy = [multiSlotLegacy()];
    persistAndSync(legacy, 4);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const view = loadProductionCompatibleDataset();
    expect(view.source).toBe("normalized");
    expect(view.dataset[0]?.strategies.S2?.memberId).toBe("mb_b");

    // Simulate edit on S2 path: re-persist same packed dataset (SAVE corpus write)
    const afterSave = persistPositionsDatasetWithGeneration(view.dataset);
    expect(afterSave.ok).toBe(true);
    if (!afterSave.ok) return;
    const sync = syncPositionDatasetToNormalizedFamilyStore(view.dataset, {
      corpusGeneration: afterSave.corpusGeneration,
    });
    expect(sync.ok).toBe(true);
    const reloaded = loadProductionCompatibleDataset();
    expect(reloaded.source).toBe("normalized");
    expect(reloaded.dataset).toHaveLength(1);
    expect(reloaded.dataset[0]?.strategies.S1?.memberId).toBe("mb_a");
    expect(reloaded.dataset[0]?.strategies.S2?.memberId).toBe("mb_b");
  });

  it("I preserveRebuild: preserve → legacy → SAVE sync rebuilds sourceSlot → eligible", () => {
    persistAndSync([multiSlotLegacy()], 9);
    localStorage.setItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY, "[]");
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(loadPositionsDatasetCorpusGeneration()).toBe(9);
    forceFamilyNormalizedStorageEnabledForTests(true);
    expect(loadProductionCompatibleDataset().source).toBe("legacy");

    const positions = JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!) as PositionRecord[];
    const persist = persistPositionsDatasetWithGeneration(positions);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    const sync = syncPositionDatasetToNormalizedFamilyStore(positions, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
    const members = Object.values(loadFamilyMembersEnvelope().members);
    expect(members.every((m) => m.sourceSlot === "S1" || m.sourceSlot === "S2")).toBe(
      true
    );
    expect(loadProductionCompatibleDataset().source).toBe("normalized");
  });

  it("J historyRestoreRecovery: restore mismatch → legacy → SAVE → recover", () => {
    persistAndSync([multiSlotLegacy()], 2);
    const restored: PositionRecord[] = [
      {
        positionId: createPositionId({
          cue: { x: 1, y: 1 },
          target: { x: 2, y: 2 },
          second: { x: 3, y: 3 },
        }),
        balls: { cue: { x: 1, y: 1 }, target: { x: 2, y: 2 }, second: { x: 3, y: 3 } },
        targetBall: "red",
        strategies: {
          S1: entry({
            slot: "S1",
            familyId: "fm_restored",
            memberId: "mb_restored",
          }),
        },
      },
    ];
    expect(persistPositionsDatasetWithGeneration(restored).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(false);
    forceFamilyNormalizedStorageEnabledForTests(true);
    expect(loadProductionCompatibleDataset().source).toBe("legacy");

    const persist = persistPositionsDatasetWithGeneration(restored);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    const sync = syncPositionDatasetToNormalizedFamilyStore(restored, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
    const rem = loadProductionCompatibleDataset();
    expect(rem.source).toBe("normalized");
    expect(rem.dataset[0]?.strategies.S1?.memberId).toBe("mb_restored");
  });

  it("fingerprint parity on packed slots (meta excluded)", () => {
    const legacy = multiSlotLegacy();
    persistAndSync([legacy]);
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const packed = loaded.dataset[0]!;
    expect(familyCompatibilityFingerprint(packed, "S1")).toEqual(
      familyCompatibilityFingerprint(legacy, "S1")
    );
    expect(familyCompatibilityFingerprint(packed, "S2")).toEqual(
      familyCompatibilityFingerprint(legacy, "S2")
    );
  });
});
