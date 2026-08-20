/**
 * Phase 2B — handedness + HPT / thickness resolver.
 * Run: npx vitest run src/domain/family/hptResolver.test.ts
 */

import { describe, expect, it } from "vitest";
import { getTrackHandedness, isOppositeHandedness, isLeftHandedTrack } from "./handedness";
import {
  mirrorThicknessT,
  resolveFamilyHpt,
  resolveFamilyThickness,
} from "./hptResolver";

const canonicalHpt = {
  T: "-3/8",
  hit_point: { x: -2, y: 1.5 },
  hp: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
};

describe("handedness wrappers", () => {
  it("maps Family tracks to L / R via production detectTrackTurn", () => {
    expect(getTrackHandedness("B2T_L")).toBe("L");
    expect(getTrackHandedness("T2B_L")).toBe("L");
    expect(getTrackHandedness("B2T_R")).toBe("R");
    expect(getTrackHandedness("T2B_R")).toBe("R");
    expect(isLeftHandedTrack("B2T_L")).toBe(true);
    expect(isLeftHandedTrack("T2B_L")).toBe(true);
  });

  it("RPI B2T_L → T2B_L is same handedness", () => {
    expect(isOppositeHandedness("B2T_L", "T2B_L")).toBe(false);
    expect(isOppositeHandedness("B2T_L", "B2T_R")).toBe(true);
    expect(isOppositeHandedness("B2T_L", "T2B_R")).toBe(true);
  });
});

describe("resolveFamilyHpt", () => {
  it("same handedness keeps canonical unchanged", () => {
    const result = resolveFamilyHpt({
      authoredTrack: "B2T_L",
      requestedTrack: "T2B_L",
      canonicalHpt,
    });
    expect(result.mirrored).toBe(false);
    expect(result.hpt).toEqual(canonicalHpt);
  });

  it("opposite handedness mirrors T and hit_point.x only", () => {
    const result = resolveFamilyHpt({
      authoredTrack: "B2T_L",
      requestedTrack: "B2T_R",
      canonicalHpt,
    });
    expect(result.mirrored).toBe(true);
    expect(result.hpt).toEqual({
      T: "+3/8",
      hit_point: { x: 2, y: 1.5 },
      hp: { x: 2, y: 1.5 },
      mode: "TIP",
      tipCount: 2,
    });
  });

  it("does not mutate the canonical payload", () => {
    const copy = { ...canonicalHpt, hit_point: { ...canonicalHpt.hit_point } };
    resolveFamilyHpt({
      authoredTrack: "B2T_L",
      requestedTrack: "B2T_R",
      canonicalHpt: copy,
    });
    expect(copy).toEqual(canonicalHpt);
  });

  it("leaves 8/8 and BANK thickness unchanged", () => {
    expect(mirrorThicknessT("8/8")).toBe("8/8");
    expect(mirrorThicknessT("BANK")).toBe("BANK");
    expect(
      resolveFamilyThickness({
        authoredTrack: "B2T_L",
        requestedTrack: "B2T_R",
        canonicalT: "8/8",
      })
    ).toEqual({ T: "8/8", mirrored: true });
  });
});
