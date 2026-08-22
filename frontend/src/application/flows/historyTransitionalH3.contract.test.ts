/**
 * Phase 3A-337 — Transitional History H3 contract hardening.
 *
 * History restore = workspace snapshot restore ≠ Member DB rollback.
 * Full H3 storage split remains DEFERRED; this suite locks transitional behavior.
 *
 * Run: npx vitest run src/application/flows/historyTransitionalH3.contract.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKING_DATASET_KEY } from "../../domain/dataset/infra/datasetStorage";
import {
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  POSITIONS_DATASET_META_KEY,
} from "../../domain/dataset/infra/positionsDatasetMeta";
import {
  clearPersistPositionsFailureForTests,
  forcePersistPositionsFailureForTests,
  persistPositionsDatasetWithGeneration,
} from "../../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import type { Ball3, PositionRecord, StrategyEntry } from "../../domain/positionSearchEngine";
import {
  buildSnapshotName,
  deleteOldest30,
  deleteSnapshotById,
  generateUUID,
  getNextVersion,
  loadWorkspaceHistory,
  saveWorkspaceHistory,
  WORKSPACE_HISTORY_KEY,
  type WorkspaceSnapshot,
} from "../../domain/workspaceHistory";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
} from "../../domain/family/familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
} from "../../domain/family/familyNormalizedStore";
import {
  evaluateNormalizedCorpusFreshness,
  isNormalizedCorpusFresh,
} from "../../domain/family/familyCorpusFreshness";
import { syncPositionDatasetToNormalizedFamilyStore } from "../../domain/family/syncPositionDatasetToNormalizedFamilyStore";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";
import { runCanonicalSave, type HistoryFlowContext } from "./historyFlow";
import {
  commitDerivedApprovalDataset,
  type DerivedReviewBaselineSnapshot,
} from "./derivedApprovalFlow";
import {
  approveCueImpactDerivedReview,
  createCueImpactDerivedReview,
} from "../../domain/family/cueImpactDerivedReview";
import { writeFourTrackFamilyMembers } from "../../domain/family/familyAwareWriter";

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

const ballsC10: Ball3 = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 },
  second: { x: 62, y: 12 },
};

const ballsC5: Ball3 = {
  cue: { x: 11, y: 9 },
  target: { x: 41, y: 21 },
  second: { x: 63, y: 13 },
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
    authoringStrategyId: "as_h3",
    familyId: "fm_h3",
    memberId: "mb_h3_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: canonicalHpt,
    str: { speed: 2.5 },
    ai: { text: "h3" },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function record(
  positionId: string,
  ball3: Ball3,
  entry: StrategyEntry
): PositionRecord {
  return {
    positionId,
    balls: ball3,
    targetBall: "red",
    strategies: { S1: entry },
  };
}

/** Durable half of handleLoadWorkspaceSnapshot (no React hydrate). */
function transitionalHistoryRestore(dataset: PositionRecord[]) {
  return persistPositionsDatasetWithGeneration(dataset);
}

function snapshotFamilyRaw() {
  return {
    masters: localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY),
    members: localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY),
  };
}

function seedCorpus(dataset: PositionRecord[]) {
  const persist = persistPositionsDatasetWithGeneration(dataset);
  expect(persist.ok).toBe(true);
  if (!persist.ok) throw new Error("seed persist failed");
  const sync = syncPositionDatasetToNormalizedFamilyStore(dataset, {
    corpusGeneration: persist.corpusGeneration,
  });
  expect(sync.ok).toBe(true);
  expect(isNormalizedCorpusFresh()).toBe(true);
  return persist.corpusGeneration;
}

function makeWorkspaceSnapshot(
  dataset: PositionRecord[],
  overrides: Partial<WorkspaceSnapshot> = {}
): WorkspaceSnapshot {
  const systemId = "5_half_system";
  const pattern = "뒤돌리기";
  const version = overrides.version ?? 5;
  const timestamp = overrides.timestamp ?? "2026-01-01T00:00:00.000Z";
  return {
    id: overrides.id ?? generateUUID(),
    name: overrides.name ?? buildSnapshotName(pattern, systemId, version, timestamp),
    systemId,
    pattern,
    version,
    timestamp,
    exported: false,
    state: {
      adminState: {
        sys: {
          system_id: systemId,
          system: systemId,
          shotType: pattern,
        },
      },
      ballsState: dataset[0]?.balls ?? null,
      dataset,
      shotEditor: { activeSlot: "S1", slots: { S1: { draft: {}, applied: {} } } },
      targetBall: "red",
    },
    ...overrides,
  };
}

