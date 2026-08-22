/**
 * Phase 3A-339 — preserve_dataset cleanup contract.
 *
 * KEEP: positions_dataset + positions_dataset_meta (+ lesson library)
 * DELETE: family_masters / family_members (+ workspace_history, etc.)
 *
 * Run: npx vitest run src/hooks/workspaceCleanup.preserveDataset.contract.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKING_DATASET_KEY } from "../domain/dataset/infra/datasetStorage";
import {
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  POSITIONS_DATASET_META_KEY,
  writePositionsDatasetCorpusGeneration,
} from "../domain/dataset/infra/positionsDatasetMeta";
import {
  clearPersistPositionsFailureForTests,
  forcePersistPositionsFailureForTests,
  persistPositionsDatasetWithGeneration,
} from "../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import type { Ball3, PositionRecord, StrategyEntry } from "../domain/positionSearchEngine";
import {
  deleteOldest30,
  deleteSnapshotById,
  loadWorkspaceHistory,
  saveWorkspaceHistory,
  WORKSPACE_HISTORY_KEY,
} from "../domain/workspaceHistory";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
} from "../domain/family/familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
} from "../domain/family/familyNormalizedStore";
import {
  evaluateNormalizedCorpusFreshness,
  isNormalizedCorpusFresh,
} from "../domain/family/familyCorpusFreshness";
import { syncPositionDatasetToNormalizedFamilyStore } from "../domain/family/syncPositionDatasetToNormalizedFamilyStore";
import { writeFourTrackFamilyMembers } from "../domain/family/familyAwareWriter";
import {
  approveCueImpactDerivedReview,
  createCueImpactDerivedReview,
} from "../domain/family/cueImpactDerivedReview";
import { runSaveStrategy, type SaveFlowContext } from "../application/flows/saveFlow";
import {
  commitDerivedApprovalDataset,
  type DerivedReviewBaselineSnapshot,
} from "../application/flows/derivedApprovalFlow";
import {
  ONE_POINT_LESSON_LIBRARY_STORAGE_KEY,
  runWorkspaceLocalStorageCleanup,
  WORKSPACE_CLEANUP_CLEAR_ALL,
  WORKSPACE_CLEANUP_PRESERVE_DATASET,
} from "./useSettings.js";

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
    authoringStrategyId: "as_cleanup",
    familyId: "fm_cleanup",
    memberId: "mb_cleanup",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: canonicalHpt,
    str: { speed: 2.5 },
    ai: { text: "cleanup" },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function seedAtGeneration(n: number) {
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
  expect(loadPositionsDatasetCorpusGeneration()).toBe(n);
  return written.dataset;
}

function buildSaveCtx(overrides: Partial<SaveFlowContext> = {}): SaveFlowContext {
  const slotSys = {
    systemId: "5_half_system",
    track: "B2T_L",
    inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
  };
  return {
    dataset: [],
    ballsState: balls,
    adminState: {
      sys: {
        system: "5_half_system",
        systemId: "5_half_system",
        system_id: "5_half_system",
        shotType: "뒤돌리기",
        track: "B2T_L",
        inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
        system_values: { CO_f: 30, C1_f: 10, C3_r: 20 },
        corrections: {
          slide: 0,
          curve_ratio: 0,
          draw: 0,
          departure: 0,
          spin: 0,
        },
      },
      hpt: canonicalHpt,
    },
    activeSlot: "S1",
    slots: {
      S1: {
        draft: { sys: slotSys, hpt: canonicalHpt },
        applied: { sys: slotSys, hpt: canonicalHpt, str: { speed: 1 }, ai: {} },
      },
    },
    targetColor: "red",
    aiOverride: null,
    system: "5_half_system",
    resolvedSlotSysValues: { CO_f: 30, C1_f: 10, C3_r: 20 },
    autoSave: false,
    editSource: null,
    saveWorkingDataset: (updated) => {
      localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(updated));
    },
    setDataset: vi.fn(),
    setUserPublishedSearchContext: vi.fn(),
    setAdminState: vi.fn(),
    patchSlotRuntimeMeta: vi.fn(),
    patchSlotFamilyIdentity: vi.fn(),
    saveToFile: vi.fn(),
    resolveFormulaHash: () => "v1",
    resolveEvalProfile: () => ({ formula: { expr: "C3_r = CO_f - C1_f" } }),
    resolveAnchorsData: () => ({
      trajectories: { B2T_L: { anchors: [{ id: "a1" }] } },
      meta: {},
    }),
    ...overrides,
  };
}

function makeBaseline(): DerivedReviewBaselineSnapshot {
  return {
    ballsState: balls,
    adminState: { sys: { system_id: "5_half_system", shotType: "뒤돌리기" } },
    overlayState: { open: false, type: null },
    targetColor: "red",
    isTargetSelected: true,
    shotEditor: { activeSlot: "S1", slots: { S1: { draft: {} } } },
    activeSlot: "S1",
  };
}

describe("Phase 3A-339 preserve_dataset cleanup contract", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    clearFamilyNormalizedStoresForTests();
    clearPositionsDatasetMetaForTests();
    clearPersistPositionsFailureForTests();
    vi.restoreAllMocks();
  });

  it("T1–T5: KEEP positions+meta, DELETE family, freshness NORMALIZED_MISSING", () => {
    const dataset = seedAtGeneration(17);
    localStorage.setItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY, JSON.stringify([{ id: "L1" }]));
    localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify([{ id: "h1" }]));
    localStorage.setItem("app_ui_mode_v1", "ADMIN");

    const positionsBefore = localStorage.getItem(WORKING_DATASET_KEY);
    const metaBefore = localStorage.getItem(POSITIONS_DATASET_META_KEY);
    expect(positionsBefore).toBeTruthy();
    expect(metaBefore).toBeTruthy();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeTruthy();

    const removed = runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);

    // T1
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(positionsBefore);
    expect(JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)).toEqual(dataset);

    // T2
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBe(metaBefore);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(17);

    // T3
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    expect(removed).toEqual(
      expect.arrayContaining([
        FAMILY_MASTERS_STORAGE_KEY,
        FAMILY_MEMBERS_STORAGE_KEY,
        WORKSPACE_HISTORY_KEY,
        "app_ui_mode_v1",
      ])
    );

    // lesson KEEP (existing)
    expect(localStorage.getItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKSPACE_HISTORY_KEY)).toBeNull();

    // T4–T5
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.fresh).toBe(false);
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) {
      expect(freshness.reason).toBe("NORMALIZED_MISSING");
      expect(freshness.reason).not.toBe("LEGACY_MARKER_MISSING");
    }
  });

  it("T6/T9: preserve → SAVE advances N→N+1 and rebuilds fresh shadow", () => {
    seedAtGeneration(17);
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(17);
    expect(isNormalizedCorpusFresh()).toBe(false);

    const result = runSaveStrategy(buildSaveCtx());
    expect(result.ok).toBe(true);
    expect(result.normalizedDualWrite?.ok).toBe(true);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(18);
    expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(18);
    expect(loadFamilyMembersEnvelope().corpusGeneration).toBe(18);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });

  it("T7: preserve → Approval advances N→N+1", () => {
    seedAtGeneration(17);
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);

    const written = writeFourTrackFamilyMembers([], {
      balls,
      targetBall: "red",
      entry: authoredEntry({ familyId: "fm_appr", memberId: "mb_appr" }),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_appr",
    });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const out = commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaseline(),
      saveWorkingDataset: (updated) => {
        localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(updated));
      },
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: vi.fn(),
    });
    expect(out.corpusPersist.ok).toBe(true);
    expect(out.normalizedDualWrite.ok).toBe(true);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(18);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });

  it("T8: preserve → Import advances N→N+1", () => {
    seedAtGeneration(17);
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);

    const imported = writeFourTrackFamilyMembers([], {
      balls: { cue: { x: 12, y: 9 }, target: { x: 42, y: 21 }, second: { x: 64, y: 13 } },
      targetBall: "red",
      entry: authoredEntry({ familyId: "fm_imp", memberId: "mb_imp" }),
    });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    // Mirror App Import: safe persist then shadow sync
    const persist = persistPositionsDatasetWithGeneration(imported.dataset);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    const sync = syncPositionDatasetToNormalizedFamilyStore(imported.dataset, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(true);
    expect(persist.corpusGeneration).toBe(18);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(18);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });

  it("T10: clear_all wipes positions + meta + family", () => {
    seedAtGeneration(17);
    localStorage.setItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY, "[]");
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_CLEAR_ALL);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY)).toBeNull();
    expect(isNormalizedCorpusFresh()).toBe(false);
  });

  it("T11: History delete leaves corpus/meta/family untouched", () => {
    seedAtGeneration(17);
    const pos = localStorage.getItem(WORKING_DATASET_KEY);
    const meta = localStorage.getItem(POSITIONS_DATASET_META_KEY);
    const masters = localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY);
    const members = localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY);

    saveWorkspaceHistory([
      {
        id: "hist_a",
        name: "a",
        systemId: "5_half_system",
        pattern: "뒤돌리기",
        version: 1,
        timestamp: "2026-01-01T00:00:00.000Z",
        exported: false,
        state: {
          adminState: {},
          ballsState: balls,
          dataset: [],
          shotEditor: { activeSlot: "S1", slots: {} },
          targetBall: "red",
        },
      },
      {
        id: "hist_b",
        name: "b",
        systemId: "5_half_system",
        pattern: "뒤돌리기",
        version: 2,
        timestamp: "2026-01-02T00:00:00.000Z",
        exported: false,
        state: {
          adminState: {},
          ballsState: balls,
          dataset: [],
          shotEditor: { activeSlot: "S1", slots: {} },
          targetBall: "red",
        },
      },
    ]);

    deleteSnapshotById("hist_a");
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(pos);
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBe(meta);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBe(masters);
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBe(members);

    deleteOldest30();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(pos);
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBe(meta);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBe(masters);
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBe(members);
    expect(loadWorkspaceHistory()).toHaveLength(0);
  });

  it("T12: preserve does not rewrite History H3 restore contract (family still deletable; restore path separate)", () => {
    // After preserve, family absent; History restore remains generation-safe persist without family sync.
    seedAtGeneration(17);
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();

    const restoredDataset: PositionRecord[] = [
      {
        positionId: "pos_restored",
        balls: { cue: { x: 1, y: 1 }, target: { x: 2, y: 2 }, second: { x: 3, y: 3 } },
        targetBall: "red",
        strategies: { S1: authoredEntry({ memberId: "mb_r" }) },
      },
    ];
    // Restore durable half (same as handleLoadWorkspaceSnapshot)
    const restore = persistPositionsDatasetWithGeneration(restoredDataset);
    expect(restore.ok).toBe(true);
    if (!restore.ok) return;
    expect(restore.corpusGeneration).toBe(18);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    expect(isNormalizedCorpusFresh()).toBe(false);
  });

  describe("failure-window after preserve", () => {
    it("A: positions persist failure → not fresh", () => {
      seedAtGeneration(17);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      forcePersistPositionsFailureForTests("positions");
      expect(runSaveStrategy(buildSaveCtx()).ok).toBe(false);
      clearPersistPositionsFailureForTests();
      expect(isNormalizedCorpusFresh()).toBe(false);
    });

    it("B: generation commit failure → not fresh", () => {
      seedAtGeneration(17);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      forcePersistPositionsFailureForTests("generation");
      expect(runSaveStrategy(buildSaveCtx()).ok).toBe(false);
      clearPersistPositionsFailureForTests();
      expect(isNormalizedCorpusFresh()).toBe(false);
    });

    it("C: normalized sync failure → not fresh; legacy advanced", () => {
      seedAtGeneration(17);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      const realSet = localStorage.setItem.bind(localStorage);
      vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
        if (key === FAMILY_MASTERS_STORAGE_KEY || key === FAMILY_MEMBERS_STORAGE_KEY) {
          throw new Error("injected sync fail");
        }
        return realSet(key, value);
      });
      expect(runSaveStrategy(buildSaveCtx()).ok).toBe(true);
      expect(loadPositionsDatasetCorpusGeneration()).toBe(18);
      expect(isNormalizedCorpusFresh()).toBe(false);
    });

    it("D: full success → fresh at N+1", () => {
      seedAtGeneration(17);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      expect(runSaveStrategy(buildSaveCtx()).ok).toBe(true);
      expect(loadPositionsDatasetCorpusGeneration()).toBe(18);
      expect(isNormalizedCorpusFresh()).toBe(true);
    });
  });
});
