/**
 * Phase 3A-342 — Gated production READ contract.
 * Run: npx vitest run src/domain/family/loadProductionCompatibleDataset.contract.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadWorkingDataset,
  WORKING_DATASET_KEY,
} from "../dataset/infra/datasetStorage";
import {
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  POSITIONS_DATASET_META_KEY,
  writePositionsDatasetCorpusGeneration,
} from "../dataset/infra/positionsDatasetMeta";
import { persistPositionsDatasetWithGeneration } from "../dataset/infra/persistPositionsDatasetWithGeneration";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { runSpatialRecall } from "../recall/recallEngine";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import {
  clearFamilyNormalizedStorageEnabledForTests,
  forceFamilyNormalizedStorageEnabledForTests,
  isFamilyNormalizedStorageEnabled,
} from "./familyNormalizedFlag";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
} from "./familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
} from "./familyNormalizedStore";
import { isNormalizedCorpusFresh } from "./familyCorpusFreshness";
import { syncPositionDatasetToNormalizedFamilyStore } from "./syncPositionDatasetToNormalizedFamilyStore";
import { loadProductionCompatibleDataset } from "./loadProductionCompatibleDataset";
import {
  ONE_POINT_LESSON_LIBRARY_STORAGE_KEY,
  runWorkspaceLocalStorageCleanup,
  WORKSPACE_CLEANUP_PRESERVE_DATASET,
} from "../../hooks/useSettings.js";
import * as familyHydrate from "./familyHydrate";

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

const balls: Ball3 = {
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
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    authoringStrategyId: "as_gated",
    familyId: "fm_gated",
    memberId: "mb_gated",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: canonicalHpt,
    str: { speed: 2.5 },
    ai: { text: "gated" },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

/** positions + meta + fresh family at generation N */
function seedFreshCorpus(n = 7) {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    targetBall: "red",
    entry: authoredEntry(),
  });
  if (!written.ok) throw new Error(written.reason);
  localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(written.dataset));
  writePositionsDatasetCorpusGeneration(n);
  const sync = syncPositionDatasetToNormalizedFamilyStore(written.dataset, {
    corpusGeneration: n,
  });
  if (!sync.ok) throw new Error(sync.reason);
  expect(isNormalizedCorpusFresh()).toBe(true);
  return written.dataset;
}

function snapshotDurableKeys() {
  return {
    positions: localStorage.getItem(WORKING_DATASET_KEY),
    meta: localStorage.getItem(POSITIONS_DATASET_META_KEY),
    masters: localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY),
    members: localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY),
  };
}