/** Mirrors useSettings.commitWorkspaceHistoryWithStrategyDataset durable append. */
function appendWorkspaceHistoryFromSave(updated: PositionRecord[]) {
  const systemId = "5_half_system";
  const pattern = "뒤돌리기";
  const history = loadWorkspaceHistory();
  const version = getNextVersion(history, systemId, pattern);
  const timestamp = new Date().toISOString();
  const snapshot: WorkspaceSnapshot = {
    id: generateUUID(),
    name: buildSnapshotName(pattern, systemId, version, timestamp),
    systemId,
    pattern,
    version,
    timestamp,
    exported: false,
    state: {
      adminState: {
        sys: { system_id: systemId, system: systemId, shotType: pattern },
      },
      ballsState: updated[0]?.balls ?? null,
      dataset: JSON.parse(JSON.stringify(updated)),
      shotEditor: { activeSlot: "S1", slots: {} },
      targetBall: "red",
    },
  };
  saveWorkspaceHistory([...history, snapshot]);
}

function buildSaveCtx(overrides: Partial<SaveFlowContext> = {}): {
  ctx: SaveFlowContext;
  capture: { dataset: PositionRecord[] | null };
} {
  const capture = { dataset: null as PositionRecord[] | null };
  const slotSys = {
    systemId: "5_half_system",
    track: "B2T_L",
    inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
  };
  const ctx: SaveFlowContext = {
    dataset: [],
    ballsState: ballsC5,
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
      capture.dataset = updated;
      localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(updated));
    },
    setDataset: (updated) => {
      capture.dataset = updated;
    },
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
  return { ctx, capture };
}

function makeBaseline(): DerivedReviewBaselineSnapshot {
  return {
    ballsState: ballsC5,
    adminState: { sys: { system_id: "5_half_system", shotType: "뒤돌리기" } },
    overlayState: { open: false, type: null },
    targetColor: "red",
    isTargetSelected: true,
    shotEditor: { activeSlot: "S1", slots: { S1: { draft: {} } } },
    activeSlot: "S1",
  };
}

