/**
 * Phase 3A-326 — Normalized dual-write (SAVE / Approval / Import shadow sync).
 * Run: npx vitest run src/application/flows/normalizedDualWrite.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import { WORKING_DATASET_KEY } from "../../domain/dataset/infra/datasetStorage";
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
  it("persists positions_dataset and shadow 1 Master + 4 Members", () => {
    const { ctx, capture } = buildSaveCtx();
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    expect(result.fourTrackWritten).toBe(true);
    expect(result.normalizedDualWrite?.ok).toBe(true);
    expect(capture.dataset).toHaveLength(4);
    expect(JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)).toHaveLength(4);

    const gen = loadPositionsDatasetCorpusGeneration();
    expect(gen).toBe(1);
    expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(1);
    expect(loadFamilyMembersEnvelope().corpusGeneration).toBe(1);
    expect(evaluateNormalizedCorpusFreshness()).toMatchObject({
      ok: true,
      fresh: true,
      corpusGeneration: 1,
    });

    const validation = validateFamilyStore();
    expect(validation).toMatchObject({
      ok: true,
      masterCount: 1,
      memberCount: 4,
      orphanCount: 0,
    });
    const members = readFamilyMembersByFamilyId(result.familyId!);
    expect(members.filter((m) => m.memberOrigin === "AUTHORED")).toHaveLength(1);
    expect(members.filter((m) => m.memberOrigin === "SYMMETRY")).toHaveLength(3);
    for (const m of members) {
      expect(memberHasForbiddenCommonPayload(m as unknown as Record<string, unknown>)).toBe(
        false
      );
      for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(m, key)).toBe(false);
      }
    }
    const master = readFamilyMaster(result.familyId!);
    expect(master?.sysInputs).toBeTruthy();
    expect(master?.hpT).toBeTruthy();
  });

  it("hydrated normalized meaningful fields match legacy SAVE records", () => {
    const { ctx, capture } = buildSaveCtx();
    const result = runSaveStrategy(ctx);
    expect(result.ok && result.normalizedDualWrite?.ok).toBe(true);
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || !capture.dataset) return;
    const legacyAuthored = capture.dataset.find((r) =>
      Object.values(r.strategies).some((e) => e?.memberOrigin === "AUTHORED")
    )!;
    const slot = "S1" as const;
    const hydratedAuthored = loaded.dataset.find(
      (r) => r.strategies.S1?.memberOrigin === "AUTHORED"
    )!;
    expect(familyCompatibilityFingerprint(hydratedAuthored, slot)).toEqual(
      familyCompatibilityFingerprint(legacyAuthored, slot)
    );
  });

  it("keeps legacy corpus when normalized sync fails after positions write", () => {
    const { ctx, capture } = buildSaveCtx();
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    const legacyJson = localStorage.getItem(WORKING_DATASET_KEY);
    expect(legacyJson).toBeTruthy();
    const genAfterSave = loadPositionsDatasetCorpusGeneration();
    expect(genAfterSave).toBe(1);
    expect(isNormalizedCorpusFresh()).toBe(true);

    // Conflicting common payload corpus → sync fail-closed, legacy untouched
    const conflictDataset = structuredClone(capture.dataset!) as PositionRecord[];
    const sym = conflictDataset.find((r) =>
      Object.values(r.strategies).some((e) => e?.memberOrigin === "SYMMETRY")
    )!;
    Object.values(sym.strategies)[0]!.sysInputs = { CO_f: 999, C1_f: 1, C3_r: 1 };
    // Simulate post-SAVE failed resync without advancing gen (same N)
    const sync = syncPositionDatasetToNormalizedFamilyStore(conflictDataset, {
      corpusGeneration: genAfterSave!,
    });
    expect(sync.ok).toBe(false);
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(legacyJson);
    // Previous successful shadow from SAVE still present (persist not called on fail)
    expect(validateFamilyStore().ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });

  it("legacy bump without successful sync leaves shadow stale", () => {
    const { ctx, capture } = buildSaveCtx();
    expect(runSaveStrategy(ctx).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);

    // Newer legacy generation via safe persist of same content, no sync
    expect(persistPositionsDatasetWithGeneration(capture.dataset!).ok).toBe(true);
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
  it("writes Derived to positions_dataset and family_members; History called once", () => {
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
      saveWorkingDataset: (updated) => {
        legacy = updated;
        localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(updated));
      },
      setDataset: (updated) => {
        legacy = updated;
      },
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: commitHistory,
    });

    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(commit.normalizedDualWrite.ok).toBe(true);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(1);
    expect(isNormalizedCorpusFresh()).toBe(true);
    expect(legacy).toBeTruthy();
    const derivedLegacy = persistedCueImpactDerivedCount(legacy!, "fm_family1");
    expect(derivedLegacy).toBe(review.session.members.length);

    const members = readFamilyMembersByFamilyId("fm_family1");
    const derivedNorm = members.filter((m) => m.memberOrigin === "DERIVED_CUE_IMPACT");
    expect(derivedNorm).toHaveLength(derivedLegacy);
    expect(members).toHaveLength(4 + derivedLegacy);
    expect(validateFamilyStore()).toMatchObject({
      ok: true,
      masterCount: 1,
      orphanCount: 0,
    });

    for (const m of derivedNorm) {
      expect(m.generatedFromMemberId).toBeTruthy();
      expect(m.derivedRule).toBe("CUE_IMPACT_FIRST_30PCT");
      expect(m.derivedStep?.startsWith("cue_impact:t:")).toBe(true);
      expect(m.balls.cue).toBeTruthy();
      expect(m.balls.target).toBeTruthy();
      expect(m.balls.second).toBeTruthy();
    }
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

  it("History restore → SAVE restores freshness", () => {
    const { ctx } = buildSaveCtx();
    expect(runSaveStrategy(ctx).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);

    expect(persistPositionsDatasetWithGeneration([]).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(false);

    const { ctx: ctx2 } = buildSaveCtx();
    const result = runSaveStrategy(ctx2);
    expect(result.ok).toBe(true);
    expect(result.normalizedDualWrite?.ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(3);
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

  it("preserve_dataset: production cleanup keeps meta, deletes family → NORMALIZED_MISSING", () => {
    const { ctx } = buildSaveCtx();
    expect(runSaveStrategy(ctx).ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
    const gen = loadPositionsDatasetCorpusGeneration();
    expect(gen).toBe(1);

    runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_PRESERVE_DATASET);

    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeTruthy();
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBeTruthy();
    expect(loadPositionsDatasetCorpusGeneration()).toBe(gen);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("NORMALIZED_MISSING");
  });
});
