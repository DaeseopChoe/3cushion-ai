/**
 * Smoke: DEV SYS Apply cut diagnostic helpers are pure / side-effect-free except console.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildCorrectedCutSnapshot,
  createSysApplyCutDiagSession,
  maybeLogSysApplyCutRender,
  summarizePathNodes,
} from "./sysApplyTrajectoryCutDiag";

describe("sysApplyTrajectoryCutDiag", () => {
  it("summarizePathNodes marks missing C2", () => {
    const sum = summarizePathNodes([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      null,
      { x: 3, y: 40 },
    ]);
    expect(sum.nodes[2].present).toBe(false);
    expect(sum.presentAfterC1[0].present).toBe(false);
    expect(sum.presentAfterC1[1].present).toBe(true);
  });

  it("buildCorrectedCutSnapshot flags missing_node vs same_rail", () => {
    const missing = buildCorrectedCutSnapshot({
      applyId: 1,
      stateTag: "T",
      showBaseLine: false,
      pathNodes: [{ x: 0, y: 0 }, { x: 1, y: 0 }, null],
      cushionPath: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      cushionPathForRender: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      capCorrected: { endIndex: 1, reason: "missing_node" },
      visibleKeysForLabels: ["CO", "C1"],
      skipSameRail: false,
      c2ReflectionOverride: null,
      c2Resolved: null,
      anchorsC2Present: false,
      reflectedDiagnostics: null,
      slotDraft: {
        corrections: { slide: 8, draw: 0 },
        shotType: "뒤돌리기 대회전",
        sys: { track: "T2B_L" },
      },
      slotApplied: null,
      slotRenderSys: { corrections: { slide: 8 }, shotType: "뒤돌리기 대회전" },
      resolvedSlotSysValues: { CO_f: 55, C1_f: 5, C3_r: 50, C4_f: 52.5 },
      useCurveDeform: true,
    });
    expect(missing.cap.missing_node).toBe(true);
    expect(missing.cap.same_rail).toBe(false);
    expect(missing.meta.effective.CO_f).toBe(55);

    const sameSnap = buildCorrectedCutSnapshot({
      applyId: 1,
      stateTag: "T",
      showBaseLine: false,
      pathNodes: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      cushionPath: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      cushionPathForRender: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      capCorrected: { endIndex: 1, reason: "same_rail" },
      visibleKeysForLabels: ["CO", "C1"],
      skipSameRail: false,
      c2ReflectionOverride: { rail: "TOP", t: 0.4 },
      c2Resolved: { x: 20, y: 40 },
      anchorsC2Present: true,
      reflectedDiagnostics: null,
      slotDraft: null,
      slotApplied: null,
      slotRenderSys: null,
      resolvedSlotSysValues: {},
      useCurveDeform: false,
    });
    expect(sameSnap.cap.same_rail).toBe(true);
    expect(sameSnap.c2.rail).toBe("TOP");
  });

  it("maybeLogSysApplyCutRender advances STATE1 → NEXT → BASELINE → STATE3", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    let session = createSysApplyCutDiagSession(7);
    const baseInput = {
      showBaseLine: false,
      pathNodes: [{ x: 0, y: 0 }, { x: 1, y: 0 }, null],
      cushionPath: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      cushionPathForRender: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      capCorrected: { endIndex: 1, reason: "missing_node" },
      visibleKeysForLabels: ["CO", "C1"],
      skipSameRail: false,
      c2ReflectionOverride: null,
      c2Resolved: null,
      anchorsC2Present: false,
      reflectedDiagnostics: null,
      slotDraft: { corrections: { slide: 8 } },
      slotApplied: null,
      slotRenderSys: { corrections: { slide: 8 } },
      resolvedSlotSysValues: { CO_f: 55 },
      useCurveDeform: true,
    };

    session = maybeLogSysApplyCutRender(session, {
      showBaseLine: false,
      adminTableLayersVisible: true,
      appMode: "ADMIN",
      snapshotInput: baseInput,
    });
    expect(session?.step).toBe("await_next");

    session = maybeLogSysApplyCutRender(session, {
      showBaseLine: false,
      adminTableLayersVisible: true,
      appMode: "ADMIN",
      snapshotInput: baseInput,
    });
    expect(session?.step).toBe("await_baseline");

    session = maybeLogSysApplyCutRender(session, {
      showBaseLine: true,
      adminTableLayersVisible: true,
      appMode: "ADMIN",
      snapshotInput: { ...baseInput, showBaseLine: true },
    });
    expect(session?.step).toBe("await_corrected_again");

    session = maybeLogSysApplyCutRender(session, {
      showBaseLine: false,
      adminTableLayersVisible: true,
      appMode: "ADMIN",
      snapshotInput: baseInput,
    });
    expect(session?.step).toBe("done");

    log.mockRestore();
    table.mockRestore();
  });
});
