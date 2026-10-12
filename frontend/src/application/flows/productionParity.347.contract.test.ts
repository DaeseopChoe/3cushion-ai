/**
 * Phase 3A-347 ??Production parity regression completion.
 * Closes 3A-346 CONDITIONAL gaps: S2/S3 edit → SAVE sibling preservation,
 * preferred S3, Import reload, determinism, meta regeneration.
 * (LocalDB recall E2E and Approval reload retired: History is the only work store.)
 *
 * Run: npx vitest run src/application/flows/productionParity.347.contract.test.ts
 *
 * PRODUCTION HYDRATE: rematerialize rebuilds canonical meta (not placeholder).
 * Flag default ON for gated normalized READ (FAMILY_NORMALIZED_STORAGE_ENABLED).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ballsExactEqual } from "../../domain/cueEditSnap";
import { WORKING_DATASET_KEY } from "../../domain/dataset/infra/datasetStorage";
import { persistWorkingCorpusNormalizedAuthority } from "../../domain/dataset/infra/persistWorkingCorpusNormalizedAuthority";
import {
  CANONICAL_NORMALIZED_CORPUS_KEY,
} from "../../domain/dataset/infra/canonicalNormalizedCorpusStore";
import {
  clearPositionsDatasetMetaForTests,
} from "../../domain/dataset/infra/positionsDatasetMeta";
import { persistPositionsDatasetWithGeneration } from "../../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import { createPositionId } from "../../domain/positionId";
import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
} from "../../domain/positionSearchEngine";
import { writeFourTrackFamilyMembers } from "../../domain/family/familyAwareWriter";
import { familyCompatibilityFingerprint } from "../../domain/family/familyHydrate";
import {
  clearFamilyNormalizedStorageEnabledForTests,
  forceFamilyNormalizedStorageEnabledForTests,
  isFamilyNormalizedStorageEnabled,
  FAMILY_NORMALIZED_STORAGE_ENABLED,
} from "../../domain/family/familyNormalizedFlag";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
} from "../../domain/family/familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMembersEnvelope,
} from "../../domain/family/familyNormalizedStore";
import { isNormalizedCorpusFresh } from "../../domain/family/familyCorpusFreshness";
import { syncPositionDatasetToNormalizedFamilyStore } from "../../domain/family/syncPositionDatasetToNormalizedFamilyStore";
import { loadFamilyCompatibleDataset } from "../../domain/family/loadFamilyCompatibleDataset";
import { loadProductionCompatibleDataset } from "../../domain/family/loadProductionCompatibleDataset";
import { rematerializeFamilyPartsToPositionRecords } from "../../domain/family/rematerializeFamilyPartsToPositionRecords";
import { migratePositionRecordsToFamilyParts } from "../../domain/family/migratePositionRecordsToFamilyParts";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";

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
      shotType: "?????",
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

function multiSlotTwo(): PositionRecord {
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
        track: "B2T_L",
      }),
      S2: entry({
        slot: "S2",
        familyId: "fm_b",
        memberId: "mb_b",
        track: "B2T_R",
        authoringStrategyId: "as_mb_b",
      }),
    },
  };
}

function multiSlotThree(): PositionRecord {
  const base = multiSlotTwo();
  return {
    ...base,
    strategies: {
      ...base.strategies,
      S3: entry({
        slot: "S3",
        familyId: "fm_c",
        memberId: "mb_c",
        track: "T2B_L",
        authoringStrategyId: "as_mb_c",
      }),
    },
  };
}

function persistAligned(dataset: PositionRecord[], _gen = 7) {
  // Phase C-2: seed Local durable SSOT (normalized_dataset) only.
  const persist = persistWorkingCorpusNormalizedAuthority({
    dataset,
    shotType: "????",
    systemId: "5_half_system",
  });
  expect(persist.ok).toBe(true);
  return persist;
}

function isPlaceholderMeta(
  meta: StrategyEntry["meta"] | undefined,
  balls: Ball3
): boolean {
  if (!meta) return true;
  return (
    meta.impact?.x === balls.cue.x &&
    meta.impact?.y === balls.cue.y &&
    meta.final?.x === balls.second.x &&
    meta.final?.y === balls.second.y &&
    meta.angle_ci === 0 &&
    meta.angle_fs === 0
  );
}

function buildSaveCtx(args: {
  dataset: PositionRecord[];
  activeSlot: "S1" | "S2" | "S3";
  balls: Ball3;
  entry: StrategyEntry;
  sysInputOverride?: Record<string, number>;
}): { ctx: SaveFlowContext; capture: { dataset: PositionRecord[] } } {
  const capture = { dataset: args.dataset.slice() };
  const inputs = args.sysInputOverride ?? {
    ...(args.entry.sysInputs ?? {}),
  };
  const slotSys = {
    systemId: "5_half_system",
    track: args.entry.track ?? "B2T_L",
    inputs,
    outputs: { result: { ...inputs } },
  };
  const identity = {
    familyId: args.entry.familyId,
    memberId: args.entry.memberId,
    memberOrigin: args.entry.memberOrigin,
    generatedFromMemberId: args.entry.generatedFromMemberId,
    symmetryOp: args.entry.symmetryOp,
  };
  const slotPayload = {
    draft: {
      sys: slotSys,
      hpt: args.entry.hpT ?? canonicalHpt,
      str: args.entry.str,
      ai: args.entry.ai,
      ...identity,
    },
    applied: {
      sys: slotSys,
      hpt: args.entry.hpT ?? canonicalHpt,
      str: args.entry.str ?? { speed: 1 },
      ai: args.entry.ai ?? {},
      ...identity,
    },
  };
  const slots: Record<string, unknown> = {
    S1: {},
    S2: {},
    S3: {},
    [args.activeSlot]: slotPayload,
  };

  const ctx: SaveFlowContext = {
    dataset: args.dataset,
    ballsState: args.balls as unknown as Record<string, unknown>,
    adminState: {
      balls: args.balls,
      sys: {
        system: "5_half_system",
        systemId: "5_half_system",
        system_id: "5_half_system",
        shotType: "?????",
        track: args.entry.track ?? "B2T_L",
        inputs,
        system_values: { ...inputs },
        corrections: {
          slide: 0,
          curve_ratio: 0,
          draw: 0,
          departure: 0,
          spin: 0,
        },
      },
      hpt: args.entry.hpT ?? canonicalHpt,
    },
    activeSlot: args.activeSlot,
    slots,
    targetColor: "red",
    aiOverride: null,
    system: "5_half_system",
    resolvedSlotSysValues: { ...inputs },
    autoSave: false,
    editSource: null,
    saveCommand: "OVERWRITE",
    editingPublishedFamilyId: args.entry.familyId ?? null,
    saveIntent: "UPDATE",
    saveWorkingDataset: (updated) => {
      capture.dataset = updated;
    },
    setDataset: (updated) => {
      capture.dataset = updated;
    },
    setUserPublishedSearchContext: vi.fn(),
    setAdminState: vi.fn(),
    patchSlotRuntimeMeta: vi.fn(),
    patchSlotFamilyIdentity: vi.fn(),
    saveToFile: vi.fn(),
    resolveFormulaHash: () => "h1",
    resolveEvalProfile: () => ({ formula: { expr: "C3_r = CO_f - C1_f" } }),
    resolveAnchorsData: () => ({
      trajectories: { B2T_L: { anchors: [{ id: "a1" }] } },
      meta: {},
    }),
  };
  return { ctx, capture };
}

describe("Phase 3A-347 production parity regression", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    vi.stubGlobal("alert", vi.fn());
    clearFamilyNormalizedStoresForTests();
    clearPositionsDatasetMetaForTests();
    clearFamilyNormalizedStorageEnabledForTests();
  });

  it("Phase C-2: flag OFF ignored ? App load is canonical-only (no legacy flat)", () => {
    expect(FAMILY_NORMALIZED_STORAGE_ENABLED).toBe(true);
    persistAligned([multiSlotTwo()]);
    forceFamilyNormalizedStorageEnabledForTests(false);
    expect(isFamilyNormalizedStorageEnabled()).toBe(false);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("canonical");
    expect(result.reason).toBe("canonical_rematerialized");
    expect(result.dataset[0]?.strategies.S1?.memberId).toBe("mb_a");
  });

  it("A0 default ON + fresh multi-slot ? canonical rematerialize", () => {
    persistAligned([multiSlotTwo()]);
    expect(isFamilyNormalizedStorageEnabled()).toBe(true);
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("canonical");
    expect(prod.dataset[0]?.strategies.S1?.memberId).toBe("mb_a");
    expect(prod.dataset[0]?.strategies.S2?.memberId).toBe("mb_b");
  });

  it("D preferredAuthoredSlot S3: sourceSlot + rematerialize placement", () => {
    const written = writeFourTrackFamilyMembers(
      [],
      {
        balls: ballsX,
        targetBall: "red",
        entry: entry({
          slot: "S3",
          familyId: "fm_s3",
          memberId: "mb_s3",
        }),
      },
      { preferredAuthoredSlot: "S3" }
    );
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const authoredRec = written.dataset.find((r) =>
      ballsExactEqual(r.balls, ballsX)
    )!;
    expect(authoredRec.strategies.S3?.memberId).toBe("mb_s3");
    expect(authoredRec.strategies.S1?.memberId).not.toBe("mb_s3");
    expect(authoredRec.strategies.S2?.memberId).not.toBe("mb_s3");

    persistAligned(written.dataset, 4);
    // Phase C-2: assert via rematerialize, not family_* shadow.
    const loaded = loadProductionCompatibleDataset();
    expect(loaded.source).toBe("canonical");
    const again = loaded.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(again.strategies.S3?.memberId).toBe("mb_s3");
    expect(again.strategies.S1?.memberId).not.toBe("mb_s3");
    expect(again.strategies.S2?.memberId).not.toBe("mb_s3");
  });

  it("E Recall S2 ??edit ??SAVE ??reload: sibling S1 preserved", async () => {
    const legacy = [multiSlotTwo()];
    persistAligned(legacy, 5);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const view = loadProductionCompatibleDataset();
    expect(view.source).toBe("canonical");

    const s2 = view.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!.strategies.S2!;
    expect(s2.memberId).toBe("mb_b");

    const { ctx, capture } = buildSaveCtx({
      dataset: view.dataset,
      activeSlot: "S2",
      balls: ballsX,
      entry: s2,
      sysInputOverride: { CO_f: 31, C1_f: 10, C3_r: 20 },
    });
    const saved = runSaveStrategy(ctx);
    expect(saved.ok).toBe(true);
    const exact = capture.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(exact.strategies.S1?.memberId).toBe("mb_a");
    expect(exact.strategies.S2?.memberId).toBe("mb_b");
    expect(exact.strategies.S2?.sysInputs?.CO_f).toBe(31);
    expect(exact.positionId).toBe(createPositionId(ballsX));
    const ids = capture.dataset.map((r) => r.positionId);
    expect(new Set(ids).size).toBe(ids.length);

  });

  it("F Recall S3 ??edit ??SAVE ??reload: siblings S1/S2 preserved", async () => {
    const legacy = [multiSlotThree()];
    persistAligned(legacy, 6);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const view = loadProductionCompatibleDataset();
    expect(view.source).toBe("canonical");

    const s3 = view.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!.strategies.S3!;

    const { ctx, capture } = buildSaveCtx({
      dataset: view.dataset,
      activeSlot: "S3",
      balls: ballsX,
      entry: s3,
      sysInputOverride: { CO_f: 33, C1_f: 10, C3_r: 20 },
    });
    expect(runSaveStrategy(ctx).ok).toBe(true);
    const exact = capture.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(exact.strategies.S1?.memberId).toBe("mb_a");
    expect(exact.strategies.S2?.memberId).toBe("mb_b");
    expect(exact.strategies.S3?.memberId).toBe("mb_c");
    expect(exact.strategies.S3?.sysInputs?.CO_f).toBe(33);

  });

  it("H Import ? reload ? rematerialize via canonical persist", () => {
    const imported = [multiSlotThree()];
    const persist = persistWorkingCorpusNormalizedAuthority({
      dataset: imported,
      shotType: "????",
      systemId: "5_half_system",
    });
    expect(persist.ok).toBe(true);

    const loaded = loadProductionCompatibleDataset();
    expect(loaded.source).toBe("canonical");
    expect(loaded.dataset).toHaveLength(1);
    expect(loaded.dataset[0]?.strategies.S1?.memberId).toBe("mb_a");
    expect(loaded.dataset[0]?.strategies.S2?.memberId).toBe("mb_b");
    expect(loaded.dataset[0]?.strategies.S3?.memberId).toBe("mb_c");
    expect(loaded.dataset[0]?.positionId).toBe(createPositionId(ballsX));
  });

  it("I reload determinism + member order permutation", () => {
    const legacy = [multiSlotThree()];
    const migrated = migratePositionRecordsToFamilyParts(legacy);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const masters = migrated.masters;
    const membersAsc = [...migrated.members].sort((a, b) =>
      a.memberId.localeCompare(b.memberId)
    );
    const membersDesc = [...membersAsc].reverse();
    const a = rematerializeFamilyPartsToPositionRecords({
      masters,
      members: membersAsc,
    });
    const b = rematerializeFamilyPartsToPositionRecords({
      masters,
      members: membersDesc,
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.dataset.map((r) => r.positionId)).toEqual(
      b.dataset.map((r) => r.positionId)
    );
    expect(familyCompatibilityFingerprint(a.dataset[0]!, "S1")).toEqual(
      familyCompatibilityFingerprint(b.dataset[0]!, "S1")
    );
    expect(familyCompatibilityFingerprint(a.dataset[0]!, "S2")).toEqual(
      familyCompatibilityFingerprint(b.dataset[0]!, "S2")
    );
    expect(familyCompatibilityFingerprint(a.dataset[0]!, "S3")).toEqual(
      familyCompatibilityFingerprint(b.dataset[0]!, "S3")
    );

    persistAligned(legacy, 8);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const r1 = loadProductionCompatibleDataset();
    const r2 = loadProductionCompatibleDataset();
    expect(r1.source).toBe("canonical");
    expect(r2.dataset).toEqual(r1.dataset);
  });

  it("J meta regeneration: rematerialize rebuilds canonical meta (not placeholder)", async () => {
    const legacy = [multiSlotTwo()];
    persistAligned(legacy, 9);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const view = loadProductionCompatibleDataset();
    expect(view.source).toBe("canonical");
    // Hydrate fidelity: rematerialized meta must not be placeholder cue/second zeros
    expect(
      isPlaceholderMeta(view.dataset[0]?.strategies.S2?.meta, ballsX)
    ).toBe(false);
    expect(view.dataset[0]?.strategies.S2?.meta).toBeTruthy();

    const s2 = view.dataset[0]!.strategies.S2!;
    const { ctx, capture } = buildSaveCtx({
      dataset: view.dataset,
      activeSlot: "S2",
      balls: ballsX,
      entry: s2,
    });
    expect(runSaveStrategy(ctx).ok).toBe(true);
    const exact = capture.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(exact.strategies.S1?.memberId).toBe("mb_a");
    expect(exact.strategies.S2?.memberId).toBe("mb_b");
    expect(isPlaceholderMeta(exact.strategies.S2?.meta, ballsX)).toBe(false);
    expect(exact.strategies.S2?.meta).toBeTruthy();
  });

  it("fail-closed: stale family_* shadow cannot override canonical", () => {
    persistAligned([multiSlotTwo()], 3);
    localStorage.setItem(
      FAMILY_MASTERS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, masters: {} })
    );
    localStorage.setItem(
      FAMILY_MEMBERS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, members: {} })
    );
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("canonical");
    expect(prod.dataset[0]?.strategies.S1?.memberId).toBe("mb_a");
    expect(FAMILY_NORMALIZED_SCHEMA_VERSION).toBe(2);
  });

  it("fail-closed: corrupt canonical does not fall back to flat/shadow", () => {
    persistAligned([multiSlotTwo()], 2);
    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify([multiSlotThree()]));
    localStorage.setItem(CANONICAL_NORMALIZED_CORPUS_KEY, "{broken");
    const loaded = loadProductionCompatibleDataset();
    expect(loaded.source).toBe("empty");
    expect(loaded.dataset).toEqual([]);
  });
});
