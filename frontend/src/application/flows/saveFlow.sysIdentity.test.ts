/**
 * Regression: runSaveStrategy must persist adminState.sys.system as systemId string,
 * never the UI display object (ctx.system / view.ui.system).
 */
import { describe, expect, it, vi } from "vitest";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

const displaySystemObject = {
  values: { CO_f: 30 },
  human_readable: { CO: "30" },
};

function buildCtx(overrides: Partial<SaveFlowContext> = {}): {
  ctx: SaveFlowContext;
  getAdminState: () => Record<string, unknown>;
} {
  let adminState: Record<string, unknown> = {
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
    hpt: { T: "8/8" },
    str: { speed: 1 },
    ai: { text: "", onePointLessons: [] },
  };

  const slotSys = {
    systemId: "5_half_system",
    track: "B2T_L",
    inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
  };

  const ctx: SaveFlowContext = {
    dataset: [],
    ballsState: balls,
    adminState,
    activeSlot: "S1",
    slots: {
      S1: {
        draft: {
          sys: slotSys,
          ai: { text: "lesson", onePointLessons: [] },
          targetBall: "red",
        },
        applied: {
          sys: slotSys,
          hpt: { T: "8/8" },
          str: { speed: 1 },
          ai: { text: "", onePointLessons: [] },
        },
      },
    },
    targetColor: "red",
    aiOverride: {
      text: "",
      onePointLessons: [{ id: "l1", text: "tip" }],
    },
    // Intentionally a display object — must NOT be written to adminState.sys.system
    system: displaySystemObject,
    resolvedSlotSysValues: { CO_f: 30, C1_f: 10, C3_r: 20 },
    autoSave: false,
    editSource: null,
    saveWorkingDataset: vi.fn(),
    setDataset: vi.fn(),
    setUserPublishedSearchContext: vi.fn(),
    setAdminState: (updater) => {
      adminState = updater(adminState);
    },
    patchSlotRuntimeMeta: vi.fn(),
    saveToFile: vi.fn(),
    resolveFormulaHash: () => "v1",
    resolveEvalProfile: () => ({ formula: { expr: "C3_r = CO_f - C1_f" } }),
    resolveAnchorsData: () => ({
      trajectories: {
        B2T_L: { anchors: [{ id: "a1" }] },
      },
      meta: {},
    }),
    ...overrides,
  };

  return {
    ctx,
    getAdminState: () => adminState,
  };
}

describe("runSaveStrategy sys.system identity", () => {
  it("keeps adminState.sys.system as systemId string (not display object) after SAVE", () => {
    const { ctx, getAdminState } = buildCtx();
    const result = runSaveStrategy(ctx);

    expect(result.ok).toBe(true);
    const sys = getAdminState().sys as Record<string, unknown>;
    expect(typeof sys.system).toBe("string");
    expect(sys.system).toBe("5_half_system");
    expect(sys.systemId).toBe("5_half_system");
    expect(sys.system).not.toBe(displaySystemObject);
    expect(sys.system_values).toEqual({
      CO_f: 30,
      C1_f: 10,
      C3_r: 20,
    });
  });

  it("AI override path still persists without corrupting sys.system identity", () => {
    const { ctx, getAdminState } = buildCtx({
      aiOverride: {
        text: "",
        onePointLessons: [{ id: "ai-1", text: "from AI apply" }],
      },
    });
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);

    const sys = getAdminState().sys as Record<string, unknown>;
    expect(sys.system).toBe("5_half_system");
    expect(typeof sys.system).toBe("string");
  });
});
