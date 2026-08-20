/**
 * Family SAVE identity semantics:
 * - default CREATE must not inherit by Exact+slot equality
 * - explicit slot identity enables UPDATE
 */
import { describe, expect, it, vi } from "vitest";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";
import type { PositionRecord } from "../../domain/positionSearchEngine";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

function buildCtx(overrides: Partial<SaveFlowContext> = {}): {
  ctx: SaveFlowContext;
  saved: PositionRecord[] | null;
} {
  let saved: PositionRecord[] | null = null;
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
      hpt: { T: "8/8" },
    },
    activeSlot: "S1",
    slots: {
      S1: {
        draft: { sys: slotSys, hpt: { T: "8/8" } },
        applied: { sys: slotSys, hpt: { T: "8/8" }, str: { speed: 1 }, ai: {} },
      },
    },
    targetColor: "red",
    aiOverride: null,
    system: "5_half_system",
    resolvedSlotSysValues: { CO_f: 30, C1_f: 10, C3_r: 20 },
    autoSave: false,
    editSource: null,
    saveWorkingDataset: (updated) => {
      saved = updated;
    },
    setDataset: (updated) => {
      saved = updated;
    },
    setUserPublishedSearchContext: vi.fn(),
    setAdminState: vi.fn(),
    patchSlotRuntimeMeta: vi.fn(),
    patchSlotFamilyIdentity: (slotId, identity) => {
      const slot = ctx.slots[slotId as "S1" | "S2" | "S3"] as
        | { draft?: Record<string, unknown>; applied?: Record<string, unknown> }
        | undefined;
      if (!slot) return;
      if (slot.draft && identity) Object.assign(slot.draft, identity);
      if (slot.applied && identity) Object.assign(slot.applied, identity);
      if (slot.draft && !identity) {
        delete slot.draft.familyId;
        delete slot.draft.memberId;
        delete slot.draft.memberOrigin;
        delete slot.draft.generatedFromMemberId;
        delete slot.draft.symmetryOp;
      }
      if (slot.applied && !identity) {
        delete slot.applied.familyId;
        delete slot.applied.memberId;
        delete slot.applied.memberOrigin;
        delete slot.applied.generatedFromMemberId;
        delete slot.applied.symmetryOp;
      }
    },
    saveToFile: vi.fn(),
    resolveFormulaHash: () => "v1",
    resolveEvalProfile: () => ({ formula: { expr: "C3_r = CO_f - C1_f" } }),
    resolveAnchorsData: () => ({
      trajectories: { B2T_L: { anchors: [{ id: "a1" }] } },
      meta: {},
    }),
    ...overrides,
  };
  return { ctx, get saved() { return saved; } } as {
    ctx: SaveFlowContext;
    saved: PositionRecord[] | null;
  };
}

