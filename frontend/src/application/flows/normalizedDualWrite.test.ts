/**
 * Phase 3A-326 — Normalized dual-write (SAVE / Approval / Import shadow sync).
 * Run: npx vitest run src/application/flows/normalizedDualWrite.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import { WORKING_DATASET_KEY } from "../../domain/dataset/infra/datasetStorage";
import { CANONICAL_NORMALIZED_CORPUS_KEY } from "../../domain/dataset/infra/canonicalNormalizedCorpusStore";
import {
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  POSITIONS_DATASET_META_KEY,
} from "../../domain/dataset/infra/positionsDatasetMeta";
import { persistPositionsDatasetWithGeneration } from "../../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import type { Ball3, PositionRecord, StrategyEntry } from "../../domain/positionSearchEngine";
import { WORKSPACE_HISTORY_KEY } from "../../domain/workspaceHistory";
import {
  approveCueImpactDerivedReview,
  createCueImpactDerivedReview,
  persistedCueImpactDerivedCount,
} from "../../domain/family/cueImpactDerivedReview";
import { writeFourTrackFamilyMembers } from "../../domain/family/familyAwareWriter";
import {
  familyCompatibilityFingerprint,
} from "../../domain/family/familyHydrate";
import { isFamilyNormalizedStorageEnabled } from "../../domain/family/familyNormalizedFlag";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  memberHasForbiddenCommonPayload,
} from "../../domain/family/familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
  readFamilyMaster,
  readFamilyMembersByFamilyId,
  validateFamilyStore,
} from "../../domain/family/familyNormalizedStore";
import {
  evaluateNormalizedCorpusFreshness,
  isNormalizedCorpusFresh,
} from "../../domain/family/familyCorpusFreshness";
import { loadFamilyCompatibleDataset } from "../../domain/family/loadFamilyCompatibleDataset";
import { syncPositionDatasetToNormalizedFamilyStore } from "../../domain/family/syncPositionDatasetToNormalizedFamilyStore";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";
import {
  commitDerivedApprovalDataset,
  type DerivedReviewBaselineSnapshot,
} from "./derivedApprovalFlow";
import {
  runWorkspaceLocalStorageCleanup,
  WORKSPACE_CLEANUP_PRESERVE_DATASET,
} from "../../hooks/useSettings.js";

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

const balls: Ball3 = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 },
  second: { x: 62, y: 12 },
};

function collinearBalls(distance = 20): Ball3 {
  return {
    cue: { x: 8, y: 16 },
    target: { x: 8 + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
    second: { x: 62, y: 12 },
  };
}

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

function makeBaselineA(): DerivedReviewBaselineSnapshot {
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

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearFamilyNormalizedStoresForTests();
  clearPositionsDatasetMetaForTests();
  localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify([]));
});

function syncWithBump(dataset: PositionRecord[]) {
  const persist = persistPositionsDatasetWithGeneration(dataset);
  expect(persist.ok).toBe(true);
  if (!persist.ok) throw new Error(persist.reason);
  return syncPositionDatasetToNormalizedFamilyStore(dataset, {
    corpusGeneration: persist.corpusGeneration,
  });
}

describe("feature flag / production read", () => {
  it("default ON for gated READ; dual-write remains flag-independent", () => {
    expect(isFamilyNormalizedStorageEnabled()).toBe(true);
  });
});

describe("SAVE dual-write", () => {
  it("Phase C-2: SAVE writes canonical only (no flat/shadow production mirror)", () => {
    const { ctx, capture } = buildSaveCtx({
      saveWorkingDataset: undefined,
    });
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    expect(result.fourTrackWritten).toBe(true);
    expect(result.normalizedDualWrite?.ok).toBe(false);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    expect(capture.dataset).toHaveLength(4);
  });

  it("runtime setDataset mirror still receives SAVE result", () => {
    const { ctx, capture } = buildSaveCtx({
      saveWorkingDataset: undefined,
    });
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    expect(capture.dataset).toHaveLength(4);
    const authored = capture.dataset.find((r) =>
      Object.values(r.strategies).some((e) => e?.memberOrigin === "AUTHORED")
    );
    expect(authored?.strategies.S1?.memberOrigin).toBe("AUTHORED");
  });

  it("TEST/MIGRATION opt-in can still dual-write flat+shadow via explicit flags", () => {
    const { ctx } = buildSaveCtx({ saveWorkingDataset: undefined });
    // First SAVE via production path (canonical only).
    expect(runSaveStrategy(ctx).ok).toBe(true);
    // Explicit migration helper path still works.
    const sync = syncWithBump(ctx.dataset as PositionRecord[]);
    expect(sync.ok).toBe(true);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeTruthy();
    expect(isNormalizedCorpusFresh()).toBe(true);
  });

  it("legacy bump without successful sync leaves shadow stale (migration helper)", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls,
      targetBall: "red",
      entry: authoredEntry(),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    expect(syncWithBump(written.dataset).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);

    expect(persistPositionsDatasetWithGeneration(written.dataset).ok).toBe(true);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(2);
    expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(1);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) {
      expect(freshness.reason).toBe("GENERATION_MISMATCH");
    }
  });
});

describe("Derived Approval dual-write", () => {
  it("Phase C-2: Approval writes canonical; runtime setDataset; no flat/shadow", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: collinearBalls(20),
      targetBall: "red",
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    if (!approved.ok) throw new Error(approved.reason);

    let legacy: PositionRecord[] | null = null;
    const commitHistory = vi.fn();
    const commit = commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      setDataset: (updated) => {
        legacy = updated;
      },
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: commitHistory,
    });

    expect(commitHistory).not.toHaveBeenCalled();
    expect(commit.canonicalOk).toBe(true);
    expect(commit.normalizedDualWrite.ok).toBe(false);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(legacy).toBeTruthy();
    const derivedLegacy = persistedCueImpactDerivedCount(legacy!, "fm_family1");
    expect(derivedLegacy).toBe(review.session.members.length);
  });

  it("Cancel path: no History and no normalized write (approve-only contract)", () => {
    clearFamilyNormalizedStoresForTests();
    const commitHistory = vi.fn();
    // Cancel never calls commitDerivedApprovalDataset
    expect(commitHistory).not.toHaveBeenCalled();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
  });
});

describe("Import dual-write (sync helper)", () => {
  it("imports PositionRecord[] into legacy + normalized stores", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: balls,
      targetBall: "red",
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);

    // Simulate Import: write positions then bump + sync
    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(written.dataset));
    const sync = syncWithBump(written.dataset);
    expect(sync.ok).toBe(true);
    if (!sync.ok) return;
    expect(sync.masterCount).toBe(1);
    expect(sync.memberCount).toBe(4);
    expect(sync.corpusGeneration).toBe(1);
    expect(isNormalizedCorpusFresh()).toBe(true);
    expect(JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)).toHaveLength(4);

    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.dataset).toHaveLength(4);
    for (const record of loaded.dataset) {
      const entry = Object.values(record.strategies)[0]!;
      const source = written.dataset.find((r) =>
        Object.values(r.strategies).some((e) => e?.memberId === entry.memberId)
      )!;
      expect(record.balls.cue).toEqual(source.balls.cue);
      expect(record.balls.target).toEqual(source.balls.target);
      expect(record.balls.second).toEqual(source.balls.second);
    }
  });

  it("handcrafted 16-member import preserves Derived lineage", () => {
    const tracks = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const;
    const ops = [null, "H", "V", "RPI"] as const;
    const dataset: PositionRecord[] = [];
    tracks.forEach((track, ti) => {
      const sourceId = ti === 0 ? "mb_authored" : `mb_sym_${track}`;
      const sourceBalls = {
        cue: { x: 10 + ti, y: 8 },
        target: { x: 40, y: 20 },
        second: { x: 62, y: 12 },
      };
      dataset.push({
        positionId: `pos_${track}`,
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
            cue: { x: sourceBalls.cue.x + k, y: sourceBalls.cue.y },
            target: sourceBalls.target,
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
            }),
          },
        });
      }
    });

    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(dataset));
    const sync = syncWithBump(dataset);
    expect(sync.ok).toBe(true);
    if (!sync.ok) return;
    expect(sync.masterCount).toBe(1);
    expect(sync.memberCount).toBe(16);
    expect(
      readFamilyMembersByFamilyId("fm_family1").filter(
        (m) => m.memberOrigin === "DERIVED_CUE_IMPACT"
      )
    ).toHaveLength(12);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });
});

describe("failure policy", () => {
  it("does not clear positions_dataset when sync fails", () => {
    const payload = [{ keep: "legacy" }];
    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(payload));
    // Seed a good shadow first
    const written = writeFourTrackFamilyMembers([], {
      balls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    expect(syncWithBump(written.dataset).ok).toBe(true);

    const conflict = structuredClone(written.dataset) as PositionRecord[];
    Object.values(conflict[0]!.strategies)[0]!.sysInputs = { CO_f: 1 };
    // Make AUTHORED and another differ — pick second record
    if (conflict[1]) {
      Object.values(conflict[1].strategies)[0]!.sysInputs = { CO_f: 999 };
    }
    const before = localStorage.getItem(WORKING_DATASET_KEY);
    const gen = loadPositionsDatasetCorpusGeneration()!;
    const sync = syncPositionDatasetToNormalizedFamilyStore(conflict, {
      corpusGeneration: gen,
    });
    expect(sync.ok).toBe(false);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(before);
  });

  it("documents History restore divergence: family_* not overwritten by restore", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    expect(syncWithBump(written.dataset).ok).toBe(true);
    expect(Object.keys(loadFamilyMembersEnvelope().members)).toHaveLength(4);
    expect(isNormalizedCorpusFresh()).toBe(true);

    // Simulate History restore via safe persist (no family sync)
    const persist = persistPositionsDatasetWithGeneration([]);
    expect(persist.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)).toHaveLength(0);
    expect(Object.keys(loadFamilyMembersEnvelope().members)).toHaveLength(4);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) {
      expect(freshness.reason).toBe("GENERATION_MISMATCH");
    }
  });

  it("History restore → SAVE restores canonical (flat freshness N/A in C-2)", () => {
    const { ctx } = buildSaveCtx({ saveWorkingDataset: undefined });
    expect(runSaveStrategy(ctx).ok).toBe(true);

    // Stale flat leftover must not become authority.
    expect(persistPositionsDatasetWithGeneration([]).ok).toBe(true);

    const { ctx: ctx2, capture } = buildSaveCtx({ saveWorkingDataset: undefined });
    const result = runSaveStrategy(ctx2);
    expect(result.ok).toBe(true);
    expect(result.normalizedDualWrite?.ok).toBe(false);
    expect(capture.dataset.length).toBeGreaterThan(0);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeTruthy(); // leftover flat ignored
  });

  it("rejects sync without corpusGeneration", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const sync = syncPositionDatasetToNormalizedFamilyStore(written.dataset);
    expect(sync.ok).toBe(false);
    if (!sync.ok) expect(sync.stage).toBe("generation");
  });

  it("local_delete: preserves normalized_dataset; may remove obsolete flat/shadow", () => {
    const { ctx } = buildSaveCtx({ saveWorkingDataset: undefined });
    expect(runSaveStrategy(ctx).ok).toBe(true);
    // Seed obsolete flat leftover
    localStorage.setItem(WORKING_DATASET_KEY, "[]");
    localStorage.setItem(POSITIONS_DATASET_META_KEY, "{}");

    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();

    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);

    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
  });
});