describe("Phase 3A-337 transitional History H3 contract", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    clearFamilyNormalizedStoresForTests();
    clearPositionsDatasetMetaForTests();
    clearPersistPositionsFailureForTests();
    localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify([]));
    vi.restoreAllMocks();
  });

  it("Full H3 deferred: no workspace_dataset key (flag ON does not imply Full H3)", () => {
    expect(localStorage.getItem("workspace_dataset")).toBeNull();
    // Constant may exist in module; durable write must not be activated.
    expect(localStorage.getItem("workspace_current")).toBeNull();
  });

  it("History snapshot embeds workspace dataset but not persistent family stores / meta authority", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    seedCorpus(c10);

    const snap = makeWorkspaceSnapshot(c10, { version: 3, id: "snap_boundary" });
    saveWorkspaceHistory([snap]);

    const raw = localStorage.getItem(WORKSPACE_HISTORY_KEY)!;
    expect(raw).toContain("pos_c10");
    expect(raw).toContain("fm_h3");
    expect(raw).toContain("mb_h3_authored");
    expect(raw).not.toContain(FAMILY_MASTERS_STORAGE_KEY);
    expect(raw).not.toContain(FAMILY_MEMBERS_STORAGE_KEY);
    expect(raw).not.toContain(POSITIONS_DATASET_META_KEY);
    expect(raw).not.toContain('"corpusGeneration"');
    expect(raw).not.toContain("SearchIndex");
    expect(raw).not.toContain("workspace_dataset");

    const parsed = JSON.parse(raw) as WorkspaceSnapshot[];
    expect(parsed[0]!.state.dataset[0]!.strategies.S1.familyId).toBe("fm_h3");
    expect(
      (parsed[0] as unknown as Record<string, unknown>).corpusGeneration
    ).toBeUndefined();
    expect(
      (parsed[0]!.state as unknown as Record<string, unknown>).corpusGeneration
    ).toBeUndefined();
  });

  it("restore leaves family_* unchanged, advances positions gen, freshness=false, History +0", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry({ ai: { text: "c10" } }))];
    const c5 = [
      record(
        "pos_c5",
        ballsC5,
        authoredEntry({ ai: { text: "c5" }, memberId: "mb_c5", familyId: "fm_c5" })
      ),
    ];
    const genBefore = seedCorpus(c10);
    const familyBefore = snapshotFamilyRaw();
    const mastersEnvBefore = loadFamilyMastersEnvelope();
    const membersEnvBefore = loadFamilyMembersEnvelope();
    expect(mastersEnvBefore?.corpusGeneration).toBe(genBefore);
    expect(membersEnvBefore?.corpusGeneration).toBe(genBefore);

    const histBefore = [makeWorkspaceSnapshot(c5, { version: 5, id: "hist_c5" })];
    saveWorkspaceHistory(histBefore);
    const histCountBefore = loadWorkspaceHistory().length;

    const restored = transitionalHistoryRestore(c5);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    expect(JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)).toEqual(c5);
    expect(restored.corpusGeneration).toBeGreaterThan(genBefore);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(restored.corpusGeneration);
    expect(restored.corpusGeneration).not.toBe(histBefore[0]!.version);
    expect(restored.corpusGeneration).not.toBe(mastersEnvBefore!.corpusGeneration);

    expect(snapshotFamilyRaw()).toEqual(familyBefore);
    expect(loadFamilyMastersEnvelope()?.corpusGeneration).toBe(genBefore);
    expect(loadFamilyMembersEnvelope()?.corpusGeneration).toBe(genBefore);
    expect(loadFamilyMastersEnvelope()?.masters).toEqual(mastersEnvBefore!.masters);
    expect(loadFamilyMembersEnvelope()?.members).toEqual(membersEnvBefore!.members);

    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.fresh).toBe(false);
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) {
      expect(freshness.reason).toBe("GENERATION_MISMATCH");
    }
    expect(loadWorkspaceHistory()).toHaveLength(histCountBefore);
  });

  it("restore → reload keeps restored positions; freshness stays false", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    const c5 = [
      record("pos_c5", ballsC5, authoredEntry({ memberId: "mb_c5", familyId: "fm_c5" })),
    ];
    seedCorpus(c10);
    const familyBefore = snapshotFamilyRaw();
    expect(transitionalHistoryRestore(c5).ok).toBe(true);

    const positionsAfterReload = JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!);
    expect(positionsAfterReload).toEqual(c5);
    expect(snapshotFamilyRaw()).toEqual(familyBefore);
    expect(isNormalizedCorpusFresh()).toBe(false);
  });

  it("restore → SAVE resyncs family, freshness=true, History +1, preserves 3-ball/provenance/identity", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry({ ai: { text: "c10" } }))];
    const c5 = [
      record(
        "pos_c5",
        ballsC5,
        authoredEntry({
          ai: { text: "c5" },
          memberId: "mb_c5",
          familyId: "fm_c5",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
        })
      ),
    ];
    seedCorpus(c10);
    const genAfterRestore = transitionalHistoryRestore(c5);
    expect(genAfterRestore.ok).toBe(true);
    if (!genAfterRestore.ok) return;
    expect(isNormalizedCorpusFresh()).toBe(false);

    saveWorkspaceHistory([]);
    const { ctx, capture } = buildSaveCtx({ dataset: c5, ballsState: ballsC5 });
    const historyCtx: HistoryFlowContext = {
      ...ctx,
      canUseSystemControls: true,
      commitWorkspaceHistoryWithStrategyDataset: appendWorkspaceHistoryFromSave,
    };
    const result = runCanonicalSave(historyCtx);
    expect(result.ok).toBe(true);
    expect(capture.dataset).not.toBeNull();

    const genAfterSave = loadPositionsDatasetCorpusGeneration()!;
    expect(genAfterSave).toBeGreaterThan(genAfterRestore.corpusGeneration);
    expect(loadFamilyMastersEnvelope()?.corpusGeneration).toBe(genAfterSave);
    expect(loadFamilyMembersEnvelope()?.corpusGeneration).toBe(genAfterSave);
    expect(isNormalizedCorpusFresh()).toBe(true);

    const saved = capture.dataset!;
    const authored = Object.values(saved[0]!.strategies).find(
      (s) => s?.memberOrigin === "AUTHORED"
    );
    expect(authored).toBeTruthy();
    expect(saved.some((r) => r.balls.cue && r.balls.target && r.balls.second)).toBe(
      true
    );
    for (const r of saved) {
      for (const s of Object.values(r.strategies)) {
        if (!s) continue;
        expect(typeof s.familyId).toBe("string");
        expect(typeof s.memberId).toBe("string");
      }
    }
    expect(loadWorkspaceHistory()).toHaveLength(1);
  });

  it("restore → Approval resyncs shadow and keeps Approval History +1", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    seedCorpus(c10);

    const written = writeFourTrackFamilyMembers([], {
      balls: ballsC5,
      targetBall: "red",
      entry: authoredEntry({
        familyId: "fm_appr",
        memberId: "mb_appr_auth",
        track: "B2T_L",
      }),
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

    expect(transitionalHistoryRestore(approved.dataset).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(false);

    const commitHistory = vi.fn((updated: PositionRecord[]) => {
      appendWorkspaceHistoryFromSave(updated);
    });

    const out = commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaseline(),
      saveWorkingDataset: (updated) => {
        localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(updated));
      },
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: commitHistory,
    });

    expect(out.corpusPersist.ok).toBe(true);
    expect(out.normalizedDualWrite.ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(loadWorkspaceHistory()).toHaveLength(1);
  });

  it("History delete / deleteOldest leave positions + family_* untouched", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    seedCorpus(c10);
    const positionsBefore = localStorage.getItem(WORKING_DATASET_KEY);
    const metaBefore = localStorage.getItem(POSITIONS_DATASET_META_KEY);
    const familyBefore = snapshotFamilyRaw();

    saveWorkspaceHistory([
      makeWorkspaceSnapshot(c10, { id: "hist_a", version: 1, timestamp: "2026-01-01T00:00:00.000Z" }),
      makeWorkspaceSnapshot(c10, { id: "hist_b", version: 2, timestamp: "2026-01-02T00:00:00.000Z" }),
      makeWorkspaceSnapshot(c10, { id: "hist_c", version: 3, timestamp: "2026-01-03T00:00:00.000Z" }),
    ]);

    deleteSnapshotById("hist_b");
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(positionsBefore);
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBe(metaBefore);
    expect(snapshotFamilyRaw()).toEqual(familyBefore);

    // deleteOldest30 removes up to 30 oldest; with 2 remaining it clears history only.
    deleteOldest30();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(positionsBefore);
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBe(metaBefore);
    expect(snapshotFamilyRaw()).toEqual(familyBefore);
  });

  it("Case B: restore persist failure aborts — prior positions + family unchanged; fail-closed", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    const c5 = [
      record("pos_c5", ballsC5, authoredEntry({ memberId: "mb_c5", familyId: "fm_c5" })),
    ];
    seedCorpus(c10);
    const positionsBefore = localStorage.getItem(WORKING_DATASET_KEY);
    const familyBefore = snapshotFamilyRaw();

    forcePersistPositionsFailureForTests("positions");
    const result = transitionalHistoryRestore(c5);
    clearPersistPositionsFailureForTests();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.stage).toBe("positions");
    // Positions write did not land; prior durable corpus body remains.
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(positionsBefore);
    expect(snapshotFamilyRaw()).toEqual(familyBefore);
    // 3A-335: invalidate already ran → marker missing ⇒ freshness false (not false-fresh).
    expect(loadPositionsDatasetCorpusGeneration()).toBeNull();
    expect(isNormalizedCorpusFresh()).toBe(false);
  });

  it("Case C: generation commit failure → freshness false; no family sync", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    const c5 = [
      record("pos_c5", ballsC5, authoredEntry({ memberId: "mb_c5", familyId: "fm_c5" })),
    ];
    seedCorpus(c10);
    const familyBefore = snapshotFamilyRaw();

    forcePersistPositionsFailureForTests("generation");
    const result = transitionalHistoryRestore(c5);
    clearPersistPositionsFailureForTests();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.stage).toBe("generation");
    expect(snapshotFamilyRaw()).toEqual(familyBefore);
    expect(isNormalizedCorpusFresh()).toBe(false);
    // positions may already be written; marker missing ⇒ fail-closed (3A-335).
    expect(loadPositionsDatasetCorpusGeneration()).toBeNull();
  });

  it("Case E: restore → SAVE normalized sync failure → freshness false; legacy remains authority", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    const c5 = [
      record(
        "pos_c5",
        ballsC5,
        authoredEntry({ memberId: "mb_c5", familyId: "fm_c5" })
      ),
    ];
    seedCorpus(c10);
    const restored = transitionalHistoryRestore(c5);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    const realSet = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === FAMILY_MASTERS_STORAGE_KEY || key === FAMILY_MEMBERS_STORAGE_KEY) {
        throw new Error("injected normalized sync failure");
      }
      return realSet(key, value);
    });

    const { ctx } = buildSaveCtx({ dataset: c5, ballsState: ballsC5 });
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    expect(loadPositionsDatasetCorpusGeneration()).toBeGreaterThan(
      restored.corpusGeneration
    );
    expect(JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)[0].positionId).toBe(
      "pos_c5"
    );
    // Dual-write failure leaves prior family gens stale vs new positions gen.
    expect(isNormalizedCorpusFresh()).toBe(false);
  });

  it("Case F: restore → SAVE all writes succeed → family synchronized / freshness true", () => {
    const c10 = [record("pos_c10", ballsC10, authoredEntry())];
    const c5 = [
      record(
        "pos_c5",
        ballsC5,
        authoredEntry({ memberId: "mb_c5", familyId: "fm_c5" })
      ),
    ];
    seedCorpus(c10);
    expect(transitionalHistoryRestore(c5).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(false);

    const { ctx } = buildSaveCtx({ dataset: c5, ballsState: ballsC5 });
    expect(runSaveStrategy(ctx).ok).toBe(true);

    const g = loadPositionsDatasetCorpusGeneration();
    expect(loadFamilyMastersEnvelope()?.corpusGeneration).toBe(g);
    expect(loadFamilyMembersEnvelope()?.corpusGeneration).toBe(g);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });
});