describe("Phase 3A-342 loadProductionCompatibleDataset", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    clearFamilyNormalizedStoresForTests();
    clearPositionsDatasetMetaForTests();
    clearFamilyNormalizedStorageEnabledForTests();
    vi.restoreAllMocks();
  });

  it("T1/T19: explicit flag OFF + fresh family → legacy (rollback)", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(false);
    expect(isFamilyNormalizedStorageEnabled()).toBe(false);
    const before = snapshotDurableKeys();
    const legacyLoaded = loadWorkingDataset();
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("flag_off");
    expect(result.dataset).toEqual(legacyLoaded);
    expect(snapshotDurableKeys()).toEqual(before);
  });

  it("T2: explicit flag OFF + stale family → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(false);
    expect(persistPositionsDatasetWithGeneration(
      JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)
    ).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(false);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("flag_off");
  });

  it("T3: flag default ON + fresh + hydrate OK → normalized", () => {
    seedFreshCorpus(7);
    expect(isFamilyNormalizedStorageEnabled()).toBe(true);
    const before = snapshotDurableKeys();
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("normalized");
    expect(result.reason).toBe("normalized_eligible");
    expect(result.dataset.length).toBe(4);
    expect(result.dataset.every((r) => r.balls && r.strategies.S1)).toBe(true);
    expect(snapshotDurableKeys()).toEqual(before);
  });

  it("T4: flag ON + generation mismatch → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    expect(
      persistPositionsDatasetWithGeneration(
        JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)
      ).ok
    ).toBe(true);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("freshness_ineligible");
    expect(result.freshness?.fresh).toBe(false);
    if (result.freshness && !result.freshness.ok) {
      expect(result.freshness.reason).toBe("GENERATION_MISMATCH");
    }
  });

  it("T5: flag ON + family missing → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    localStorage.removeItem(FAMILY_MASTERS_STORAGE_KEY);
    localStorage.removeItem(FAMILY_MEMBERS_STORAGE_KEY);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("freshness_ineligible");
    if (result.freshness && !result.freshness.ok) {
      expect(result.freshness.reason).toBe("NORMALIZED_MISSING");
    }
  });

  it("T6: flag ON + family partial → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    localStorage.removeItem(FAMILY_MEMBERS_STORAGE_KEY);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    if (result.freshness && !result.freshness.ok) {
      expect(result.freshness.reason).toBe("NORMALIZED_PARTIAL");
    }
  });

  it("T7: flag ON + master marker missing → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const masters = loadFamilyMastersEnvelope();
    delete masters.corpusGeneration;
    localStorage.setItem(FAMILY_MASTERS_STORAGE_KEY, JSON.stringify(masters));
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    if (result.freshness && !result.freshness.ok) {
      expect(result.freshness.reason).toBe("MASTER_MARKER_MISSING");
    }
  });

  it("T8: flag ON + member marker missing → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const members = loadFamilyMembersEnvelope();
    delete members.corpusGeneration;
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(members));
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    if (result.freshness && !result.freshness.ok) {
      expect(result.freshness.reason).toBe("MEMBER_MARKER_MISSING");
    }
  });

  it("T9: flag ON + legacy meta missing → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    localStorage.removeItem(POSITIONS_DATASET_META_KEY);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    if (result.freshness && !result.freshness.ok) {
      expect(result.freshness.reason).toBe("LEGACY_MARKER_MISSING");
    }
  });

  it("T10: flag ON + schema mismatch → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const masters = JSON.parse(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)!);
    masters.schemaVersion = 999;
    localStorage.setItem(FAMILY_MASTERS_STORAGE_KEY, JSON.stringify(masters));
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    if (result.freshness && !result.freshness.ok) {
      expect(result.freshness.reason).toBe("SCHEMA_MISMATCH");
    }
  });

  it("T11: flag ON + normalized invalid (orphan) → legacy", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    localStorage.setItem(
      FAMILY_MASTERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        corpusGeneration: 7,
        masters: {},
      })
    );
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    // empty masters + present members → INVALID or PARTIAL depending on validate path
    expect(result.reason).toBe("freshness_ineligible");
  });

  it("T12/T13: hydration throw → legacy; no durable mutation", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const before = snapshotDurableKeys();
    vi.spyOn(familyHydrate, "hydrateFamilyMemberToPositionRecord").mockImplementation(
      () => {
        throw new Error("injected hydrate failure");
      }
    );
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(["hydration_failed", "hydration_exception"]).toContain(result.reason);
    expect(snapshotDurableKeys()).toEqual(before);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(7);
  });

  it("T14: preserve_dataset + flag ON → legacy", () => {
    seedFreshCorpus(7);
    localStorage.setItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY, "[]");
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(loadPositionsDatasetCorpusGeneration()).toBe(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("freshness_ineligible");
  });

  it("T15: History restore mismatch + flag ON → restored legacy positions", () => {
    seedFreshCorpus(7);
    const restored: PositionRecord[] = [
      {
        positionId: "pos_restored",
        balls: { cue: { x: 1, y: 1 }, target: { x: 2, y: 2 }, second: { x: 3, y: 3 } },
        targetBall: "red",
        strategies: { S1: authoredEntry({ memberId: "mb_r" }) },
      },
    ];
    expect(persistPositionsDatasetWithGeneration(restored).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(false);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("freshness_ineligible");
    expect(result.dataset).toEqual(loadWorkingDataset());
    expect(result.dataset[0]?.positionId).toBe("pos_restored");
    expect(result.dataset[0]?.balls).toEqual(restored[0]!.balls);
  });

  it("T16: restore → SAVE sync → flag ON → normalized eligible", () => {
    seedFreshCorpus(7);
    const written = writeFourTrackFamilyMembers([], {
      balls: { cue: { x: 11, y: 9 }, target: { x: 41, y: 21 }, second: { x: 63, y: 13 } },
      targetBall: "red",
      entry: authoredEntry({ familyId: "fm_r2", memberId: "mb_r2" }),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const persist = persistPositionsDatasetWithGeneration(written.dataset);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    expect(isNormalizedCorpusFresh()).toBe(false);
    const sync = syncPositionDatasetToNormalizedFamilyStore(written.dataset, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("normalized");
    expect(result.dataset).toHaveLength(4);
  });

  it("T17: sync failure → legacy under flag ON", () => {
    seedFreshCorpus(7);
    const conflict = structuredClone(
      JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)
    ) as PositionRecord[];
    if (conflict[0] && conflict[1]) {
      Object.values(conflict[0].strategies)[0]!.sysInputs = { CO_f: 1 };
      Object.values(conflict[1].strategies)[0]!.sysInputs = { CO_f: 999 };
    }
    const persist = persistPositionsDatasetWithGeneration(conflict);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    const sync = syncPositionDatasetToNormalizedFamilyStore(conflict, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(false);
    expect(isNormalizedCorpusFresh()).toBe(false);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
  });

  it("T18: repeated reload → same decision / no mutation", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const before = snapshotDurableKeys();
    const a = loadProductionCompatibleDataset();
    const b = loadProductionCompatibleDataset();
    expect(a.source).toBe("normalized");
    expect(b.source).toBe(a.source);
    expect(b.reason).toBe(a.reason);
    expect(b.dataset).toEqual(a.dataset);
    expect(snapshotDurableKeys()).toEqual(before);
  });

  it("T5-style flag ON alone insufficient: fresh required", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    expect(persistPositionsDatasetWithGeneration(
      JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)
    ).ok).toBe(true);
    // flag ON but not fresh → must not return normalized
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
  });

  it("T20: normalized projection spatial recall parity vs legacy balls", () => {
    const legacy = seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const normalized = loadProductionCompatibleDataset();
    expect(normalized.source).toBe("normalized");

    const queryBalls = balls;
    const legacyHit = runSpatialRecall({
      dataset: legacy,
      query: { balls: queryBalls, targetBall: "red" },
      profile: "adminSearch",
    });
    const normHit = runSpatialRecall({
      dataset: normalized.dataset,
      query: { balls: queryBalls, targetBall: "red" },
      profile: "adminSearch",
    });
    expect(legacyHit.kind).toBe("match");
    expect(normHit.kind).toBe("match");
    if (legacyHit.kind !== "match" || normHit.kind !== "match") return;
    expect(normHit.record.balls).toEqual(legacyHit.record.balls);
    expect(normHit.record.targetBall ?? null).toBe(legacyHit.record.targetBall ?? null);
    // Identity may be balls-derived; balls equality is the spatial contract.
    expect(normHit.distance).toBe(legacyHit.distance);
  });

  it("READ path never bumps generation", () => {
    seedFreshCorpus(7);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const gen = loadPositionsDatasetCorpusGeneration();
    loadProductionCompatibleDataset();
    loadProductionCompatibleDataset();
    expect(loadPositionsDatasetCorpusGeneration()).toBe(gen);
  });
});
