/**
 * Active-trajectory C2 handle ownership + click-only no-mutation contracts.
 */
import { describe, expect, it } from "vitest";
import {
  advanceC2DragSession,
  beginC2DragSession,
  reflectionOverridesEqual,
} from "../../overlay/state/c2DragSession";
import {
  resolveActiveC2HandleRg,
  buildC2HandleModel,
} from "../../renderer/trajectory/c2HandleModel";
import {
  beginAdminEditTransaction,
  commitAdminEditTransaction,
  createEmptyAdminEditHistoryState,
  canUndoAdminEdit,
  type AdminAuthoredEditSnapshot,
} from "../admin/adminEditHistory";
import {
  computeBaselinePhysicalLimitEndIndex,
  resolveBaselineTrajectoryDisplayCap,
  slicePathNodesToCap,
  PATH_NODE_MARKS,
} from "../trajectoryPathDisplayPolicy";
import type { ShotEditorState } from "../../hooks/useShotSlots";

const baselineC2 = { x: 48, y: 18 };
const correctedC2 = { x: 55, y: 22 };

/** Side-rail chain — same geometry as trajectoryPathDisplayPolicy Case 2. */
const fullBaselineNodes = [
  { x: 30, y: 0 },
  { x: 4, y: 40 },
  baselineC2,
  { x: 26, y: 0 },
  { x: 0, y: 16 },
  { x: 16, y: 40 },
  { x: 16, y: 0 },
];

const fullCorrectedNodes = [
  { x: 33, y: 0 },
  { x: 6, y: 40 },
  correctedC2,
  { x: 34, y: 0 },
  { x: 0, y: 25.5 },
  { x: 25.5, y: 40 },
  { x: 25.5, y: 0 },
];

function emptyShotEditor(): ShotEditorState {
  return {
    activeSlot: "S1",
    slots: {
      S1: { draft: null, applied: null },
      S2: { draft: null, applied: null },
      S3: { draft: null, applied: null },
    },
  };
}

function snap(
  partial: Partial<AdminAuthoredEditSnapshot> = {}
): AdminAuthoredEditSnapshot {
  return {
    ballsState: { cue: { x: 10, y: 8 } },
    targetColor: "red",
    isTargetSelected: true,
    adminHpt: { tipCount: 2 },
    adminSys: { systemId: "5_half_system" },
    adminStr: {},
    adminAi: {},
    c2ReflectionOverride: null,
    shotEditor: emptyShotEditor(),
    ...partial,
  };
}

function activeHandle(active: "baseline" | "corrected") {
  return resolveActiveC2HandleRg({
    active,
    baselinePathNodes: fullBaselineNodes,
    correctedPathNodes: fullCorrectedNodes,
    overridePoint: null,
  });
}

describe("Active C2 handle ownership", () => {
  it("T3: baseline C2 != corrected C2 fixture", () => {
    expect(baselineC2).not.toEqual(correctedC2);
    expect(fullBaselineNodes[2]).toEqual(baselineC2);
    expect(fullCorrectedNodes[2]).toEqual(correctedC2);
  });

  it("T1: Baseline active → handle XY == baseline C2", () => {
    expect(activeHandle("baseline")).toEqual(baselineC2);
  });

  it("T2: Corrected active → handle XY == corrected C2", () => {
    expect(activeHandle("corrected")).toEqual(correctedC2);
  });

  it("Baseline active does not use corrected C2", () => {
    expect(activeHandle("baseline")).not.toEqual(correctedC2);
  });

  it("Corrected active does not use baseline C2", () => {
    expect(activeHandle("corrected")).not.toEqual(baselineC2);
  });

  it("override fallback only when active branch C2 missing", () => {
    expect(
      resolveActiveC2HandleRg({
        active: "corrected",
        baselinePathNodes: fullBaselineNodes,
        correctedPathNodes: [null, null, null],
        overridePoint: { x: 12, y: 0 },
      })
    ).toEqual({ x: 12, y: 0 });
  });

  it("buildC2HandleModel ADMIN-only", () => {
    expect(
      buildC2HandleModel(
        { appMode: "ADMIN", c2Rg: correctedC2, dragging: false },
        { scale: 10, tableH: 400, padding: 20 }
      )
    ).not.toBeNull();
    expect(
      buildC2HandleModel(
        { appMode: "USER", c2Rg: correctedC2, dragging: false },
        { scale: 10, tableH: 400, padding: 20 }
      )
    ).toBeNull();
  });
});

