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

import { describe, expect, it, vi } from "vitest";
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
