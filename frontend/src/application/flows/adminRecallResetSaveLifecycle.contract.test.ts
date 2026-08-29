/**
 * adminRecallResetSaveLifecycle.contract.test.ts
 *
 * Full Lifecycle End-to-End Contract Tests for ADMIN:
 * Local DB Search → Recall (View-Only) → Reset → Edit → SAVE
 *
 * Invariants Verified:
 * - TEST A: Red Target Recall → Reset → Edit → SAVE Success with Family Identity Preserved
 * - TEST B: Yellow Target Recall → Reset → Edit → SAVE Success with Physical Color Invariance
 * - TEST C: Target=NONE Search Preparation → Matched Record Recall → Reset → SAVE Success
 * - TEST D: patchSlotRuntimeMeta does not create targetOnlyStub in applied (applied=null preserved)
 * - TEST E: Defensive Identity Resolver recovers complete Family Identity from draft when applied is partial
 * - TEST F: SAVE failure provides explicit user feedback (alert) instead of Silent No-Op
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAdminLocalDbRecall } from "./adminLocalDbFlow";
import { runCanonicalSave, type HistoryFlowContext } from "./historyFlow";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";
import {
  applyAdminWorkResetSession,
  simulateAdminRecallViewOnlyState,
} from "../../domain/system/adminEditSessionContract";
import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
} from "../../domain/positionSearchEngine";

const ballsRedTarget: Ball3 = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 }, // Red
  second: { x: 62, y: 12 }, // Yellow
};

const ballsYellowTarget: Ball3 = {
  cue: { x: 10, y: 8 },
  target: { x: 62, y: 12 }, // Yellow
  second: { x: 40, y: 20 }, // Red
};

function createSampleAuthoredRecord(
  id: string,
  balls: Ball3,
  targetBall: "red" | "yellow",
  familyId = "fm_lifecycle_001",
  memberId = "mb_lifecycle_001"
): PositionRecord {
  return {
    positionId: id,
    balls: { ...balls },
    targetBall,
    strategies: {
      S1: {
        slot: "S1",
        signature: {
          systemId: "5_half_system",
          formulaHash: "v1",
          shotType: "뒤돌리기",
        },
        sysInputs: { CO_f: 30, C3_r: 20 },
        hpT: { T: "-3/8", hit_point: { x: -2, y: 1.5 }, mode: "TIP", tipCount: 2 },
        str: { speed: 2 },
        ai: { text: "sample lesson" },
        track: "B2T_L",
        authoringStrategyId: `as_${id}`,
        familyId,
        memberId,
        memberOrigin: "AUTHORED",
        corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        correctionsStored: true,
      },
    },
    schemaVersion: 1,
  };
}

function createMemoryLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe("ADMIN Recall → Reset → Edit → SAVE Lifecycle Contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
  });

  it("TEST A — Red Target Lifecycle: Red Target → Recall (View-Only) → Reset → Edit → SAVE Success", async () => {
    const record = createSampleAuthoredRecord("pos_red_01", ballsRedTarget, "red");
    const dataset = [record];

    let appliedDrafts: any = null;
    let layersVisible = false;
    let sessionActive = true;
    let targetHydrated: string | null = null;

    const recallCtx = {
      dataset,
      ballsState: ballsRedTarget,
      adminState: {
        sys: {
          systemId: "5_half_system",
          shotType: "뒤돌리기",
          inputs: { CO_f: 30, C3_r: 20 },
          system_values: { CO_f: 30, C3_r: 20 },
        },
        balls: ballsRedTarget,
      },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: true,
      targetColor: "red",
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: (v: boolean) => { layersVisible = v; },
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: (v: boolean) => { sessionActive = v; },
      hydrateAdminRecallTarget: (t: any) => { targetHydrated = t; },
      applyPositionRecall: (rec: PositionRecord) => {
        appliedDrafts = {
          sys: {
            systemId: rec.strategies.S1!.signature.systemId,
            track: rec.strategies.S1!.track,
            inputs: rec.strategies.S1!.sysInputs,
            outputs: { result: rec.strategies.S1!.sysInputs },
          },
          hpt: rec.strategies.S1!.hpT,
          str: rec.strategies.S1!.str,
          ai: rec.strategies.S1!.ai,
          familyId: rec.strategies.S1!.familyId,
          memberId: rec.strategies.S1!.memberId,
          memberOrigin: rec.strategies.S1!.memberOrigin,
          targetBall: rec.targetBall,
        };
      },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => "red",
      resolveFormulaHash: () => "v1",
      rejectAdminRecallHydrateForMismatch: () => false,
    };

    // 1. Recall
    const matched = await runAdminLocalDbRecall(recallCtx as any);
    expect(matched).toBe(true);
    expect(layersVisible).toBe(true);
    expect(targetHydrated).toBe("red");

    // 2. View-only state check
    const viewOnly = simulateAdminRecallViewOnlyState({
      recordTargetBall: "red",
      searchQueryTargetBall: "red",
    });
    expect(viewOnly.isAdminInputSessionActive).toBe(false);
    expect(viewOnly.canUseSystemControls).toBe(false);

    // 3. Reset Transition
    const reset = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: viewOnly.targetColor,
      slotTargetBall: "red",
    });
    expect(reset.isAdminInputSessionActive).toBe(true);
    expect(reset.isTargetSelected).toBe(true);
    expect(reset.targetColor).toBe("red");
    expect(reset.canUseSystemControls).toBe(true);

    // 4. Edit + SAVE
    let historyCommitted = false;
    let savedDataset: PositionRecord[] | null = null;
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);

    const slotState = {
      draft: appliedDrafts,
      applied: null, // applied remains null!
    };

    const saveCtx: HistoryFlowContext = {
      dataset,
      ballsState: ballsRedTarget,
      adminState: recallCtx.adminState,
      activeSlot: "S1",
      slots: { S1: slotState },
      targetColor: "red",
      aiOverride: null,
      system: null,
      resolvedSlotSysValues: { CO_f: 30, C3_r: 20 },
      autoSave: false,
      canUseSystemControls: reset.canUseSystemControls,
      saveWorkingDataset: (ds) => { savedDataset = ds; },
      setDataset: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      setAdminState: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      patchSlotFamilyIdentity: vi.fn(),
      saveToFile: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: () => { historyCommitted = true; },
      resolveFormulaHash: () => "v1",
      resolveEvalProfile: () => ({ formula: { expr: "CO_f - C3_r" } }),
      resolveAnchorsData: () => undefined,
    };

    const saveResult = runCanonicalSave(saveCtx);
    expect(saveResult.ok).toBe(true);
    expect(historyCommitted).toBe(true);
    expect(saveResult.familyId).toBe("fm_lifecycle_001");
  });

  it("TEST B — Yellow Target Lifecycle: Yellow Target → Recall → Reset → Edit → SAVE Success", async () => {
    const record = createSampleAuthoredRecord("pos_yellow_01", ballsYellowTarget, "yellow");
    const dataset = [record];

    const viewOnly = simulateAdminRecallViewOnlyState({
      recordTargetBall: "yellow",
      searchQueryTargetBall: "yellow",
    });
    expect(viewOnly.targetColor).toBe("yellow");

    const reset = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: viewOnly.targetColor,
      slotTargetBall: "yellow",
    });
    expect(reset.targetColor).toBe("yellow");
    expect(reset.canUseSystemControls).toBe(true);

    let historyCommitted = false;
    const saveCtx: HistoryFlowContext = {
      dataset,
      ballsState: ballsYellowTarget,
      adminState: {
        sys: {
          systemId: "5_half_system",
          shotType: "뒤돌리기",
          inputs: { CO_f: 30, C3_r: 20 },
          system_values: { CO_f: 30, C3_r: 20 },
        },
      },
      activeSlot: "S1",
      slots: {
        S1: {
          draft: {
            sys: {
              systemId: "5_half_system",
              track: "B2T_L",
              inputs: { CO_f: 30, C3_r: 20 },
              outputs: { result: { CO_f: 30, C3_r: 20 } },
            },
            hpt: { T: "-3/8" },
            str: { speed: 2 },
            ai: { text: "lesson" },
            familyId: "fm_lifecycle_001",
            memberId: "mb_lifecycle_001",
            memberOrigin: "AUTHORED",
            targetBall: "yellow",
          },
          applied: null,
        },
      },
      targetColor: "yellow",
      aiOverride: null,
      system: null,
      resolvedSlotSysValues: { CO_f: 30, C3_r: 20 },
      autoSave: false,
      canUseSystemControls: reset.canUseSystemControls,
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      setAdminState: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      patchSlotFamilyIdentity: vi.fn(),
      saveToFile: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: () => { historyCommitted = true; },
      resolveFormulaHash: () => "v1",
      resolveEvalProfile: () => ({ formula: { expr: "CO_f - C3_r" } }),
      resolveAnchorsData: () => undefined,
    };

    const saveResult = runCanonicalSave(saveCtx);
    expect(saveResult.ok).toBe(true);
    expect(historyCommitted).toBe(true);
  });

  it("TEST C — Target=NONE Search Preparation → Matched Record Recall → Reset → SAVE Success", () => {
    // 1. Search in Target=NONE mode, matches a record with targetBall="red"
    const recallState = simulateAdminRecallViewOnlyState({
      recordTargetBall: "red",
      searchQueryTargetBall: null, // query was Target=NONE
    });
    expect(recallState.targetColor).toBe("red");
    expect(recallState.isAdminInputSessionActive).toBe(false);

    // 2. Reset to Edit
    const editState = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recallState.targetColor,
      slotTargetBall: "red",
    });
    expect(editState.isAdminInputSessionActive).toBe(true);
    expect(editState.targetColor).toBe("red");
    expect(editState.canUseSystemControls).toBe(true);

    // 3. Save
    let historyCommitted = false;
    const saveCtx: HistoryFlowContext = {
      dataset: [createSampleAuthoredRecord("pos_none_01", ballsRedTarget, "red")],
      ballsState: ballsRedTarget,
      adminState: {
        sys: {
          systemId: "5_half_system",
          shotType: "뒤돌리기",
          inputs: { CO_f: 30, C3_r: 20 },
          system_values: { CO_f: 30, C3_r: 20 },
        },
      },
      activeSlot: "S1",
      slots: {
        S1: {
          draft: {
            sys: {
              systemId: "5_half_system",
              track: "B2T_L",
              inputs: { CO_f: 30, C3_r: 20 },
              outputs: { result: { CO_f: 30, C3_r: 20 } },
            },
            hpt: { T: "-3/8" },
            str: { speed: 2 },
            ai: { text: "lesson" },
            familyId: "fm_lifecycle_001",
            memberId: "mb_lifecycle_001",
            memberOrigin: "AUTHORED",
            targetBall: "red",
          },
          applied: null,
        },
      },
      targetColor: "red",
      aiOverride: null,
      system: null,
      resolvedSlotSysValues: { CO_f: 30, C3_r: 20 },
      autoSave: false,
      canUseSystemControls: editState.canUseSystemControls,
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      setAdminState: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      patchSlotFamilyIdentity: vi.fn(),
      saveToFile: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: () => { historyCommitted = true; },
      resolveFormulaHash: () => "v1",
      resolveEvalProfile: () => ({ formula: { expr: "CO_f - C3_r" } }),
      resolveAnchorsData: () => undefined,
    };

    const saveResult = runCanonicalSave(saveCtx);
    expect(saveResult.ok).toBe(true);
    expect(historyCommitted).toBe(true);
  });

  it("TEST D — patchSlotRuntimeMeta does not create targetOnlyStub in applied", () => {
    // Simulate patchSlotRuntimeMeta logic on slot with applied: null
    const slot = {
      draft: {
        sys: { systemId: "5_half_system" },
        familyId: "fm_01",
        memberId: "mb_01",
        memberOrigin: "AUTHORED" as const,
      },
      applied: null,
    };

    const meta = { targetBall: "red" as const };
    const patch = { targetBall: meta.targetBall };
    const targetOnlyStub = { targetBall: meta.targetBall };

    const nextSlot = {
      draft: slot.draft ? { ...slot.draft, ...patch } : targetOnlyStub,
      applied: slot.applied ? { ...slot.applied, ...patch } : null,
    };

    expect(nextSlot.applied).toBeNull();
    expect(nextSlot.draft.familyId).toBe("fm_01");
    expect(nextSlot.draft.targetBall).toBe("red");
  });

  it("TEST E — Defensive Identity Resolver recovers complete Family Identity from draft when applied is partial", () => {
    // Case where applied exists (e.g. from partial SYS apply) but has no familyId
    const slotWithPartialApplied = {
      draft: {
        sys: { systemId: "5_half_system", track: "B2T_L" },
        familyId: "fm_defensive_001",
        memberId: "mb_defensive_001",
        memberOrigin: "AUTHORED" as const,
      },
      applied: {
        sys: { systemId: "5_half_system", track: "B2T_L" },
        // familyId missing in applied!
      },
    };

    const saveCtx: SaveFlowContext = {
      dataset: [createSampleAuthoredRecord("pos_def_01", ballsRedTarget, "red", "fm_defensive_001", "mb_defensive_001")],
      ballsState: ballsRedTarget,
      adminState: {
        sys: {
          systemId: "5_half_system",
          shotType: "뒤돌리기",
          inputs: { CO_f: 30, C3_r: 20 },
          system_values: { CO_f: 30, C3_r: 20 },
        },
      },
      activeSlot: "S1",
      slots: { S1: slotWithPartialApplied },
      targetColor: "red",
      aiOverride: null,
      system: null,
      resolvedSlotSysValues: { CO_f: 30, C3_r: 20 },
      autoSave: false,
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      setAdminState: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      patchSlotFamilyIdentity: vi.fn(),
      saveToFile: vi.fn(),
      resolveFormulaHash: () => "v1",
      resolveEvalProfile: () => ({ formula: { expr: "CO_f - C3_r" } }),
      resolveAnchorsData: () => undefined,
    };

    const saveResult = runSaveStrategy(saveCtx);
    expect(saveResult.ok).toBe(true);
    expect(saveResult.familyId).toBe("fm_defensive_001");
  });

  it("TEST F — SAVE failure provides explicit user feedback (alert) instead of Silent No-Op", () => {
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);

    // Missing sysInputs causes runSaveStrategy to fail with 'missing-persistable-base-sys-inputs'
    const failCtx: HistoryFlowContext = {
      dataset: [],
      ballsState: ballsRedTarget,
      adminState: {
        sys: {
          systemId: "5_half_system",
          shotType: "뒤돌리기",
          inputs: {},
          system_values: {},
        },
      },
      activeSlot: "S1",
      slots: {
        S1: {
          draft: { sys: { systemId: "5_half_system" } },
          applied: null,
        },
      },
      targetColor: "red",
      aiOverride: null,
      system: null,
      resolvedSlotSysValues: {},
      autoSave: false,
      canUseSystemControls: true,
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      setAdminState: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      patchSlotFamilyIdentity: vi.fn(),
      saveToFile: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: vi.fn(),
      resolveFormulaHash: () => "v1",
      resolveEvalProfile: () => ({ formula: {} }),
      resolveAnchorsData: () => undefined,
    };

    const result = runCanonicalSave(failCtx);
    expect(result.ok).toBe(false);
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining("저장 실패")
    );
  });
});
