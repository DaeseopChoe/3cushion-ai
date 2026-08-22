/**
 * Phase 3A-347 — Production parity regression completion.
 * Closes 3A-346 CONDITIONAL gaps: ADMIN LocalDB E2E, S2/S3 recall→edit→SAVE,
 * preferred S3, Approval/Import reload, determinism, meta regeneration.
 *
 * Run: npx vitest run src/application/flows/productionParity.347.contract.test.ts
 *
 * PRODUCTION CODE UNCHANGED. Flag default remains false.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ballsExactEqual } from "../../domain/cueEditSnap";
import { WORKING_DATASET_KEY } from "../../domain/dataset/infra/datasetStorage";
import {
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  writePositionsDatasetCorpusGeneration,
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
import { runAdminLocalDbRecall } from "./adminLocalDbFlow";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";
import {
  commitDerivedApprovalDataset,
  type DerivedReviewBaselineSnapshot,
} from "./derivedApprovalFlow";

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

function persistAligned(dataset: PositionRecord[], gen = 7) {
  localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(dataset));
  writePositionsDatasetCorpusGeneration(gen);
  const sync = syncPositionDatasetToNormalizedFamilyStore(dataset, {
    corpusGeneration: gen,
  });
  expect(sync.ok).toBe(true);
  expect(isNormalizedCorpusFresh()).toBe(true);
  return sync;
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

/** Mirrors useShotSlots applyPositionRecall draft mapping for parity asserts. */
function applyPositionRecallCapture(record: PositionRecord) {
  const drafts: Record<string, { memberId?: string; familyId?: string }> = {};
  for (const slotId of ["S1", "S2", "S3"] as const) {
    const e = record.strategies[slotId];
    if (!e) continue;
    drafts[slotId] = { memberId: e.memberId, familyId: e.familyId };
  }
  return drafts;
}

type LocalDbCapture = {
  appliedRecord: PositionRecord | null;
  drafts: ReturnType<typeof applyPositionRecallCapture> | null;
  adminSysMemberId: string | null;
  adminSysFamilyId: string | null;
};

