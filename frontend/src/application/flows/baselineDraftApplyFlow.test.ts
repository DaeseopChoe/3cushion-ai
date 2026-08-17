import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fiveHalfAnchors from "../../data/systems/5_half_system/anchors.json";
import { getAnchorCoordFromSys } from "../../domain/anchorLookupEngine";
import { bindDomainContractSupply } from "../../domain/runtimeContractSupply";
import { runBaselineDraftApply } from "./baselineDraftApplyFlow";

const SYSTEM_ID = "5_half_system";

beforeAll(() => {
  bindDomainContractSupply({
    getFormulaExpr: () => null,
    getFormulaHash: () => "v1",
    getAnchorsData: (id) =>
      id === SYSTEM_ID || id === "5_HALF" ? fiveHalfAnchors : undefined,
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
  bindDomainContractSupply({
    getFormulaExpr: () => null,
    getFormulaHash: () => "v1",
    getAnchorsData: () => undefined,
  });
});

function baseCtx(overrides = {}) {
  const commitDraftSys = vi.fn().mockReturnValue({
    ok: true,
    appliedSys: {
      inputs: { CO_f: 30, C1_f: 4, C3_r: 26 },
      outputs: { result: { CO_f: 30, C1_f: 4, C3_r: 26, C4_f: 16 } },
    },
  });
  const clearAppliedBaselineDraftMark = vi.fn();
  const patchSlotRuntimeMeta = vi.fn();
  return {
    commitDraftSys,
    clearAppliedBaselineDraftMark,
    patchSlotRuntimeMeta,
    ctx: {
      mark: "CO",
      appMode: "ADMIN",
      showBaseLine: true,
      overlayState: { open: false },
      baselineDraftState: {
        activeMark: "CO",
        coRg: { x: 40, y: -2.25 },
        c1Rg: null,
      },
      trackForAnchors: "B2T_R",
      systemIdForGrid: SYSTEM_ID,
      activeSlot: "S1",
      slots: {
        S1: {
          draft: {
            sys: {
              systemId: SYSTEM_ID,
              track: "B2T_R",
              inputs: { CO_f: 30, C1_f: 4, C3_r: 26 },
              outputs: { result: { CO_f: 30, C1_f: 4, C3_r: 26 } },
            },
          },
        },
      },
      resolvedSlotSys: null,
      targetColor: "red",
      trajectory: {
        state: {},
        setAdjusting: vi.fn(),
        applySysResult: vi.fn(),
      },
      commitDraftSys,
      patchSlotRuntimeMeta,
      clearAppliedBaselineDraftMark,
      ...overrides,
    },
  };
}

describe("runBaselineDraftApply", () => {
  it("commits solver delta from Mark coord, not a trajectory path vertex", () => {
    const mark = getAnchorCoordFromSys({
      systemId: SYSTEM_ID,
      track: "B2T_R",
      mark: "CO",
      sysValue: 30,
      sysFieldKey: "CO_f",
    });
    const { ctx, commitDraftSys, clearAppliedBaselineDraftMark } = baseCtx({
      baselineDraftState: {
        activeMark: "CO",
        coRg: mark!.coord,
        c1Rg: null,
      },
    });
    expect(runBaselineDraftApply(ctx)).toBe(true);
    expect(commitDraftSys).toHaveBeenCalledTimes(1);
    const delta = commitDraftSys.mock.calls[0][2];
    expect(delta.CO_f).toBeCloseTo(30, 4);
    expect(delta.C1_f).toBe(4);
    expect(delta.C1_f).toBeCloseTo(delta.CO_f - delta.C3_r);
    expect(clearAppliedBaselineDraftMark).toHaveBeenCalledWith("CO");
  });

  it("does not commit off-axis coords and restores draft", () => {
    const { ctx, commitDraftSys, clearAppliedBaselineDraftMark } = baseCtx({
      baselineDraftState: {
        activeMark: "CO",
        coRg: { x: 40, y: 0 },
        c1Rg: null,
      },
    });
    expect(runBaselineDraftApply(ctx)).toBe(false);
    expect(commitDraftSys).not.toHaveBeenCalled();
    expect(clearAppliedBaselineDraftMark).toHaveBeenCalledWith("CO");
  });
});
