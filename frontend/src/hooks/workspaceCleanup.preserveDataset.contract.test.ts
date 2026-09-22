/**
 * Phase C-2 — local_delete cleanup contract.
 *
 * KEEP: normalized_dataset (+ lesson library / anchors)
 * DELETE: obsolete positions_dataset(+meta), family_*, workspace_history, etc.
 *
 * Run: npx vitest run src/hooks/workspaceCleanup.preserveDataset.contract.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKING_DATASET_KEY } from "../domain/dataset/infra/datasetStorage";
import {
  CANONICAL_NORMALIZED_CORPUS_KEY,
} from "../domain/dataset/infra/canonicalNormalizedCorpusStore";
import { persistWorkingCorpusNormalizedAuthority } from "../domain/dataset/infra/persistWorkingCorpusNormalizedAuthority";
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
  WORKSPACE_CLEANUP_LOCAL_DELETE,
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

  it("T1–T5: KEEP normalized_dataset; DELETE obsolete flat/shadow/history", () => {
    const dataset = seedAtGeneration(17);
    // Also seed canonical SSOT for C-2 preserve semantics.
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    localStorage.setItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY, JSON.stringify([{ id: "L1" }]));
    localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify([{ id: "h1" }]));
    localStorage.setItem("app_ui_mode_v1", "ADMIN");

    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeTruthy();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeTruthy();

    const removed = runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);

    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    expect(removed).toEqual(
      expect.arrayContaining([
        WORKING_DATASET_KEY,
        POSITIONS_DATASET_META_KEY,
        FAMILY_MASTERS_STORAGE_KEY,
        FAMILY_MEMBERS_STORAGE_KEY,
        WORKSPACE_HISTORY_KEY,
        "app_ui_mode_v1",
      ])
    );

    expect(localStorage.getItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKSPACE_HISTORY_KEY)).toBeNull();
  });

  it("T6/T9: preserve → SAVE writes canonical (no flat/shadow rebuild)", () => {
    seedAtGeneration(17);
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();

    const result = runSaveStrategy(buildSaveCtx());
    expect(result.ok).toBe(true);
    expect(result.normalizedDualWrite?.ok).toBe(false);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
  });

  it("T7: preserve → Approval writes canonical", () => {
    seedAtGeneration(17);
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
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
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: vi.fn(),
    });
    expect(out.canonicalOk).toBe(true);
    expect(out.corpusPersist.ok).toBe(false);
    expect(out.normalizedDualWrite.ok).toBe(false);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
  });

  it("T8: preserve → Import advances via canonical persist", () => {
    seedAtGeneration(17);
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);

    const imported = writeFourTrackFamilyMembers([], {
      balls: { cue: { x: 12, y: 9 }, target: { x: 42, y: 21 }, second: { x: 64, y: 13 } },
      targetBall: "red",
      entry: authoredEntry({ familyId: "fm_imp", memberId: "mb_imp" }),
    });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: imported.dataset,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
  });

  it("T10: clear_all aliases local_delete — normalized + AI library preserved", () => {
    seedAtGeneration(17);
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    localStorage.setItem(
      ONE_POINT_LESSON_LIBRARY_STORAGE_KEY,
      JSON.stringify([{ id: "L1" }])
    );
    localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify([{ id: "h1" }]));
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_CLEAR_ALL);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKSPACE_HISTORY_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
  });

  it("T10b: local_delete preserves category library and never calls clear", () => {
    seedAtGeneration(17);
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    const clearSpy = vi.spyOn(localStorage, "clear");
    localStorage.setItem(
      "ONE_POINT_CATEGORY_LIBRARY_V1",
      JSON.stringify([{ categoryNo: 1 }])
    );
    localStorage.setItem("ANCHORS_OVERRIDE_V1", "{}");
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_LOCAL_DELETE);
    expect(clearSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem("ONE_POINT_CATEGORY_LIBRARY_V1")).toBeTruthy();
    expect(localStorage.getItem("ANCHORS_OVERRIDE_V1")).toBe("{}");
    clearSpy.mockRestore();
  });

  it("T11: History delete leaves canonical corpus untouched", () => {
    seedAtGeneration(17);
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    const canonical = localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY);

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
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBe(canonical);

    deleteOldest30();
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBe(canonical);
    expect(loadWorkspaceHistory()).toHaveLength(0);
  });

  it("T12: History restore helper may write obsolete flat; App load ignores it", () => {
    seedAtGeneration(17);
    expect(
      persistWorkingCorpusNormalizedAuthority({
        dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }).ok
    ).toBe(true);
    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();

    const restoredDataset: PositionRecord[] = [
      {
        positionId: "pos_restored",
        balls: { cue: { x: 1, y: 1 }, target: { x: 2, y: 2 }, second: { x: 3, y: 3 } },
        targetBall: "red",
        strategies: { S1: authoredEntry({ memberId: "mb_r" }) },
      },
    ];
    const restore = persistPositionsDatasetWithGeneration(restoredDataset);
    expect(restore.ok).toBe(true);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
  });

  describe("failure-window after preserve (Phase C-2)", () => {
    it("A: SAVE succeeds without flat projection", () => {
      seedAtGeneration(17);
      expect(
        persistWorkingCorpusNormalizedAuthority({
          dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
          shotType: "뒤돌리기",
          systemId: "5_half_system",
        }).ok
      ).toBe(true);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      forcePersistPositionsFailureForTests("positions");
      const result = runSaveStrategy(buildSaveCtx());
      expect(result.ok).toBe(true);
      expect(result.flatProjection?.ok).toBe(false);
      clearPersistPositionsFailureForTests();
      expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    });

    it("B: SAVE succeeds without flat generation", () => {
      seedAtGeneration(17);
      expect(
        persistWorkingCorpusNormalizedAuthority({
          dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
          shotType: "뒤돌리기",
          systemId: "5_half_system",
        }).ok
      ).toBe(true);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      forcePersistPositionsFailureForTests("generation");
      expect(runSaveStrategy(buildSaveCtx()).ok).toBe(true);
      clearPersistPositionsFailureForTests();
      expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    });

    it("C: SAVE does not advance obsolete flat generation", () => {
      seedAtGeneration(17);
      expect(
        persistWorkingCorpusNormalizedAuthority({
          dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
          shotType: "뒤돌리기",
          systemId: "5_half_system",
        }).ok
      ).toBe(true);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      expect(runSaveStrategy(buildSaveCtx()).ok).toBe(true);
      expect(loadPositionsDatasetCorpusGeneration()).toBeNull();
    });

    it("D: full success → canonical present", () => {
      seedAtGeneration(17);
      expect(
        persistWorkingCorpusNormalizedAuthority({
          dataset: JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!),
          shotType: "뒤돌리기",
          systemId: "5_half_system",
        }).ok
      ).toBe(true);
      runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);
      expect(runSaveStrategy(buildSaveCtx()).ok).toBe(true);
      expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    });
  });
});
