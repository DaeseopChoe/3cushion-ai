import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fiveHalfAnchors from "../../data/systems/5_half_system/anchors.json";
import { getAnchorCoordFromSys } from "../anchorLookupEngine";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import {
  projectPointerToMarkAxis,
  readBaselineHandleCoord,
} from "./baselineMarkAxisSnap";

const SYSTEM_ID = "5_half_system";

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

describe("readBaselineHandleCoord vs System Mark", () => {
  it("CO handle coord equals CO baseline Mark coord (B2T_R)", () => {
    const mark = markCoord("B2T_R", "CO", 30, "CO_f");
    expect(readBaselineHandleCoord(mark)).toEqual(mark.coord);
  });

  it("C1 handle coord equals C1 baseline Mark coord (B2T_R)", () => {
    const mark = markCoord("B2T_R", "C1", 4, "C1_f");
    expect(readBaselineHandleCoord(mark)).toEqual(mark.coord);
  });

  it("matches on T2B_R as well", () => {
    const co = markCoord("T2B_R", "CO", 30, "CO_f");
    const c1 = markCoord("T2B_R", "C1", 10, "C1_f");
    expect(readBaselineHandleCoord(co)).toEqual(co.coord);
    expect(readBaselineHandleCoord(c1)).toEqual(c1.coord);
  });
});

describe("projectPointerToMarkAxis", () => {
  it("keeps the Fg frame constant on a long-axis CO Mark", () => {
    const mark = { x: 40, y: -2.25 };
    const snapped = projectPointerToMarkAxis({ x: 55, y: 18 }, mark);
    expect(snapped).toEqual({ x: 55, y: -2.25 });
  });

  it("keeps the Fg frame constant on a short-axis CO Mark", () => {
    const mark = { x: -2.25, y: 10 };
    const snapped = projectPointerToMarkAxis({ x: 40, y: 22 }, mark);
    expect(snapped).toEqual({ x: -2.25, y: 22 });
  });

  it("does not change the axis that the Mark does not travel", () => {
    const mark = { x: 50, y: 42.25 };
    const snapped = projectPointerToMarkAxis({ x: 20, y: 8 }, mark);
    expect(snapped?.y).toBe(42.25);
    expect(snapped?.x).toBe(20);
    expect(snapped?.y).not.toBe(8);
  });

  it("keeps an Rg rail coordinate on an Rg Mark fixture", () => {
    const mark = { x: 51, y: 0 };
    const snapped = projectPointerToMarkAxis({ x: 36, y: 17 }, mark);
    expect(snapped).toEqual({ x: 36, y: 0 });
  });

  it("returns null instead of snapping an interior point onto a playing rail", () => {
    expect(
      projectPointerToMarkAxis({ x: 40, y: 20 }, { x: 40, y: 20 })
    ).toBeNull();
  });
});
