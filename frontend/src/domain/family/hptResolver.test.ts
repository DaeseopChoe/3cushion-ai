/**
 * Phase 2B — handedness + HPT / thickness resolver.
 * Run: npx vitest run src/domain/family/hptResolver.test.ts
 */

import { describe, expect, it } from "vitest";
import { BALL_RADIUS } from "../hptVizGeometry";
import { computeHptVizGeometry } from "../hptVizGeometry";
import {
  actualOverlapFractionFromCircles,
  expectedThicknessFractionFromT,
} from "../hptPhysicalOverlap.testHelpers";
import { getTrackHandedness, isOppositeHandedness, isLeftHandedTrack } from "./handedness";
import { FAMILY_TRACKS, type FamilyTrack } from "./trackSymmetry";
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

function runtimeOverlapFraction(T: string): number {
  const geom = computeHptVizGeometry(T, 0, 0);
  return actualOverlapFractionFromCircles({
    targetCx: geom.targetX,
    impactCx: geom.impactX,
    radius: BALL_RADIUS,
  }).overlapFraction;
}

function thicknessMagnitude(T: string): number {
  if (T === "8/8" || T === "BANK") return 8;
  const match = T.match(/^([+-]?)(\d+)\/8$/);
  if (!match) return 0;
  return parseInt(match[2], 10);
}

describe("Physical Thickness + Handedness Regression Lock", () => {
  const authoredHptMinusFive = {
    T: "-5/8",
    hit_point: { x: -2, y: 1.5 },
    mode: "TIP",
    tipCount: 2,
  };

  describe("P5 — handedness mirror preserves physical overlap magnitude", () => {
    it("P5 — same handedness keeps T; opposite mirrors T; |T| and overlap unchanged", () => {
      const same = resolveFamilyHpt({
        authoredTrack: "B2T_L",
        requestedTrack: "T2B_L",
        canonicalHpt: authoredHptMinusFive,
      });
      expect(same.mirrored).toBe(false);
      expect((same.hpt as { T: string }).T).toBe("-5/8");
      expect(runtimeOverlapFraction((same.hpt as { T: string }).T)).toBeCloseTo(5 / 8, 10);

      const opposite = resolveFamilyHpt({
        authoredTrack: "B2T_L",
        requestedTrack: "B2T_R",
        canonicalHpt: authoredHptMinusFive,
      });
      expect(opposite.mirrored).toBe(true);
      expect((opposite.hpt as { T: string }).T).toBe("+5/8");
      expect(thicknessMagnitude((opposite.hpt as { T: string }).T)).toBe(5);
      expect(runtimeOverlapFraction((opposite.hpt as { T: string }).T)).toBeCloseTo(5 / 8, 10);

      expect(
        runtimeOverlapFraction((same.hpt as { T: string }).T)
      ).toBeCloseTo(runtimeOverlapFraction((opposite.hpt as { T: string }).T), 10);
    });
  });

  describe("P6 — T and hit_point mirror coupling", () => {
    it("P6 — same handedness: T and hit_point.x both kept", () => {
      const result = resolveFamilyHpt({
        authoredTrack: "B2T_L",
        requestedTrack: "T2B_L",
        canonicalHpt: authoredHptMinusFive,
      });
      const hpt = result.hpt as { T: string; hit_point: { x: number } };
      expect(result.mirrored).toBe(false);
      expect(hpt.T).toBe("-5/8");
      expect(hpt.hit_point.x).toBe(-2);
    });

    it("P6 — opposite handedness: T and hit_point.x both mirrored together", () => {
      const result = resolveFamilyHpt({
        authoredTrack: "B2T_L",
        requestedTrack: "B2T_R",
        canonicalHpt: authoredHptMinusFive,
      });
      const hpt = result.hpt as { T: string; hit_point: { x: number } };
      expect(result.mirrored).toBe(true);
      expect(hpt.T).toBe("+5/8");
      expect(hpt.hit_point.x).toBe(2);
      expect(hpt.T.startsWith("+")).toBe(hpt.hit_point.x > 0);
    });

    it("P6 — 8/8: T invariant; hit_point.x still mirrors on opposite handedness (existing SSOT)", () => {
      const canonical = { T: "8/8", hit_point: { x: 2, y: 1.5 }, mode: "TIP" };
      const same = resolveFamilyHpt({
        authoredTrack: "B2T_L",
        requestedTrack: "T2B_L",
        canonicalHpt: canonical,
      });
      const opposite = resolveFamilyHpt({
        authoredTrack: "B2T_L",
        requestedTrack: "B2T_R",
        canonicalHpt: canonical,
      });
      expect((same.hpt as { T: string }).T).toBe("8/8");
      expect((opposite.hpt as { T: string }).T).toBe("8/8");
      expect((same.hpt as { hit_point: { x: number } }).hit_point.x).toBe(2);
      expect((opposite.hpt as { hit_point: { x: number } }).hit_point.x).toBe(-2);
      expect(runtimeOverlapFraction("8/8")).toBe(1);
    });
  });

  describe("P7 — 4×4 handedness matrix (isOppositeHandedness only)", () => {
    const canonical = {
      T: "-4/8",
      hit_point: { x: -1.5, y: 0.5 },
      hp: { x: -1.5, y: 0.5 },
      mode: "TIP",
      tipCount: 2,
    };

    it("P7 — 4 tracks = 2L + 2R", () => {
      const left = FAMILY_TRACKS.filter((t) => getTrackHandedness(t) === "L");
      const right = FAMILY_TRACKS.filter((t) => getTrackHandedness(t) === "R");
      expect(left).toEqual(["B2T_L", "T2B_L"]);
      expect(right).toEqual(["B2T_R", "T2B_R"]);
      expect(left).toHaveLength(2);
      expect(right).toHaveLength(2);
    });

    it.each(FAMILY_TRACKS)(
      "P7 — authored %s: same=2 opposite=2 with T/hit_point keep/mirror contract",
      (authoredTrack: FamilyTrack) => {
        let sameCount = 0;
        let oppositeCount = 0;

        for (const requestedTrack of FAMILY_TRACKS) {
          const opposite = isOppositeHandedness(authoredTrack, requestedTrack);
          const result = resolveFamilyHpt({
            authoredTrack,
            requestedTrack,
            canonicalHpt: canonical,
          });
          const hpt = result.hpt as {
            T: string;
            hit_point: { x: number; y: number };
          };

          if (opposite) {
            oppositeCount += 1;
            expect(result.mirrored).toBe(true);
            expect(hpt.T).toBe("+4/8");
            expect(hpt.hit_point.x).toBe(1.5);
            expect(hpt.hit_point.y).toBe(canonical.hit_point.y);
          } else {
            sameCount += 1;
            expect(result.mirrored).toBe(false);
            expect(hpt.T).toBe(canonical.T);
            expect(hpt.hit_point.x).toBe(canonical.hit_point.x);
            expect(hpt.hit_point.y).toBe(canonical.hit_point.y);
          }

          expect(runtimeOverlapFraction(hpt.T)).toBeCloseTo(
            expectedThicknessFractionFromT(hpt.T),
            10
          );
        }

        expect(sameCount).toBe(2);
        expect(oppositeCount).toBe(2);
      }
    );
  });
});
