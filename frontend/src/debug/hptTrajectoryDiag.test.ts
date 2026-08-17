/**
 * DEV helper contracts — no product behavior.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildHptRenderDiagPayload,
  createHptTrajectoryDiagSession,
  logHptTrajectoryDiagApply,
} from "./hptTrajectoryDiag";

describe("hptTrajectoryDiag (DEV helper)", () => {
  it("createHptTrajectoryDiagSession starts await_first", () => {
    const s = createHptTrajectoryDiagSession(7);
    expect(s.applyId).toBe(7);
    expect(s.step).toBe("await_first");
  });

  it("logHptTrajectoryDiagApply emits [HPT_TRAJECTORY_DIAG][APPLY] in DEV", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    logHptTrajectoryDiagApply({
      applyId: 1,
      positionId: "140300280300770390",
      shotType: "뒤돌리기 대회전",
      track: "T2B_L",
      targetBall: "yellow",
      prevHpt: {
        T: "+2/8",
        hit_point: { x: -2, y: 1 },
        mode: "TIP",
        tipCount: 3,
      },
      nextHpt: {
        T: "+2/8",
        hit_point: { x: 2, y: 1 },
        mode: "TIP",
        tipCount: 3,
      },
      shouldClear: true,
      c2ReflectionOverrideBefore: null,
      slotDraftOverrideBefore: null,
      slotAppliedOverrideBefore: null,
      corrections: { slide: 8 },
    });
    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls.find(
      (c) => String(c[0]).includes("[HPT_TRAJECTORY_DIAG][APPLY]")
    );
    expect(args).toBeTruthy();
    spy.mockRestore();
    table.mockRestore();
  });

  it("buildHptRenderDiagPayload exposes cap + path head without mutating", () => {
    const payload = buildHptRenderDiagPayload({
      applyId: 2,
      phase: "FIRST_RENDER",
      applyMeta: null,
      showBaseLine: false,
      skipSameRail: false,
      c2ReflectionOverride: null,
      currentTip: { count: 3, side: "R" },
      corrections: { slide: 8 },
      effectiveCorrected: { CO_f: 55, C1_f: 10, C3_r: 42 },
      effectiveBaseline: { CO_f: 47, C1_f: 5, C3_r: 42 },
      correctedPathNodes: [
        { x: 20, y: 0 },
        { x: 0, y: 15 },
        null,
        { x: 60, y: 40 },
      ],
      baselinePathNodes: [
        { x: 20, y: 0 },
        { x: 0, y: 15 },
        { x: 40, y: 40 },
        { x: 60, y: 40 },
      ],
      capCorrected: { endIndex: 1, reason: "missing_node" },
      capBaseline: { endIndex: 6, reason: "full" },
      coPrep: { x: 20, y: 0 },
      c1Rail: { x: 0, y: 15 },
      anchorsC2Present: false,
      reflectedDiagnostics: null,
      useCurveDeform: true,
    });
    expect(payload.corrected.cap.reason).toBe("missing_node");
    expect(payload.corrected.cap.endIndex).toBe(1);
    expect(payload.corrected.c2.present).toBe(false);
    expect(payload.baseline.c2.present).toBe(true);
    expect(payload.divergenceHints.c2MissingCorrected).toBe(true);
    expect(payload.divergenceHints.effCoDiffers).toBe(true);
  });
});