describe("runSaveStrategy Family identity", () => {
  it("mints original authored familyId/memberId distinct from asid and positionId", () => {
    const { ctx } = buildCtx();
    let captured: PositionRecord[] | null = null;
    ctx.saveWorkingDataset = (updated) => {
      captured = updated;
    };
    ctx.setDataset = (updated) => {
      captured = updated;
    };
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    const rec = captured?.[0];
    const s1 = rec?.strategies.S1;
    expect(s1?.familyId?.startsWith("fm_")).toBe(true);
    expect(s1?.memberId?.startsWith("mb_")).toBe(true);
    expect(s1?.memberOrigin).toBe("AUTHORED");
    expect(s1?.familyId).not.toBe(s1?.authoringStrategyId);
    expect(s1?.memberId).not.toBe(rec?.positionId);
    expect(s1?.hpT).toEqual({ T: "8/8" });
    expect(s1?.sysInputs.CO_f).toBe(30);
  });

  it("default SAVE on Exact same-slot does not inherit prior Family identity", () => {
    const first = buildCtx();
    let dataset: PositionRecord[] = [];
    first.ctx.saveWorkingDataset = (updated) => {
      dataset = updated;
    };
    first.ctx.setDataset = (updated) => {
      dataset = updated;
    };
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const familyId = dataset[0].strategies.S1?.familyId;
    const memberId = dataset[0].strategies.S1?.memberId;
    expect(familyId).toBeTruthy();

    const second = buildCtx({ dataset });
    second.ctx.saveWorkingDataset = (updated) => {
      dataset = updated;
    };
    second.ctx.setDataset = (updated) => {
      dataset = updated;
    };
    expect(runSaveStrategy(second.ctx).ok).toBe(true);
    const familyIds = dataset
      .flatMap((r) => Object.values(r.strategies))
      .filter((e) => e?.memberOrigin === "AUTHORED")
      .map((e) => e?.familyId);
    expect(familyIds).toContain(familyId);
    expect(new Set(familyIds).size).toBe(2);
    const latest = dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.familyId !== familyId && e?.memberOrigin === "AUTHORED");
    expect(latest?.memberId).not.toBe(memberId);
  });

  it("explicit UPDATE reuses the same Family identity", () => {
    const first = buildCtx();
    let dataset: PositionRecord[] = [];
    first.ctx.saveWorkingDataset = (updated) => {
      dataset = updated;
    };
    first.ctx.setDataset = (updated) => {
      dataset = updated;
    };
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const authored = dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.memberOrigin === "AUTHORED");
    const slotSys = {
      systemId: "5_half_system",
      track: "B2T_L",
      inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
      outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
    };
    const second = buildCtx({
      dataset,
      saveIntent: "UPDATE",
      slots: {
        S1: {
          draft: { sys: slotSys, hpt: { T: "8/8" }, ...authored },
          applied: { sys: slotSys, hpt: { T: "8/8" }, str: { speed: 1 }, ai: {}, ...authored },
        },
      },
    });
    second.ctx.saveWorkingDataset = (updated) => {
      dataset = updated;
    };
    second.ctx.setDataset = (updated) => {
      dataset = updated;
    };
    expect(runSaveStrategy(second.ctx).ok).toBe(true);
    const authoredMembers = dataset
      .flatMap((r) => Object.values(r.strategies))
      .filter((e) => e?.memberOrigin === "AUTHORED");
    expect(new Set(authoredMembers.map((e) => e?.familyId)).size).toBe(1);
    expect(authoredMembers[0]?.familyId).toBe(authored?.familyId);
    expect(authoredMembers[0]?.memberId).toBe(authored?.memberId);
  });

  it("S2 on the same Exact balls gets a different Family", () => {
    const first = buildCtx();
    let dataset: PositionRecord[] = [];
    first.ctx.saveWorkingDataset = (updated) => {
      dataset = updated;
    };
    first.ctx.setDataset = (updated) => {
      dataset = updated;
    };
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const s1Family = dataset[0].strategies.S1?.familyId;

    const slotSys = {
      systemId: "5_half_system",
      track: "B2T_L",
      inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
      outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
    };
    const second = buildCtx({
      dataset,
      activeSlot: "S2",
      slots: {
        S1: first.ctx.slots.S1,
        S2: {
          draft: { sys: slotSys, hpt: { T: "-3/8" } },
          applied: { sys: slotSys, hpt: { T: "-3/8" }, str: { speed: 1 }, ai: {} },
        },
      },
    });
    second.ctx.saveWorkingDataset = (updated) => {
      dataset = updated;
    };
    second.ctx.setDataset = (updated) => {
      dataset = updated;
    };
    expect(runSaveStrategy(second.ctx).ok).toBe(true);
    expect(dataset[0].strategies.S1?.familyId).toBe(s1Family);
    expect(dataset[0].strategies.S2?.familyId?.startsWith("fm_")).toBe(true);
    expect(dataset[0].strategies.S2?.familyId).not.toBe(s1Family);
    expect(dataset[0].strategies.S2?.hpT).toEqual({ T: "-3/8" });
  });
});
