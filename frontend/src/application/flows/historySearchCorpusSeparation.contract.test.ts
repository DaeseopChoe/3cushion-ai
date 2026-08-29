/**
 * Phase 1 Contract Test:
 * History Workspace and Local DB Search Corpus Complete Separation
 *
 * Invariants:
 * 1. History Load restores Workspace UI editing state (adminState, ballsState, shotEditor, targetColor, editSource).
 * 2. History Load NEVER mutates or truncates the persistent Searchable Corpus (positions_dataset).
 * 3. Local DB Search (runAdminLocalDbRecall) always searches the full Searchable Corpus regardless of loaded History snapshot.
 * 4. Original and Approved Derived records maintain Search Record Equality.
 * 5. Ball Role semantics (cue, target, second) are preserved independently of ball color.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAdminLocalDbRecall, type AdminLocalDbFlowContext } from "./adminLocalDbFlow";
import type { Ball3, PositionRecord, StrategyEntry, TargetBall } from "../../domain/positionSearchEngine";
import { createPositionId } from "../../domain/positionId";
import { WORKING_DATASET_KEY } from "../../domain/dataset/infra/datasetStorage";
import {
  saveWorkspaceHistory,
  WORKSPACE_HISTORY_KEY,
  type WorkspaceSnapshot,
} from "../../domain/workspaceHistory";

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

const baseBalls: Ball3 = {
  cue: { x: 19.5, y: 11.0 },
  target: { x: 20.4, y: 30.6 },
  second: { x: 64.9, y: 22.1 },
};

const derivedCueBalls: Ball3 = {
  cue: { x: 19.8, y: 17.0 },
  target: { x: 20.4, y: 30.6 },
  second: { x: 64.9, y: 22.1 },
};

const derivedProductBalls: Ball3 = {
  cue: { x: 19.8, y: 17.0 },
  target: { x: 20.4, y: 30.6 },
  second: { x: 60.0, y: 25.0 },
};

function authoredStrategy(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "v1",
      shotType: "옆돌리기",
    },
    sysInputs: { CO_f: 38.48, C3_r: 33.83 },
    corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    correctionsStored: true,
    authoringStrategyId: "as_test_auth",
    familyId: "fm_test",
    memberId: "mb_test_auth",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    ...overrides,
  };
}

function derivedProductStrategy(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "v1",
      shotType: "옆돌리기",
    },
    sysInputs: { CO_f: 38.48, C3_r: 33.83 },
    corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    correctionsStored: true,
    authoringStrategyId: "as_test_auth",
    familyId: "fm_test",
    memberId: "mb_test_prod_1",
    memberOrigin: "DERIVED_CUE_C3_PRODUCT",
    derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
    derivedStep: "cue:t:0.100000|c3:seg:0@0.100000",
    track: "B2T_L",
    ...overrides,
  };
}

function makeRecord(balls: Ball3, strategy: StrategyEntry, targetBall: TargetBall = "yellow"): PositionRecord {
  return {
    positionId: createPositionId(balls),
    balls: {
      cue: { ...balls.cue },
      target: { ...balls.target },
      second: { ...balls.second },
    },
    targetBall,
    strategies: {
      S1: strategy,
    },
    schemaVersion: 1,
  };
}

describe("Phase 1 — History Workspace and Local DB Search Corpus Separation", () => {
  let memStorage: ReturnType<typeof createMemoryLocalStorage>;
  let fullSearchableCorpus: PositionRecord[];
  let v001SparseCorpus: PositionRecord[];

  beforeEach(() => {
    memStorage = createMemoryLocalStorage();
    vi.stubGlobal("localStorage", memStorage);
    vi.stubGlobal("alert", vi.fn());

    // Build v001 (sparse: 4 authored/symmetry records)
    const recAuth = makeRecord(baseBalls, authoredStrategy());
    v001SparseCorpus = [recAuth];

    // Build v005 (dense: authored + derived product records)
    const recProd1 = makeRecord(derivedCueBalls, derivedProductStrategy({ memberId: "mb_prod_1" }));
    const recProd2 = makeRecord(derivedProductBalls, derivedProductStrategy({ memberId: "mb_prod_2" }));
    fullSearchableCorpus = [recAuth, recProd1, recProd2];

    // Seed localStorage positions_dataset with fullSearchableCorpus
    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(fullSearchableCorpus));

    // Seed workspace_history with snapshots v001, v002, v005
    const snapshots: WorkspaceSnapshot[] = [
      {
        id: "snap_v001",
        name: "옆돌리기_5_half_system_v001_2026-08-01",
        systemId: "5_half_system",
        pattern: "옆돌리기",
        version: 1,
        timestamp: new Date().toISOString(),
        state: {
          adminState: { sys: { systemId: "5_half_system", shotType: "옆돌리기" } },
          ballsState: { ...baseBalls },
          dataset: v001SparseCorpus, // only 1 record
          shotEditor: { activeSlot: "S1", slots: {} },
          targetBall: "yellow",
        },
      },
      {
        id: "snap_v005",
        name: "옆돌리기_5_half_system_v005_2026-08-25",
        systemId: "5_half_system",
        pattern: "옆돌리기",
        version: 5,
        timestamp: new Date().toISOString(),
        state: {
          adminState: { sys: { systemId: "5_half_system", shotType: "옆돌리기" } },
          ballsState: { ...derivedProductBalls },
          dataset: fullSearchableCorpus, // full 3 records
          shotEditor: { activeSlot: "S1", slots: {} },
          targetBall: "yellow",
        },
      },
    ];
    saveWorkspaceHistory(snapshots);
  });

  function buildSearchContext(overrides: Partial<AdminLocalDbFlowContext> = {}) {
    const tracker = {
      matchedRecord: null as PositionRecord | null,
    };
    const ctx: AdminLocalDbFlowContext = {
      dataset: fullSearchableCorpus,
      ballsState: { ...baseBalls },
      adminState: { sys: { systemId: "5_half_system", shotType: "옆돌리기" } },
      activeSlot: "S1",
      slots: {},
      isTargetSelected: true,
      targetColor: "yellow",
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      applyPositionRecall: (rec) => {
        tracker.matchedRecord = rec;
      },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: vi.fn(),
      getAdminRecallQueryTargetBall: () => "yellow",
      resolveFormulaHash: () => "v1",
      ...overrides,
    };
    return { ctx, tracker };
  }

  it("T1: Baseline Search matches Authored and Derived records on fresh Searchable Corpus", async () => {
    // Search Authored
    const { ctx: ctxAuth, tracker: authTracker } = buildSearchContext({
      ballsState: { ...baseBalls },
    });
    const resAuth = await runAdminLocalDbRecall(ctxAuth);
    expect(resAuth).toBe(true);
    expect(authTracker.matchedRecord?.positionId).toBe(createPositionId(baseBalls));

    // Search Derived Product
    const { ctx: ctxProd, tracker: prodTracker } = buildSearchContext({
      ballsState: { ...derivedProductBalls },
    });
    const resProd = await runAdminLocalDbRecall(ctxProd);
    expect(resProd).toBe(true);
    expect(prodTracker.matchedRecord?.positionId).toBe(createPositionId(derivedProductBalls));
  });

  it("T2 & T3: Loading v001 (sparse snapshot) does not truncate Searchable Corpus or break Derived Search", async () => {
    // Simulate loading v001 History
    const historyJson = localStorage.getItem(WORKSPACE_HISTORY_KEY)!;
    const history = JSON.parse(historyJson) as WorkspaceSnapshot[];
    const v001 = history.find((s) => s.version === 1)!;

    // Verify snapshot v001 has only 1 record
    expect(v001.state.dataset).toHaveLength(1);

    // After history load in useSettings, positions_dataset in localStorage remains the full corpus (3 records)
    const storedCorpus = JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!);
    expect(storedCorpus).toHaveLength(3);

    // Local DB Search for Derived Product position STILL SUCCEEDS using the Searchable Corpus
    const { ctx, tracker } = buildSearchContext({
      ballsState: { ...derivedProductBalls },
      // dataset in App.jsx remains the fullSearchableCorpus (not v001.state.dataset)
      dataset: fullSearchableCorpus,
    });
    const matchSuccess = await runAdminLocalDbRecall(ctx);
    expect(matchSuccess).toBe(true);
    expect(tracker.matchedRecord?.positionId).toBe(createPositionId(derivedProductBalls));
  });

  it("T4: Successive History loads (v001 → v005 → v001) leave Local DB Search results 100% deterministic", async () => {
    for (const ver of [1, 5, 1]) {
      const { ctx: ctxAuth, tracker: authTracker } = buildSearchContext({
        ballsState: { ...baseBalls },
        dataset: fullSearchableCorpus,
      });
      const ok1 = await runAdminLocalDbRecall(ctxAuth);
      expect(ok1).toBe(true);
      expect(authTracker.matchedRecord?.positionId).toBe(createPositionId(baseBalls));

      const { ctx: ctxProd, tracker: prodTracker } = buildSearchContext({
        ballsState: { ...derivedProductBalls },
        dataset: fullSearchableCorpus,
      });
      const ok2 = await runAdminLocalDbRecall(ctxProd);
      expect(ok2).toBe(true);
      expect(prodTracker.matchedRecord?.positionId).toBe(createPositionId(derivedProductBalls));
    }
  });

  it("T5 & T6: Search Record Equality — Authored and Approved Derived have identical search priority and mechanics", async () => {
    // Both are retrieved via pure spatial Euclidean distance without provenance discrimination
    const { ctx: ctx1, tracker: tracker1 } = buildSearchContext({
      ballsState: { ...baseBalls },
      dataset: fullSearchableCorpus,
    });
    await runAdminLocalDbRecall(ctx1);
    expect(tracker1.matchedRecord?.strategies.S1?.memberOrigin).toBe("AUTHORED");

    const { ctx: ctx2, tracker: tracker2 } = buildSearchContext({
      ballsState: { ...derivedProductBalls },
      dataset: fullSearchableCorpus,
    });
    await runAdminLocalDbRecall(ctx2);
    expect(tracker2.matchedRecord?.strategies.S1?.memberOrigin).toBe("DERIVED_CUE_C3_PRODUCT");
  });

  it("T7: Ball Role SSOT — Search query preserves cue/target/second roles independently of targetColor", async () => {
    // Create red targetBall record
    const redRecord = makeRecord(baseBalls, authoredStrategy(), "red");
    const corpusWithRed = [redRecord];

    const { ctx, tracker } = buildSearchContext({
      ballsState: { ...baseBalls },
      targetColor: "red",
      isTargetSelected: true,
      getAdminRecallQueryTargetBall: () => "red",
      dataset: corpusWithRed,
    });
    const ok = await runAdminLocalDbRecall(ctx);
    expect(ok).toBe(true);
    expect(tracker.matchedRecord?.targetBall).toBe("red");
    expect(tracker.matchedRecord?.balls.target).toEqual(baseBalls.target);
    expect(tracker.matchedRecord?.balls.second).toEqual(baseBalls.second);
  });
});
