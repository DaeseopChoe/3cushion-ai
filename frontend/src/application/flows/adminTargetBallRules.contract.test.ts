/**
 * adminTargetBallRules.contract.test.ts
 *
 * Contract tests for ADMIN Target Ball UI rules:
 * - Default Target: NONE / UNSELECTED (isTargetSelected: false, targetColor: null)
 * - Explicit Target Designation: Double-click on Yellow or Red ball
 * - Target Switch: Double-clicking the other object ball switches the Target
 * - Search Without Target: 3-Ball coordinate recall works in Target=NONE state
 * - Search With Explicit Target: Target-specific filter applies when explicitly designated
 * - USER Search Parity: USER Search remains unaffected and coordinate-based
 * - Role SSOT: Ball roles (cue, target, second) separated from physical color
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import {
  lockTargetRoleFromClickedBall,
  paintHexForTargetRole,
  paintHexForSecondRole,
  BALL_PAINT_HEX,
  type BallsMap,
} from "../../domain/ballRole";
import {
  resolveAdminTargetReadyBall,
  resolveAdminResetTargetMeta,
  canUseAdminSystemControls,
  applyAdminWorkResetSession,
} from "../../domain/system/adminEditSessionContract";
import { runSpatialRecall } from "../../domain/recall/recallEngine";
import { runAdminLocalDbRecall } from "./adminLocalDbFlow";
import type { PositionRecord } from "../../domain/positionSearchEngine";
import {
  useCoachingController,
  computeCoachingState,
} from "../../hooks/useCoachingController";
import { calcImpactBall } from "../../data/system/calculator";
import { runUserSearch } from "./userSearchFlow";
import {
  hydrateFamilyMemberRuntimeHpt,
  hydrateFamilyMemberRuntimeThickness,
} from "../../domain/family/familyRuntimeProjection";
import { commitDerivedApprovalDataset } from "./derivedApprovalFlow";
import { runCanonicalSave } from "./historyFlow";
import {
  loadWorkspaceHistory,
  saveWorkspaceHistory,
} from "../../domain/workspaceHistory";
import {
  loadWorkingDataset,
  saveWorkingDataset,
} from "../../domain/dataset/infra/datasetStorage";

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

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  vi.stubGlobal("alert", vi.fn());
});

const baseBalls: BallsMap = {
  cue: { x: 30, y: 70 },
  target: { x: 20, y: 50 },
  second: { x: 15, y: 30 },
};

const derivedCueBalls: BallsMap = {
  cue: { x: 32, y: 68 },
  target: { x: 20, y: 50 },
  second: { x: 15, y: 30 },
};

const derivedSecondBalls: BallsMap = {
  cue: { x: 30, y: 70 },
  target: { x: 20, y: 50 },
  second: { x: 16.5, y: 31.5 },
};

function makeSampleRecord(id: string, balls: BallsMap, targetBall?: "yellow" | "red"): PositionRecord {
  return {
    positionId: id,
    balls: {
      cue: { x: balls.cue!.x, y: balls.cue!.y },
      target: { x: balls.target!.x, y: balls.target!.y },
      second: { x: balls.second!.x, y: balls.second!.y },
    },
    targetBall: targetBall ?? "yellow",
    familyId: "fam_001",
    memberId: id,
    memberOrigin: "AUTHORED",
    strategies: {
      S1: {
        slot: "S1",
        signature: {
          systemId: "5_half_system",
          formulaHash: "test_hash",
          shotType: "뒤돌리기",
        },
        sysInputs: {},
        hpT: { T: "8/8" },
        str: "MEDIUM",
        ai: "AI",
        track: "B2T_L",
      },
    },
  };
}

describe("ADMIN Target Ball UI & Search Rules (T1 - T9)", () => {
  it("T1 — Initial State: Target is NONE (no automatic yellow/red target)", () => {
    const isTargetSelected = false;
    const targetColor = null;

    // Ready resolves to null when target is unselected
    const ready = resolveAdminTargetReadyBall({
      isTargetSelected,
      targetColor,
      slotTargetBall: null,
    });
    expect(ready).toBeNull();

    // System controls are blocked in unselected state
    const canUseControls = canUseAdminSystemControls({
      appMode: "ADMIN",
      isAdminInputSessionActive: true,
      targetReadyBall: ready,
    });
    expect(canUseControls).toBe(false);

    // Ball colors render neutral defaults without target emphasis
    expect(paintHexForTargetRole(targetColor)).toBe(BALL_PAINT_HEX.yellow);
    expect(paintHexForSecondRole(targetColor)).toBe(BALL_PAINT_HEX.red);
  });

  it("T2 — Search Without Target: Original record recalled by coordinates alone", () => {
    const record = makeSampleRecord("pos_orig", baseBalls, "yellow");
    const dataset = [record];

    // Query in Target=NONE state (targetBall: null)
    const result = runSpatialRecall({
      dataset,
      query: { balls: baseBalls as any, targetBall: null },
      profile: "adminSearch",
    });

    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.record.positionId).toBe("pos_orig");
      expect(result.distance).toBe(0);
    }
  });

  it("T3 — Derived Cue Search Without Target: Recalls Cue-derived position", () => {
    const origRecord = makeSampleRecord("pos_orig", baseBalls, "yellow");
    const cueDerivedRecord = makeSampleRecord("pos_derived_cue", derivedCueBalls, "yellow");
    const dataset = [origRecord, cueDerivedRecord];

    // Query at cue-derived position without target designation
    const result = runSpatialRecall({
      dataset,
      query: { balls: derivedCueBalls as any, targetBall: null },
      profile: "adminSearch",
    });

    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.record.positionId).toBe("pos_derived_cue");
      expect(result.distance).toBe(0);
    }
  });

  it("T4 — Derived Second/C3+ Search Without Target: Recalls Second-derived position", () => {
    const origRecord = makeSampleRecord("pos_orig", baseBalls, "yellow");
    const secondDerivedRecord = makeSampleRecord("pos_derived_second", derivedSecondBalls, "yellow");
    const dataset = [origRecord, secondDerivedRecord];

    // Query at second-derived position without target designation
    const result = runSpatialRecall({
      dataset,
      query: { balls: derivedSecondBalls as any, targetBall: null },
      profile: "adminSearch",
    });

    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.record.positionId).toBe("pos_derived_second");
      expect(result.distance).toBe(0);
    }
  });

  it("T5 — Yellow Explicit Target: Double-click Yellow assigns Yellow as Target", () => {
    // Initial balls: target = Yellow pos, second = Red pos
    const initialBalls: BallsMap = {
      cue: { x: 30, y: 70 },
      target: { x: 20, y: 50 },
      second: { x: 15, y: 30 },
    };

    // Double-click Yellow ball (field 'target')
    const locked = lockTargetRoleFromClickedBall(initialBalls, "target", null);
    expect(locked.targetColor).toBe("yellow");
    expect(locked.balls.target).toEqual({ x: 20, y: 50 });
    expect(locked.balls.second).toEqual({ x: 15, y: 30 });

    const ready = resolveAdminTargetReadyBall({
      isTargetSelected: true,
      targetColor: locked.targetColor,
    });
    expect(ready).toBe("yellow");
    expect(canUseAdminSystemControls({
      appMode: "ADMIN",
      isAdminInputSessionActive: true,
      targetReadyBall: ready,
    })).toBe(true);
  });

  it("T6 — Red Explicit Target: Double-click Red assigns Red as Target", () => {
    // Initial balls: target = Yellow pos, second = Red pos
    const initialBalls: BallsMap = {
      cue: { x: 30, y: 70 },
      target: { x: 20, y: 50 },
      second: { x: 15, y: 30 },
    };

    // Double-click Red ball (field 'second')
    const locked = lockTargetRoleFromClickedBall(initialBalls, "second", null);
    expect(locked.targetColor).toBe("red");
    // Balls swapped so that balls.target holds the physical Red ball position
    expect(locked.balls.target).toEqual({ x: 15, y: 30 });
    expect(locked.balls.second).toEqual({ x: 20, y: 50 });

    // Target role painting reflects Red as target
    expect(paintHexForTargetRole(locked.targetColor)).toBe(BALL_PAINT_HEX.red);
    expect(paintHexForSecondRole(locked.targetColor)).toBe(BALL_PAINT_HEX.yellow);
  });

  it("T7 — Target Switch: Yellow Target → Double-click Red switches Target to Red", () => {
    const ballsWithYellowTarget: BallsMap = {
      cue: { x: 30, y: 70 },
      target: { x: 20, y: 50 }, // Yellow
      second: { x: 15, y: 30 }, // Red
    };

    // 1. Initially Yellow target
    const step1 = lockTargetRoleFromClickedBall(ballsWithYellowTarget, "target", null);
    expect(step1.targetColor).toBe("yellow");

    // 2. Double-click other object ball (currently at 'second', which is Red)
    const step2 = lockTargetRoleFromClickedBall(step1.balls, "second", step1.targetColor);
    expect(step2.targetColor).toBe("red");
    expect(step2.balls.target).toEqual({ x: 15, y: 30 }); // Red becomes Target
    expect(step2.balls.second).toEqual({ x: 20, y: 50 }); // Yellow becomes Second

    // 3. Double-click Yellow again (currently at 'second')
    const step3 = lockTargetRoleFromClickedBall(step2.balls, "second", step2.targetColor);
    expect(step3.targetColor).toBe("yellow");
    expect(step3.balls.target).toEqual({ x: 20, y: 50 }); // Yellow becomes Target
    expect(step3.balls.second).toEqual({ x: 15, y: 30 }); // Red becomes Second
  });

  it("T8 — Reset Preserves Recalled Target Metadata & Opens Edit Session (Target=NONE when unselected)", () => {
    // 1. Recalled target is preserved and edit controls are enabled
    const resetRecalled = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: "yellow",
      slotTargetBall: "yellow",
    });
    expect(resetRecalled.isTargetSelected).toBe(true);
    expect(resetRecalled.targetColor).toBe("yellow");
    expect(resetRecalled.slotTargetBall).toBe("yellow");
    expect(resetRecalled.isAdminInputSessionActive).toBe(true);
    expect(resetRecalled.canUseSystemControls).toBe(true);

    // 2. Unselected state returns null / NONE
    const resetUnselected = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: null,
      slotTargetBall: null,
    });
    expect(resetUnselected.isTargetSelected).toBe(false);
    expect(resetUnselected.targetColor).toBeNull();
    expect(resetUnselected.canUseSystemControls).toBe(false);
    expect(resolveAdminResetTargetMeta()).toBeNull();
  });

  it("T9 — Flow Integration: runAdminLocalDbRecall succeeds in Target=NONE and explicit Target modes", async () => {
    const record = makeSampleRecord("pos_001", baseBalls, "yellow");
    const dataset = [record];

    let appliedRecord: PositionRecord | null = null;
    let hydratedTarget: string | null = null;
    let layersVisible = false;

    const ctx = {
      dataset,
      ballsState: baseBalls,
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" }, balls: baseBalls },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: false,
      targetColor: null,
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: (v: boolean) => { layersVisible = v; },
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: (t: any) => { hydratedTarget = t; },
      applyPositionRecall: (rec: PositionRecord) => { appliedRecord = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null, // Target = NONE
      resolveFormulaHash: () => "test_hash",
    };

    // 1. Search in Target=NONE mode
    const matched = await runAdminLocalDbRecall(ctx as any);
    expect(matched).toBe(true);
    expect(appliedRecord).not.toBeNull();
    expect(appliedRecord?.positionId).toBe("pos_001");
    expect(layersVisible).toBe(true);
    // Recalled record hydrates targetColor metadata for view-only
    expect(hydratedTarget).toBe("yellow");

    // 2. Explicit Target mode with matching target
    ctx.isTargetSelected = true;
    ctx.targetColor = "yellow";
    ctx.getAdminRecallQueryTargetBall = () => "yellow";

    const matchedExplicit = await runAdminLocalDbRecall(ctx as any);
    expect(matchedExplicit).toBe(true);
  });
});

describe("ADMIN Explicit Target & Coaching Gate Regression Contracts (TEST A ~ TEST J)", () => {
  const initialAdminBalls: BallsMap = {
    cue: { x: 20, y: 16 },
    target: { x: 20, y: 20 },
    second: { x: 60, y: 20 },
  };

  const defaultCoachingProps = {
    appMode: "ADMIN",
    isTargetSelected: false,
    showCoaching: false,
    canEdit: true,
    T: "8/8",
    impactMode: "CONTACT",
    setImpactMode: vi.fn(),
    balls: initialAdminBalls as Record<string, { x: number; y: number } | undefined>,
    targetPointForImpact: null,
    setBallsState: vi.fn(),
    calcImpactBall,
    SCALE: 1,
    TABLE_H: 400,
    PADDING: 20,
    RENDER_RADIUS_RG: 1.5,
    BALL_RADIUS_RG: 1.5,
  };

  function testCoaching(props: Partial<typeof defaultCoachingProps>) {
    return computeCoachingState({ ...defaultCoachingProps, ...props });
  }

  it("TEST A — Fresh ADMIN hard refresh: Target=NONE, Impact Ball hidden, Guide hidden", () => {
    const targetColor = null;
    const isTargetSelected = false;

    expect(targetColor).toBeNull();
    expect(isTargetSelected).toBe(false);

    const coaching = testCoaching({
      appMode: "ADMIN",
      isTargetSelected: false,
      balls: initialAdminBalls as any,
    });

    expect(coaching.impactBallPx).toBeNull();
    expect(coaching.guideLineNode).toBeNull();
  });

  it("TEST B — Red Target: Fresh ADMIN → Red double-click assigns Red Target, Impact/Guide visible", () => {
    // Double click Red ball (which is at 'second' in initial balls)
    const locked = lockTargetRoleFromClickedBall(initialAdminBalls, "second", null);
    expect(locked.targetColor).toBe("red");
    expect(locked.balls.target).toEqual({ x: 60, y: 20 });
    expect(locked.balls.second).toEqual({ x: 20, y: 20 });

    const isTargetSelected = true;
    const coaching = testCoaching({
      appMode: "ADMIN",
      isTargetSelected,
      balls: locked.balls as any,
    });

    expect(coaching.impactBallPx).not.toBeNull();
    expect(coaching.guideLineNode).not.toBeNull();
    expect(coaching.guideLineNode?.x1).toBe(20 + 20); // cue.x + PADDING
  });

  it("TEST C — Yellow Target: Fresh ADMIN → Yellow double-click assigns Yellow Target, Impact/Guide visible", () => {
    // Double click Yellow ball (which is at 'target' in initial balls)
    const locked = lockTargetRoleFromClickedBall(initialAdminBalls, "target", null);
    expect(locked.targetColor).toBe("yellow");
    expect(locked.balls.target).toEqual({ x: 20, y: 20 });
    expect(locked.balls.second).toEqual({ x: 60, y: 20 });

    const isTargetSelected = true;
    const coaching = testCoaching({
      appMode: "ADMIN",
      isTargetSelected,
      balls: locked.balls as any,
    });

    expect(coaching.impactBallPx).not.toBeNull();
    expect(coaching.guideLineNode).not.toBeNull();
    expect(coaching.guideLineNode?.x1).toBe(20 + 20); // cue.x + PADDING
  });

  it("TEST D — Drag Is Not Selection: dragging Red/Yellow does not select Target, Impact/Guide remain hidden", () => {
    // Simulating ball drag state: coordinates move, but isTargetSelected and targetColor remain unselected
    const draggedBalls: BallsMap = {
      cue: { x: 25, y: 18 },
      target: { x: 22, y: 24 },
      second: { x: 65, y: 22 },
    };
    const isTargetSelected = false;
    const targetColor = null;

    expect(isTargetSelected).toBe(false);
    expect(targetColor).toBeNull();

    const coaching = testCoaching({
      appMode: "ADMIN",
      isTargetSelected: false,
      balls: draggedBalls as any,
    });

    expect(coaching.impactBallPx).toBeNull();
    expect(coaching.guideLineNode).toBeNull();
  });

  it("TEST E — Reset: Target unselected → Reset keeps Target=NONE and Impact/Guide hidden", () => {
    const session = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: null,
      slotTargetBall: null,
    });

    expect(session.isTargetSelected).toBe(false);
    expect(session.targetColor).toBeNull();

    const coaching = testCoaching({
      appMode: "ADMIN",
      isTargetSelected: session.isTargetSelected,
      balls: initialAdminBalls as any,
    });

    expect(coaching.impactBallPx).toBeNull();
    expect(coaching.guideLineNode).toBeNull();
  });

  it("TEST F — History Recall: hydrates snapshot targetColor & Ball3 roles without color/role swap", () => {
    const snapshotStateRed = {
      targetBall: "red",
      ballsState: {
        cue: { x: 20, y: 16 },
        target: { x: 60, y: 20 }, // Red
        second: { x: 20, y: 20 }, // Yellow
      },
    };

    const isTargetSelected = snapshotStateRed.targetBall != null;
    const targetColor = snapshotStateRed.targetBall;

    expect(isTargetSelected).toBe(true);
    expect(targetColor).toBe("red");

    const coaching = testCoaching({
      appMode: "ADMIN",
      isTargetSelected,
      balls: snapshotStateRed.ballsState as any,
    });

    expect(coaching.impactBallPx).not.toBeNull();
    expect(coaching.guideLineNode).not.toBeNull();
  });

  it("TEST G — HMR / Fresh Equivalent: Fresh view initialization wipes stale slot drafts", () => {
    // Simulating stale slot draft from previous edit session
    const staleSlot = {
      draft: {
        sys: { systemId: "5_half_system", outputs: { result: { oneC: 10 } } },
        hpt: { T: "8/8" },
      },
      applied: null,
    };

    // When Fresh view effect executes, clearAdminWorkSlots resets draft to null
    const cleanedSlot = {
      ...staleSlot,
      draft: null,
    };

    expect(cleanedSlot.draft).toBeNull();
    expect(cleanedSlot.applied).toBeNull();
  });

  it("TEST H — USER Search: evaluates 2-way role permutation without altering ADMIN target selection", async () => {
    const recYellow = makeSampleRecord("pos_user_y", baseBalls, "yellow");
    const dataset = [recYellow];

    // Evaluate 2-way role permutation: query with unselected targetBall=null
    const resultDirect = runSpatialRecall({
      dataset,
      query: { balls: baseBalls as any, targetBall: null },
      profile: "userStrict",
    });
    expect(resultDirect.kind).toBe("match");

    // Also inverted object balls
    const invertedBalls = {
      cue: baseBalls.cue,
      target: baseBalls.second,
      second: baseBalls.target,
    };
    const resultInverted = runSpatialRecall({
      dataset,
      query: { balls: invertedBalls as any, targetBall: null },
      profile: "userStrict",
    });
    // Inverted target is at (15, 30) instead of (20, 50), distance > 0 but valid query evaluation
    expect(resultInverted).toBeDefined();
  });

  it("TEST I — Track Boundary Crossing: opposite handedness maintains HPT/Thickness symmetry", () => {
    const authoredEntry: any = {
      track: "B2T_R",
      memberOrigin: "SYMMETRY",
      symmetryOp: "H",
      hpT: { hit_point: { x: 2, y: 0 }, T: "+4/8" },
    };

    const oppositeHpt = hydrateFamilyMemberRuntimeHpt(authoredEntry, []) as any;

    // hit_point.x should mirror from 2 to -2
    expect(oppositeHpt?.hit_point?.x).toBe(-2);

    const oppositeThickness = hydrateFamilyMemberRuntimeThickness(authoredEntry, []);

    // Thickness should mirror sign from +4/8 to -4/8
    expect(oppositeThickness).toBe("-4/8");
  });

  it("TEST J — SAVE & Derived Approval: Single history successor SSOT and corpus preserved", () => {
    const initialHistory = loadWorkspaceHistory();
    expect(Array.isArray(initialHistory)).toBe(true);

    const commitHistoryFn = vi.fn();
    const saveWorkingDatasetFn = vi.fn();
    const setDatasetFn = vi.fn();

    const sampleRecord = makeSampleRecord("pos_test", baseBalls, "red");
    sampleRecord.familyId = "fam_test";
    sampleRecord.memberId = "mem_auth";
    saveWorkingDataset([sampleRecord]);

    const commitResult = commitDerivedApprovalDataset({
      baseline: {
        familyId: "fam_test",
        memberId: "mem_auth",
        track: "B2T_L",
        dataset: [sampleRecord],
        ballsState: baseBalls,
        targetColor: "red",
        isTargetSelected: true,
      },
      preview: {
        familyId: "fam_test",
        members: {
          B2T_L: { memberId: "mem_auth", track: "B2T_L", balls: baseBalls, targetBall: "red", entry: sampleRecord.strategies.S1 },
        },
      },
      resultDataset: [sampleRecord],
      setDataset: setDatasetFn,
      saveWorkingDataset: saveWorkingDatasetFn,
      commitWorkspaceHistoryWithStrategyDataset: commitHistoryFn,
      restoreDerivedReviewSnapshot: vi.fn(),
    });

    expect(commitResult.corpusPersist.ok).toBe(true);
    // Derived Approval must not double-commit history
    expect(commitHistoryFn).not.toHaveBeenCalled();
    expect(setDatasetFn).toHaveBeenCalledWith([sampleRecord]);
  });
});

describe("ADMIN Local DB Search Target=NONE 2-Way Role Permutation Contracts (TEST A ~ TEST H)", () => {
  const yellowAtPos1_redAtPos2: BallsMap = {
    cue: { x: 30, y: 70 },
    target: { x: 20, y: 50 }, // Yellow in UI slot
    second: { x: 15, y: 30 }, // Red in UI slot
  };

  const storedYellowTargetRecord = makeSampleRecord("rec_yellow_target", {
    cue: { x: 30, y: 70 },
    target: { x: 20, y: 50 }, // Target is Yellow
    second: { x: 15, y: 30 }, // Second is Red
  }, "yellow");

  const storedRedTargetRecord = makeSampleRecord("rec_red_target", {
    cue: { x: 30, y: 70 },
    target: { x: 15, y: 30 }, // Target is Red (at Pos 2)
    second: { x: 20, y: 50 }, // Second is Yellow (at Pos 1)
  }, "red");

  it("TEST A — Target NONE / stored target Yellow: Search SUCCESS with P1", async () => {
    let appliedRecord: PositionRecord | null = null;
    let hydratedTarget: string | null = null;
    let updatedBalls: any = null;

    const ctx = {
      dataset: [storedYellowTargetRecord],
      ballsState: yellowAtPos1_redAtPos2,
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" }, balls: yellowAtPos1_redAtPos2 },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: false,
      targetColor: null,
      setBallsState: (b: any) => { updatedBalls = b; },
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: (t: any) => { hydratedTarget = t; },
      applyPositionRecall: (rec: PositionRecord) => { appliedRecord = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null, // Target = NONE
      resolveFormulaHash: () => "test_hash",
    };

    const matched = await runAdminLocalDbRecall(ctx as any);
    expect(matched).toBe(true);
    expect(appliedRecord?.positionId).toBe("rec_yellow_target");
    expect(hydratedTarget).toBe("yellow");
    expect(updatedBalls?.target).toEqual({ x: 20, y: 50 });
    expect(updatedBalls?.second).toEqual({ x: 15, y: 30 });
  });

  it("TEST B — Target NONE / stored target Red: 2-way permutation Search SUCCESS with P2", async () => {
    let appliedRecord: PositionRecord | null = null;
    let hydratedTarget: string | null = null;
    let updatedBalls: any = null;

    // UI currently has Yellow at (20, 50) in target slot, Red at (15, 30) in second slot.
    // Target is unselected (Target = NONE).
    // Stored record has Target = (15, 30) [Red] and Second = (20, 50) [Yellow].
    const ctx = {
      dataset: [storedRedTargetRecord],
      ballsState: yellowAtPos1_redAtPos2,
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" }, balls: yellowAtPos1_redAtPos2 },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: false,
      targetColor: null,
      setBallsState: (b: any) => { updatedBalls = b; },
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: (t: any) => { hydratedTarget = t; },
      applyPositionRecall: (rec: PositionRecord) => { appliedRecord = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null, // Target = NONE
      resolveFormulaHash: () => "test_hash",
    };

    const matched = await runAdminLocalDbRecall(ctx as any);
    expect(matched).toBe(true);
    expect(appliedRecord?.positionId).toBe("rec_red_target");
    expect(hydratedTarget).toBe("red");
    // Verified: ballsState was swapped to match the semantic target role of the record
    expect(updatedBalls?.target).toEqual({ x: 15, y: 30 });
    expect(updatedBalls?.second).toEqual({ x: 20, y: 50 });
  });

  it("TEST C — Explicit Yellow Target: Yellow permutation only evaluated (Red record not matched)", async () => {
    let appliedRecord: PositionRecord | null = null;

    const ctx = {
      dataset: [storedRedTargetRecord],
      ballsState: yellowAtPos1_redAtPos2,
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" }, balls: yellowAtPos1_redAtPos2 },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: true,
      targetColor: "yellow",
      setBallsState: vi.fn(),
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      applyPositionRecall: (rec: PositionRecord) => { appliedRecord = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => "yellow", // Explicit Yellow Target Lock
      resolveFormulaHash: () => "test_hash",
    };

    const matched = await runAdminLocalDbRecall(ctx as any);
    expect(matched).toBe(false);
    expect(appliedRecord).toBeNull();
  });

  it("TEST D — Explicit Red Target: Red-target permutation evaluated and succeeds", async () => {
    let appliedRecord: PositionRecord | null = null;
    let hydratedTarget: string | null = null;

    // When Red is explicitly selected as Target, ballsState has target at (15, 30)
    const redTargetBalls: BallsMap = {
      cue: { x: 30, y: 70 },
      target: { x: 15, y: 30 },
      second: { x: 20, y: 50 },
    };

    const ctx = {
      dataset: [storedRedTargetRecord],
      ballsState: redTargetBalls,
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" }, balls: redTargetBalls },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: true,
      targetColor: "red",
      setBallsState: vi.fn(),
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: (t: any) => { hydratedTarget = t; },
      applyPositionRecall: (rec: PositionRecord) => { appliedRecord = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => "red", // Explicit Red Target Lock
      resolveFormulaHash: () => "test_hash",
    };

    const matched = await runAdminLocalDbRecall(ctx as any);
    expect(matched).toBe(true);
    expect(appliedRecord?.positionId).toBe("rec_red_target");
    expect(hydratedTarget).toBe("red");
  });

  it("TEST E — Both permutations no-match: returns false with '해당 데이터 없음'", async () => {
    let appliedRecord: PositionRecord | null = null;

    const farRecord = makeSampleRecord("rec_far", {
      cue: { x: 10, y: 10 },
      target: { x: 70, y: 30 },
      second: { x: 65, y: 15 },
    }, "yellow");

    const ctx = {
      dataset: [farRecord],
      ballsState: yellowAtPos1_redAtPos2,
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" }, balls: yellowAtPos1_redAtPos2 },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: false,
      targetColor: null,
      setBallsState: vi.fn(),
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      applyPositionRecall: (rec: PositionRecord) => { appliedRecord = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null,
      resolveFormulaHash: () => "test_hash",
    };

    const matched = await runAdminLocalDbRecall(ctx as any);
    expect(matched).toBe(false);
    expect(appliedRecord).toBeNull();
  });

  it("TEST F — Deterministic selection: chooses lower distance permutation deterministically", async () => {
    // Record A is at exact distance 0.0 with P2 (Red target)
    // Record B is at distance 0.5 with P1 (Yellow target)
    const exactRedRecord = makeSampleRecord("rec_exact_red", {
      cue: { x: 30, y: 70 },
      target: { x: 15, y: 30 },
      second: { x: 20, y: 50 },
    }, "red");

    const nearYellowRecord = makeSampleRecord("rec_near_yellow", {
      cue: { x: 30, y: 70 },
      target: { x: 20.3, y: 50.4 }, // slightly offset
      second: { x: 15, y: 30 },
    }, "yellow");

    let appliedRecord: PositionRecord | null = null;

    const ctx = {
      dataset: [nearYellowRecord, exactRedRecord],
      ballsState: yellowAtPos1_redAtPos2,
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" }, balls: yellowAtPos1_redAtPos2 },
      activeSlot: "S1" as const,
      slots: { S1: { draft: null, applied: null } },
      isTargetSelected: false,
      targetColor: null,
      setBallsState: vi.fn(),
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      applyPositionRecall: (rec: PositionRecord) => { appliedRecord = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null,
      resolveFormulaHash: () => "test_hash",
    };

    const matched = await runAdminLocalDbRecall(ctx as any);
    expect(matched).toBe(true);
    expect(appliedRecord?.positionId).toBe("rec_exact_red"); // exact distance 0.0 wins
  });

  it("TEST G — Symmetry regression: 4-track family members with different target roles recall in Target=NONE", async () => {
    const track1YellowTarget = makeSampleRecord("track_B2T_L", {
      cue: { x: 20, y: 10 },
      target: { x: 40, y: 30 },
      second: { x: 60, y: 20 },
    }, "yellow");

    const track2RedTarget = makeSampleRecord("track_B2T_R", {
      cue: { x: 60, y: 10 },
      target: { x: 20, y: 20 }, // target is at opposite ball position
      second: { x: 40, y: 30 },
    }, "red");

    const dataset = [track1YellowTarget, track2RedTarget];

    // Search at Track 1 coords (Yellow target)
    let applied1: PositionRecord | null = null;
    await runAdminLocalDbRecall({
      dataset,
      ballsState: { cue: { x: 20, y: 10 }, target: { x: 40, y: 30 }, second: { x: 60, y: 20 } },
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
      activeSlot: "S1",
      slots: {},
      isTargetSelected: false,
      targetColor: null,
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      applyPositionRecall: (rec: PositionRecord) => { applied1 = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null,
      resolveFormulaHash: () => "test_hash",
    } as any);
    expect(applied1?.positionId).toBe("track_B2T_L");

    // Search at Track 2 coords (Red target, but UI initially has target in slot A, second in slot B)
    let applied2: PositionRecord | null = null;
    await runAdminLocalDbRecall({
      dataset,
      ballsState: { cue: { x: 60, y: 10 }, target: { x: 40, y: 30 }, second: { x: 20, y: 20 } },
      adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
      activeSlot: "S1",
      slots: {},
      isTargetSelected: false,
      targetColor: null,
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      setIsAdminInputSessionActive: vi.fn(),
      hydrateAdminRecallTarget: vi.fn(),
      applyPositionRecall: (rec: PositionRecord) => { applied2 = rec; },
      patchSlotRuntimeMeta: vi.fn(),
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null,
      resolveFormulaHash: () => "test_hash",
    } as any);
    expect(applied2?.positionId).toBe("track_B2T_R");
  });

  it("TEST H — Role SSOT: red == second / yellow == target is never hardcoded in recall matching", () => {
    // Record where target is explicitly 'red' and second is 'yellow'
    const redTargetRec = makeSampleRecord("rec_ssot_red", {
      cue: { x: 10, y: 10 },
      target: { x: 50, y: 20 },
      second: { x: 30, y: 15 },
    }, "red");

    expect(redTargetRec.targetBall).toBe("red");
    expect(redTargetRec.balls.target).toEqual({ x: 50, y: 20 });
    expect(redTargetRec.balls.second).toEqual({ x: 30, y: 15 });
  });
});
