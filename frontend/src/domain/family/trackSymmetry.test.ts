/**
 * Phase 2B — Family 4×4 track symmetry + Ball3 transform.
 * Run: npx vitest run src/domain/family/trackSymmetry.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, Point } from "../positionSearchEngine";
import type { SymmetryOp } from "./familyIdentity";
import {
  FAMILY_TRACKS,
  FAMILY_TRACK_SYMMETRY_MAP,
  authoredTrackFromSymmetryMember,
  ballsEqual,
  isFamilyTrack,
  mapFamilyTrack,
  parseFamilyTrack,
  transformBall3,
  transformPoint,
  transformStrategyMeta,
  validateBall3Centers,
  type FamilyTrack,
} from "./trackSymmetry";

const BASES: FamilyTrack[] = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"];
const OPS: SymmetryOp[] = ["H", "V", "RPI"];

const balls: Ball3 = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 },
  second: { x: 62, y: 12 },
};

function expectPoint(actual: Point, expected: Point) {
  expect(actual).toEqual(expected);
}

describe("FamilyTrack boundary", () => {
  it("accepts only the four Family tracks", () => {
    for (const track of FAMILY_TRACKS) {
      expect(isFamilyTrack(track)).toBe(true);
      expect(parseFamilyTrack(track)).toBe(track);
    }
  });

  it("does not coerce system-specific routes into FamilyTrack", () => {
    expect(parseFamilyTrack("RLTR_R")).toBeNull();
    expect(parseFamilyTrack("LRTL_L")).toBeNull();
    expect(isFamilyTrack("RLTR_R")).toBe(false);
  });
});

describe("4×4 Family track map", () => {
  it.each(BASES)("%s identity / H / V / RPI", (base) => {
    const row = FAMILY_TRACK_SYMMETRY_MAP[base];
    expect(mapFamilyTrack(base, "identity")).toBe(row.identity);
    expect(mapFamilyTrack(base, "H")).toBe(row.H);
    expect(mapFamilyTrack(base, "V")).toBe(row.V);
    expect(mapFamilyTrack(base, "RPI")).toBe(row.RPI);
  });

  it("matches the approved 4×4 contract", () => {
    expect(FAMILY_TRACK_SYMMETRY_MAP).toEqual({
      B2T_L: { identity: "B2T_L", H: "B2T_R", V: "T2B_R", RPI: "T2B_L" },
      B2T_R: { identity: "B2T_R", H: "B2T_L", V: "T2B_L", RPI: "T2B_R" },
      T2B_L: { identity: "T2B_L", H: "T2B_R", V: "B2T_R", RPI: "B2T_L" },
      T2B_R: { identity: "T2B_R", H: "T2B_L", V: "B2T_L", RPI: "B2T_R" },
    });
  });
});

describe("Ball3 coordinate transforms", () => {
  it("transforms cue, target, and second", () => {
    const h = transformBall3("H", balls);
    expectPoint(h.cue, { x: 70, y: 8 });
    expectPoint(h.target, { x: 40, y: 20 });
    expectPoint(h.second, { x: 18, y: 12 });

    const v = transformBall3("V", balls);
    expectPoint(v.cue, { x: 10, y: 32 });
    expectPoint(v.target, { x: 40, y: 20 });
    expectPoint(v.second, { x: 62, y: 28 });

    const rpi = transformBall3("RPI", balls);
    expectPoint(rpi.cue, { x: 70, y: 32 });
    expectPoint(rpi.target, { x: 40, y: 20 });
    expectPoint(rpi.second, { x: 18, y: 28 });
  });

  it("preserves Role field identity under H/V/RPI (Phase 5)", () => {
    for (const op of OPS) {
      const out = transformBall3(op, balls);
      expect(out).toHaveProperty("cue");
      expect(out).toHaveProperty("target");
      expect(out).toHaveProperty("second");
      expect(Object.keys(out).sort()).toEqual(["cue", "second", "target"]);
    }
  });

  it("H² = V² = RPI² = identity", () => {
    for (const op of OPS) {
      expect(ballsEqual(transformBall3(op, transformBall3(op, balls)), balls)).toBe(
        true
      );
    }
  });

  it("RPI = H ∘ V = V ∘ H", () => {
    const rpi = transformBall3("RPI", balls);
    expect(ballsEqual(transformBall3("H", transformBall3("V", balls)), rpi)).toBe(
      true
    );
    expect(ballsEqual(transformBall3("V", transformBall3("H", balls)), rpi)).toBe(
      true
    );
  });

  it("authored track is recovered from SYMMETRY member via involution", () => {
    expect(authoredTrackFromSymmetryMember("B2T_R", "H")).toBe("B2T_L");
    expect(authoredTrackFromSymmetryMember("T2B_L", "RPI")).toBe("B2T_L");
    expect(authoredTrackFromSymmetryMember("T2B_L", "V")).toBe("B2T_R");
  });

  it("validates transformed centers", () => {
    expect(validateBall3Centers(transformBall3("H", balls))).toBeNull();
    expect(
      validateBall3Centers({
        cue: { x: 0.4, y: 10 },
        target: { x: 10, y: 10 },
        second: { x: 20, y: 10 },
      })
    ).toBe("cue center out of range");
  });
});

describe("meta is transformed, not blindly copied", () => {
  it("rewrites impact/final and recomputes angles", () => {
    const meta = {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 1,
      angle_fs: 2,
    };
    const transformed = transformBall3("H", balls);
    const next = transformStrategyMeta("H", meta, transformed);
    expect(next.impact).toEqual(transformPoint("H", meta.impact));
    expect(next.final).toEqual(transformPoint("H", meta.final));
    expect(next.angle_ci).not.toBe(meta.angle_ci);
    expect(next.angle_fs).not.toBe(meta.angle_fs);
  });
});
