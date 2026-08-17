import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fiveHalfAnchors from "../data/systems/5_half_system/anchors.json";
import {
  getAnchorCoordFromSys,
  getSysValueFromAnchorCoord,
  type AnchorLookupMark,
} from "./anchorLookupEngine";
import { bindDomainContractSupply } from "./runtimeContractSupply";

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
});

afterAll(() => {
  bindDomainContractSupply({
    getFormulaExpr: () => null,
    getFormulaHash: () => "v1",
    getAnchorsData: () => undefined,
  });
});

function sysFromCoord(
  track: string,
  mark: AnchorLookupMark,
  coord: { x: number; y: number },
  sysFieldKey: string
): number | null {
  return getSysValueFromAnchorCoord({
    systemId: SYSTEM_ID,
    track,
    mark,
    coord,
    sysFieldKey,
  });
}

function roundTrip(
  track: string,
  mark: AnchorLookupMark,
  sysValue: number,
  sysFieldKey: string
): number | null {
  const hit = getAnchorCoordFromSys({
    systemId: SYSTEM_ID,
    track,
    mark,
    sysValue,
    sysFieldKey,
  });
  if (!hit) return null;
  return sysFromCoord(track, mark, hit.coord, sysFieldKey);
}

describe("getSysValueFromAnchorCoord", () => {
  describe("B2T_R CO", () => {
    it("returns knot sys for an exact CO knot", () => {
      expect(sysFromCoord("B2T_R", "CO", { x: 40, y: -2.25 }, "CO_f")).toBe(30);
      expect(
        sysFromCoord("B2T_R", "CO", { x: -2.25, y: -2.25 }, "CO_f")
      ).toBe(50);
      expect(sysFromCoord("B2T_R", "CO", { x: -2.25, y: 30 }, "CO_f")).toBe(90);
    });

    it("linearly inverts between knots on the long Fg axis", () => {
      expect(sysFromCoord("B2T_R", "CO", { x: 35, y: -2.25 }, "CO_f")).toBeCloseTo(
        32.5,
        6
      );
    });

    it("linearly inverts after the corner on the short Fg axis", () => {
      const expected = 50 + (5 - -2.25) * (10 / (10 - -2.25));
      expect(
        sysFromCoord("B2T_R", "CO", { x: -2.25, y: 5 }, "CO_f")
      ).toBeCloseTo(expected, 6);
    });

    it("clamps outside the long-axis coverage to the nearest endpoint sys", () => {
      expect(sysFromCoord("B2T_R", "CO", { x: 90, y: -2.25 }, "CO_f")).toBe(0);
    });

    it("clamps past the short-axis end to the last knot sys", () => {
      expect(sysFromCoord("B2T_R", "CO", { x: -2.25, y: 40 }, "CO_f")).toBe(90);
    });
  });

  describe("B2T_R C1", () => {
    it("returns knot sys for an exact C1 knot", () => {
      expect(sysFromCoord("B2T_R", "C1", { x: 50, y: 42.25 }, "C1_f")).toBe(30);
      expect(sysFromCoord("B2T_R", "C1", { x: 10, y: 42.25 }, "C1_f")).toBe(90);
    });

    it("linearly inverts between knots", () => {
      expect(sysFromCoord("B2T_R", "C1", { x: 45, y: 42.25 }, "C1_f")).toBeCloseTo(
        35,
        6
      );
    });

    it("clamps outside C1 coverage to the nearest endpoint sys", () => {
      expect(sysFromCoord("B2T_R", "C1", { x: 90, y: 42.25 }, "C1_f")).toBe(0);
      expect(sysFromCoord("B2T_R", "C1", { x: 0, y: 42.25 }, "C1_f")).toBe(90);
    });
  });

  describe("T2B_R CO/C1", () => {
    it("inverts T2B_R CO knots and the corner with the same sys meaning", () => {
      expect(sysFromCoord("T2B_R", "CO", { x: 40, y: 42.25 }, "CO_f")).toBe(30);
      expect(
        sysFromCoord("T2B_R", "CO", { x: 82.25, y: 42.25 }, "CO_f")
      ).toBe(50);
      expect(sysFromCoord("T2B_R", "CO", { x: 82.25, y: 36.125 }, "CO_f")).toBeCloseTo(
        55,
        6
      );
    });

    it("inverts T2B_R C1 knots with the same sys meaning", () => {
      expect(sysFromCoord("T2B_R", "C1", { x: 30, y: -2.25 }, "C1_f")).toBe(30);
      expect(sysFromCoord("T2B_R", "C1", { x: 70, y: -2.25 }, "C1_f")).toBe(90);
    });
  });

  describe("B2T_L / T2B_L representative knots", () => {
    it("inverts a B2T_L CO knot", () => {
      expect(sysFromCoord("B2T_L", "CO", { x: 40, y: -2.25 }, "CO_f")).toBe(30);
    });

    it("inverts a T2B_L CO knot", () => {
      expect(sysFromCoord("T2B_L", "CO", { x: 40, y: 42.25 }, "CO_f")).toBe(30);
    });

    it("inverts a B2T_L C1 knot and a T2B_L C1 knot", () => {
      expect(sysFromCoord("B2T_L", "C1", { x: 30, y: 42.25 }, "C1_f")).toBe(30);
      expect(sysFromCoord("T2B_L", "C1", { x: 50, y: -2.25 }, "C1_f")).toBe(30);
    });
  });

  describe("failure / ambiguous", () => {
    it("returns null when the coord is not on the mark axis", () => {
      expect(sysFromCoord("B2T_R", "CO", { x: 40, y: 20 }, "CO_f")).toBeNull();
      expect(sysFromCoord("B2T_R", "C1", { x: 40, y: 0 }, "C1_f")).toBeNull();
    });

    it("returns null for a missing track or non-finite coord", () => {
      expect(
        getSysValueFromAnchorCoord({
          systemId: SYSTEM_ID,
          track: null,
          mark: "CO",
          coord: { x: 40, y: -2.25 },
          sysFieldKey: "CO_f",
        })
      ).toBeNull();
      expect(
        sysFromCoord("B2T_R", "CO", { x: Number.NaN, y: -2.25 }, "CO_f")
      ).toBeNull();
    });
  });

  describe("round-trip with getAnchorCoordFromSys", () => {
    const tracks = ["B2T_R", "T2B_R", "B2T_L", "T2B_L"] as const;
    const coSys = [0, 13, 25, 30, 32.5, 35, 50, 55, 60, 90];
    const c1Sys = [0, 10, 30, 35, 50, 70, 90];

    beforeAll(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterAll(() => {
      vi.restoreAllMocks();
    });

    it("recovers 5_half CO sys including the corner / axis-change band", () => {
      for (const track of tracks) {
        for (const sysValue of coSys) {
          const recovered = roundTrip(track, "CO", sysValue, "CO_f");
          expect(recovered, `${track} CO ${sysValue}`).toBeCloseTo(
            sysValue,
            5
          );
        }
      }
    });

    it("recovers 5_half C1 sys on all four tracks", () => {
      for (const track of tracks) {
        for (const sysValue of c1Sys) {
          const recovered = roundTrip(track, "C1", sysValue, "C1_f");
          expect(recovered, `${track} C1 ${sysValue}`).toBeCloseTo(
            sysValue,
            5
          );
        }
      }
    });
  });
});
