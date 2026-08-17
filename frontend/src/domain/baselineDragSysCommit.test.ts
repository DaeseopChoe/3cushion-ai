import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fiveHalfAnchors from "../data/systems/5_half_system/anchors.json";
import {
  getAnchorCoordFromSys,
  inferAnchorCoordValueSpace,
} from "./anchorLookupEngine";
import {
  buildFiveHalfDragSolverDelta,
  resolveBaselineDragSysCommit,
} from "./baselineDragSysCommit";
import { bindDomainContractSupply } from "./runtimeContractSupply";

const SYSTEM_ID = "5_half_system";
const TRACKS = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const;

beforeAll(() => {
  bindDomainContractSupply({
    getFormulaExpr: () => null,
    getFormulaHash: () => "v1",
    getAnchorsData: (systemId) =>
      systemId === SYSTEM_ID || systemId === "5_HALF"
        ? fiveHalfAnchors
        : undefined,
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

const SLOT_ALL_THREE = { CO_f: 30, C1_f: 4, C3_r: 26 };
const SLOT_CO_C3 = { CO_f: 30, C3_r: 26 };

function markCoord(
  track: string,
  mark: "CO" | "C1",
  sysValue: number,
  sysFieldKey: string
) {
  const hit = getAnchorCoordFromSys({
    systemId: SYSTEM_ID,
    track,
    mark,
    sysValue,
    sysFieldKey,
  });
  expect(hit, `${track} ${mark} ${sysValue}`).not.toBeNull();
  return hit!;
}

describe("buildFiveHalfDragSolverDelta (SYS modal 2-of-3)", () => {
  it("all three filled: CO drag keeps C1 and recomputes C3", () => {
    const delta = buildFiveHalfDragSolverDelta({
      mark: "CO",
      draggedSys: 33,
      slotInputs: SLOT_ALL_THREE,
      coKey: "CO_f",
      c1Key: "C1_f",
      c3Key: "C3_r",
    });
    expect(delta).toEqual({ CO_f: 33, C1_f: 4, C3_r: 29 });
    expect(delta!.C1_f).toBeCloseTo(delta!.CO_f - delta!.C3_r);
  });

  it("all three filled: C1 drag keeps CO and recomputes C3", () => {
    const delta = buildFiveHalfDragSolverDelta({
      mark: "C1",
      draggedSys: 7,
      slotInputs: SLOT_ALL_THREE,
      coKey: "CO_f",
      c1Key: "C1_f",
      c3Key: "C3_r",
    });
    expect(delta).toEqual({ CO_f: 30, C1_f: 7, C3_r: 23 });
    expect(delta!.C1_f).toBeCloseTo(delta!.CO_f - delta!.C3_r);
  });

  it("CO+C3 independent (C1 computed): CO drag keeps C3 and recomputes C1", () => {
    const delta = buildFiveHalfDragSolverDelta({
      mark: "CO",
      draggedSys: 33,
      slotInputs: SLOT_CO_C3,
      coKey: "CO_f",
      c1Key: "C1_f",
      c3Key: "C3_r",
    });
    expect(delta).toEqual({ CO_f: 33, C3_r: 26, C1_f: 7 });
    expect(delta!.C1_f).toBeCloseTo(delta!.CO_f - delta!.C3_r);
  });

  it("returns null when fewer than two of three exist", () => {
    expect(
      buildFiveHalfDragSolverDelta({
        mark: "CO",
        draggedSys: 33,
        slotInputs: { CO_f: 30 },
        coKey: "CO_f",
        c1Key: "C1_f",
        c3Key: "C3_r",
      })
    ).toBeNull();
  });
});

describe("resolveBaselineDragSysCommit", () => {
  it("CO drag on all four tracks: coord → sys → solver delta", () => {
    for (const track of TRACKS) {
      const start = markCoord(track, "CO", 30, "CO_f");
      const moved = { x: start.coord.x, y: start.coord.y };
      const resolved = resolveBaselineDragSysCommit({
        systemId: SYSTEM_ID,
        track,
        mark: "CO",
        coord: moved,
        slotInputs: SLOT_ALL_THREE,
      });
      expect(resolved, track).not.toBeNull();
      expect(resolved!.draggedSys).toBeCloseTo(30, 5);
      expect(resolved!.inputDelta.CO_f).toBeCloseTo(30, 5);
      expect(resolved!.inputDelta.C1_f).toBe(4);
      expect(resolved!.inputDelta.C1_f).toBeCloseTo(
        resolved!.inputDelta.CO_f - resolved!.inputDelta.C3_r
      );
    }
  });

  it("interpolated CO coord on B2T_R updates CO_f and keeps the 2-of-3 invariant", () => {
    const start = markCoord("B2T_R", "CO", 30, "CO_f");
    const moved = { x: 35, y: start.coord.y };
    const resolved = resolveBaselineDragSysCommit({
      systemId: SYSTEM_ID,
      track: "B2T_R",
      mark: "CO",
      coord: moved,
      slotInputs: SLOT_ALL_THREE,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.draggedSys).toBeCloseTo(32.5, 5);
    expect(resolved!.inputDelta.CO_f).toBeCloseTo(32.5, 5);
    expect(resolved!.inputDelta.C1_f).toBe(4);
    expect(resolved!.inputDelta.C3_r).toBeCloseTo(28.5, 5);
    expect(resolved!.inputDelta.C1_f).toBeCloseTo(
      resolved!.inputDelta.CO_f - resolved!.inputDelta.C3_r
    );
    const back = getAnchorCoordFromSys({
      systemId: SYSTEM_ID,
      track: "B2T_R",
      mark: "CO",
      sysValue: resolved!.draggedSys,
      sysFieldKey: "CO_f",
    });
    expect(back?.valueSpace).toBe("Fg");
    expect(back!.coord.y).toBeCloseTo(start.coord.y, 4);
  });

  it("C1 drag on all four tracks", () => {
    for (const track of TRACKS) {
      const start = markCoord(track, "C1", 10, "C1_f");
      const resolved = resolveBaselineDragSysCommit({
        systemId: SYSTEM_ID,
        track,
        mark: "C1",
        coord: start.coord,
        slotInputs: SLOT_ALL_THREE,
      });
      expect(resolved, track).not.toBeNull();
      expect(resolved!.draggedSys).toBeCloseTo(10, 5);
      expect(resolved!.inputDelta.C1_f).toBeCloseTo(10, 5);
      expect(resolved!.inputDelta.CO_f).toBe(30);
      expect(resolved!.inputDelta.C1_f).toBeCloseTo(
        resolved!.inputDelta.CO_f - resolved!.inputDelta.C3_r
      );
    }
  });

  it("round-trips coord → sys → getAnchorCoordFromSys and keeps Fg", () => {
    for (const track of TRACKS) {
      const start = markCoord(track, "CO", 30, "CO_f");
      expect(start.valueSpace).toBe("Fg");
      const alongAxis = {
        x: start.coord.x,
        y: start.coord.y,
      };
      const resolved = resolveBaselineDragSysCommit({
        systemId: SYSTEM_ID,
        track,
        mark: "CO",
        coord: alongAxis,
        slotInputs: SLOT_ALL_THREE,
      });
      const back = getAnchorCoordFromSys({
        systemId: SYSTEM_ID,
        track,
        mark: "CO",
        sysValue: resolved!.draggedSys,
        sysFieldKey: "CO_f",
      });
      expect(back?.valueSpace).toBe("Fg");
      expect(inferAnchorCoordValueSpace(back!.coord.x, back!.coord.y)).toBe(
        "Fg"
      );
      expect(back!.coord.x).toBeCloseTo(start.coord.x, 4);
      expect(back!.coord.y).toBeCloseTo(start.coord.y, 4);
    }
  });

  it("keeps Fg for C1 round-trip", () => {
    const start = markCoord("B2T_R", "C1", 10, "C1_f");
    expect(start.valueSpace).toBe("Fg");
    const resolved = resolveBaselineDragSysCommit({
      systemId: SYSTEM_ID,
      track: "B2T_R",
      mark: "C1",
      coord: start.coord,
      slotInputs: SLOT_ALL_THREE,
    });
    const back = getAnchorCoordFromSys({
      systemId: SYSTEM_ID,
      track: "B2T_R",
      mark: "C1",
      sysValue: resolved!.draggedSys,
      sysFieldKey: "C1_f",
    });
    expect(back?.valueSpace).toBe("Fg");
    expect(back!.coord.y).toBeCloseTo(start.coord.y, 4);
  });

  it("clamps outside the mark axis to endpoint sys", () => {
    const resolved = resolveBaselineDragSysCommit({
      systemId: SYSTEM_ID,
      track: "B2T_R",
      mark: "CO",
      coord: { x: 90, y: -2.25 },
      slotInputs: SLOT_ALL_THREE,
    });
    expect(resolved?.draggedSys).toBe(0);
  });

  it("does not commit when the coord is off the Mark axis (not a path vertex lookup)", () => {
    expect(
      resolveBaselineDragSysCommit({
        systemId: SYSTEM_ID,
        track: "B2T_R",
        mark: "CO",
        coord: { x: 40, y: 0 },
        slotInputs: SLOT_ALL_THREE,
      })
    ).toBeNull();
  });

  it("does not commit without a track", () => {
    expect(
      resolveBaselineDragSysCommit({
        systemId: SYSTEM_ID,
        track: null,
        mark: "CO",
        coord: { x: 40, y: -2.25 },
        slotInputs: SLOT_ALL_THREE,
      })
    ).toBeNull();
  });
});