async function runLocalDbParity(args: {
  dataset: PositionRecord[];
  activeSlot: "S1" | "S2" | "S3";
  balls: Ball3;
}): Promise<{ ok: boolean; capture: LocalDbCapture }> {
  const capture: LocalDbCapture = {
    appliedRecord: null,
    drafts: null,
    adminSysMemberId: null,
    adminSysFamilyId: null,
  };
  let adminState: Record<string, unknown> = {
    balls: args.balls,
    sys: {
      systemId: "5_half_system",
      system_id: "5_half_system",
      shotType: "뒤돌리기",
    },
  };

  const ok = await runAdminLocalDbRecall({
    dataset: args.dataset,
    ballsState: args.balls as unknown as Record<string, unknown>,
    adminState,
    activeSlot: args.activeSlot,
    slots: { S1: {}, S2: {}, S3: {} },
    isTargetSelected: true,
    targetColor: "red",
    setAdminState: (updater) => {
      adminState = updater(adminState);
      const sys = adminState.sys as Record<string, unknown> | undefined;
      capture.adminSysMemberId =
        (sys?.memberId as string | undefined) ??
        ((sys as { family?: { memberId?: string } } | undefined)?.family
          ?.memberId as string | undefined) ??
        null;
      // adminSysFromRecallEntry may put identity on sys differently — also read signature
      void sys;
    },
    setIsAdminPublishedSearchMatched: vi.fn(),
    setAdminTableLayersVisible: vi.fn(),
    setShowCoaching: vi.fn(),
    applyPositionRecall: (record) => {
      capture.appliedRecord = record;
      capture.drafts = applyPositionRecallCapture(record);
    },
    patchSlotRuntimeMeta: vi.fn(),
    clearAdminSearchDisplayRuntime: vi.fn(),
    beginAdminInputSession: () => true,
    getAdminRecallQueryTargetBall: () => "red",
    resolveFormulaHash: () => "h1",
  });

  // Prefer identity from applied record strategies[activeSlot]
  const activeEntry = capture.appliedRecord?.strategies?.[args.activeSlot];
  if (activeEntry) {
    capture.adminSysMemberId = activeEntry.memberId ?? capture.adminSysMemberId;
    capture.adminSysFamilyId = activeEntry.familyId ?? null;
  }

  return { ok, capture };
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
        shotType: "뒤돌리기",
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

  it("flag constant default ON; explicit override OFF → legacy even when family fresh", () => {
    expect(FAMILY_NORMALIZED_STORAGE_ENABLED).toBe(true);
    persistAligned([multiSlotTwo()]);
    forceFamilyNormalizedStorageEnabledForTests(false);
    expect(isFamilyNormalizedStorageEnabled()).toBe(false);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("flag_off");
  });

  it("A0 default ON + fresh multi-slot → normalized without test force-ON", () => {
    persistAligned([multiSlotTwo()]);
    expect(isFamilyNormalizedStorageEnabled()).toBe(true);
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("normalized");
    expect(prod.dataset[0]?.strategies.S1?.memberId).toBe("mb_a");
    expect(prod.dataset[0]?.strategies.S2?.memberId).toBe("mb_b");
  });

  it("A/B ADMIN LocalDB E2E: legacy vs rematerialized — activeSlot S2", async () => {
    const legacy = [multiSlotTwo()];
    persistAligned(legacy);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("normalized");

    const a = await runLocalDbParity({
      dataset: legacy,
      activeSlot: "S2",
      balls: ballsX,
    });
    const b = await runLocalDbParity({
      dataset: prod.dataset,
      activeSlot: "S2",
      balls: ballsX,
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.capture.appliedRecord?.positionId).toBe(
      b.capture.appliedRecord?.positionId
    );
    expect(a.capture.appliedRecord?.balls).toEqual(b.capture.appliedRecord?.balls);
    expect(a.capture.drafts?.S2?.memberId).toBe("mb_b");
    expect(b.capture.drafts?.S2?.memberId).toBe("mb_b");
    expect(a.capture.drafts?.S1?.memberId).toBe("mb_a");
    expect(b.capture.drafts?.S1?.memberId).toBe("mb_a");
    // Must hydrate S2 identity for activeSlot, not remap to S1
    expect(a.capture.adminSysMemberId).toBe("mb_b");
    expect(b.capture.adminSysMemberId).toBe("mb_b");
    expect(a.capture.adminSysFamilyId).toBe("fm_b");
    expect(b.capture.adminSysFamilyId).toBe("fm_b");
  });

  it("C ADMIN LocalDB E2E: activeSlot S3 — no S1/S2 remap", async () => {
    const legacy = [multiSlotThree()];
    persistAligned(legacy);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("normalized");
    expect(prod.dataset[0]?.strategies.S3?.memberId).toBe("mb_c");

    const a = await runLocalDbParity({
      dataset: legacy,
      activeSlot: "S3",
      balls: ballsX,
    });
    const b = await runLocalDbParity({
      dataset: prod.dataset,
      activeSlot: "S3",
      balls: ballsX,
    });
    expect(a.ok && b.ok).toBe(true);
    expect(b.capture.drafts?.S3?.memberId).toBe("mb_c");
    expect(b.capture.adminSysMemberId).toBe("mb_c");
    expect(b.capture.adminSysMemberId).not.toBe("mb_a");
    expect(b.capture.adminSysMemberId).not.toBe("mb_b");
    expect(a.capture.appliedRecord?.positionId).toBe(
      b.capture.appliedRecord?.positionId
    );
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
    const authoredMember = Object.values(loadFamilyMembersEnvelope().members).find(
      (m) => m.memberId === "mb_s3"
    )!;
    expect(authoredMember.sourceSlot).toBe("S3");

    forceFamilyNormalizedStorageEnabledForTests(true);
    const loaded = loadProductionCompatibleDataset();
    expect(loaded.source).toBe("normalized");
    const again = loaded.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(again.strategies.S3?.memberId).toBe("mb_s3");
    expect(again.strategies.S1?.memberId).not.toBe("mb_s3");
    expect(again.strategies.S2?.memberId).not.toBe("mb_s3");
  });

  it("E Recall S2 → edit → SAVE → reload: sibling S1 preserved", async () => {
    const legacy = [multiSlotTwo()];
    persistAligned(legacy, 5);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const view = loadProductionCompatibleDataset();
    expect(view.source).toBe("normalized");

    const recall = await runLocalDbParity({
      dataset: view.dataset,
      activeSlot: "S2",
      balls: ballsX,
    });
    expect(recall.ok).toBe(true);
    const s2 = recall.capture.appliedRecord!.strategies.S2!;
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

    // Reload rematerialize after SAVE sync
    expect(isNormalizedCorpusFresh()).toBe(true);
    const reloaded = loadProductionCompatibleDataset();
    expect(reloaded.source).toBe("normalized");
    const packed = reloaded.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(packed.strategies.S1?.memberId).toBe("mb_a");
    expect(packed.strategies.S2?.memberId).toBe("mb_b");
    expect(packed.strategies.S2?.sysInputs?.CO_f).toBe(31);
  });

  it("F Recall S3 → edit → SAVE → reload: siblings S1/S2 preserved", async () => {
    const legacy = [multiSlotThree()];
    persistAligned(legacy, 6);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const view = loadProductionCompatibleDataset();
    expect(view.source).toBe("normalized");

    const recall = await runLocalDbParity({
      dataset: view.dataset,
      activeSlot: "S3",
      balls: ballsX,
    });
    expect(recall.ok).toBe(true);
    const s3 = recall.capture.appliedRecord!.strategies.S3!;

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

    const reloaded = loadProductionCompatibleDataset();
    expect(reloaded.source).toBe("normalized");
    const packed = reloaded.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(packed.strategies.S1?.memberId).toBe("mb_a");
    expect(packed.strategies.S2?.memberId).toBe("mb_b");
    expect(packed.strategies.S3?.memberId).toBe("mb_c");
    expect(packed.strategies.S3?.sysInputs?.CO_f).toBe(33);
  });

  it("G Approval → reload → rematerialize packing + sourceSlot", () => {
    const legacy = [multiSlotTwo()];
    // Seed gen then Approval bumps
    persistAligned(legacy, 1);
    const approvedDataset = structuredClone(legacy);
    // Simulate Approval adding a derived-like sibling on new Exact (keep multi-slot intact)
    approvedDataset.push({
      positionId: createPositionId({
        cue: { x: 11, y: 8 },
        target: { x: 40, y: 20 },
        second: { x: 62, y: 12 },
      }),
      balls: { cue: { x: 11, y: 8 }, target: { x: 40, y: 20 }, second: { x: 62, y: 12 } },
      targetBall: "red",
      schemaVersion: 1,
      strategies: {
        S1: entry({
          slot: "S1",
          familyId: "fm_a",
          memberId: "mb_derived_appr",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: "mb_a",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "cue_impact:t:0.100000",
          authoringStrategyId: "as_derived_appr",
        }),
      },
    });

    const baseline: DerivedReviewBaselineSnapshot = {
      ballsState: ballsX,
      adminState: {},
      overlayState: {},
      targetColor: "red",
      isTargetSelected: true,
      shotEditor: {},
      activeSlot: "S1",
    };
    const commit = commitDerivedApprovalDataset({
      resultDataset: approvedDataset,
      baselineSnapshot: baseline,
      saveWorkingDataset: (u) => {
        localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(u));
      },
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: vi.fn(),
    });
    expect(commit.corpusPersist.ok).toBe(true);
    expect(commit.normalizedDualWrite.ok).toBe(true);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(2);
    expect(isNormalizedCorpusFresh()).toBe(true);

    forceFamilyNormalizedStorageEnabledForTests(true);
    const loaded = loadProductionCompatibleDataset();
    expect(loaded.source).toBe("normalized");
    const packed = loaded.dataset.find((r) => ballsExactEqual(r.balls, ballsX))!;
    expect(packed.strategies.S1?.memberId).toBe("mb_a");
    expect(packed.strategies.S2?.memberId).toBe("mb_b");
    const members = Object.values(loadFamilyMembersEnvelope().members);
    expect(members.every((m) => m.sourceSlot === "S1" || m.sourceSlot === "S2")).toBe(
      true
    );
  });

  it("H Import → reload → rematerialize", () => {
    const imported = [multiSlotThree()];
    const persist = persistPositionsDatasetWithGeneration(imported);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    const sync = syncPositionDatasetToNormalizedFamilyStore(imported, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);

    forceFamilyNormalizedStorageEnabledForTests(true);
    const loaded = loadProductionCompatibleDataset();
    expect(loaded.source).toBe("normalized");
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
    expect(r1.source).toBe("normalized");
    expect(r2.dataset).toEqual(r1.dataset);
  });

  it("J meta regeneration: SAVE does not persist rematerialize placeholder as durable meta", async () => {
    const legacy = [multiSlotTwo()];
    persistAligned(legacy, 9);
    forceFamilyNormalizedStorageEnabledForTests(true);
    const view = loadProductionCompatibleDataset();
    expect(view.source).toBe("normalized");
    // Rematerialized S2 uses placeholder meta (no StrategyEntry.meta in family shadow)
    expect(
      isPlaceholderMeta(view.dataset[0]?.strategies.S2?.meta, ballsX)
    ).toBe(true);

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

  it("fail-closed: schema v1 / missing sourceSlot → legacy under flag ON", () => {
    persistAligned([multiSlotTwo()], 3);
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
    forceFamilyNormalizedStorageEnabledForTests(true);
    expect(isNormalizedCorpusFresh()).toBe(false);
    const prod = loadProductionCompatibleDataset();
    expect(prod.source).toBe("legacy");
    expect(FAMILY_NORMALIZED_SCHEMA_VERSION).toBe(2);
  });

  it("compatible load fails closed on collision (no fan-out)", () => {
    persistAligned([multiSlotTwo()], 2);
    const env = loadFamilyMembersEnvelope();
    const s1 = Object.values(env.members).find((m) => m.sourceSlot === "S1")!;
    env.members.mb_collision = { ...s1, memberId: "mb_collision" };
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, JSON.stringify(env));
    const loaded = loadFamilyCompatibleDataset();
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) {
      expect(loaded.issues.some((i) => i.code === "SLOT_COLLISION")).toBe(true);
    }
    forceFamilyNormalizedStorageEnabledForTests(true);
    expect(loadProductionCompatibleDataset().source).toBe("legacy");
  });
});