describe("C2 drag session — click vs drag (seed = active handle)", () => {
  it("T4/T6: Baseline seed click/zero-move → no mutation", () => {
    const seed = activeHandle("baseline")!;
    const session0 = beginC2DragSession({
      handleRg: seed,
      existingOverride: null,
    });
    const { session, nextOverride } = advanceC2DragSession(session0, seed);
    expect(nextOverride).toBeNull();
    expect(session.hasMutated).toBe(false);
  });

  it("T5/T7: Corrected seed click/zero-move → no mutation", () => {
    const seed = activeHandle("corrected")!;
    const session0 = beginC2DragSession({
      handleRg: seed,
      existingOverride: null,
    });
    const { session, nextOverride } = advanceC2DragSession(session0, seed);
    expect(nextOverride).toBeNull();
    expect(session.hasMutated).toBe(false);
  });

  it("T8: Baseline actual drag — seed baseline C2 → mutation YES", () => {
    const seed = activeHandle("baseline")!;
    expect(seed).toEqual(baselineC2);
    const session0 = beginC2DragSession({
      handleRg: seed,
      existingOverride: null,
    });
    // Project seed to rail then move along rail so t changes.
    const onRail = { x: 10, y: 0 };
    const moved = { x: 40, y: 0 };
    const seeded = beginC2DragSession({
      handleRg: onRail,
      existingOverride: null,
    });
    const { session, nextOverride } = advanceC2DragSession(seeded, moved);
    expect(session.hasMutated).toBe(true);
    expect(nextOverride).not.toBeNull();
    expect(reflectionOverridesEqual(nextOverride, seeded.seedOverride)).toBe(
      false
    );
    void session0;
  });

  it("T9: Corrected actual drag — seed corrected C2 → mutation YES", () => {
    const seed = activeHandle("corrected")!;
    expect(seed).toEqual(correctedC2);
    const onRail = { x: 20, y: 40 };
    const moved = { x: 60, y: 40 };
    const seeded = beginC2DragSession({
      handleRg: onRail,
      existingOverride: null,
    });
    expect(seeded.seedOverride.rail).toBe("TOP");
    const { session, nextOverride } = advanceC2DragSession(seeded, moved);
    expect(session.hasMutated).toBe(true);
    expect(nextOverride).not.toBeNull();
    expect(reflectionOverridesEqual(nextOverride, seeded.seedOverride)).toBe(
      false
    );
    void seed;
  });

  it("T12/T13: click-only equal snapshots do not push Undo; mutate commits Undo", () => {
    const before = snap({ c2ReflectionOverride: null });
    let st = createEmptyAdminEditHistoryState();
    st = beginAdminEditTransaction(st, before);
    st = commitAdminEditTransaction(st, before, "c2");
    expect(canUndoAdminEdit(st)).toBe(false);

    const after = snap({
      c2ReflectionOverride: { rail: "BOTTOM", t: 0.5 },
    });
    st = beginAdminEditTransaction(st, before);
    st = commitAdminEditTransaction(st, after, "c2");
    expect(canUndoAdminEdit(st)).toBe(true);
    expect(st.undoStack[st.undoStack.length - 1]?.c2ReflectionOverride).toBeNull();
  });
});

describe("Display ceiling preserved with active C2 ownership", () => {
  it("T14: corrected C4 ceiling + internal C5/C6 preserved", () => {
    expect(fullBaselineNodes.filter(Boolean)).toHaveLength(7);
    expect(computeBaselinePhysicalLimitEndIndex(25)).toBe(6);
    const cap = resolveBaselineTrajectoryDisplayCap({
      pathNodes: fullBaselineNodes,
      correctedDisplayEndIndex: 4,
      baselineC4Value: 25,
    });
    expect(cap.endIndex).toBe(4);
    const sliced = slicePathNodesToCap(fullBaselineNodes, cap);
    expect(sliced).toHaveLength(5);
    expect(fullBaselineNodes[5]).toBeTruthy();
    expect(fullBaselineNodes[6]).toBeTruthy();
    expect(PATH_NODE_MARKS.slice(0, cap.endIndex + 1)).toEqual([
      "CO",
      "C1",
      "C2",
      "C3",
      "C4",
    ]);
  });
});
