import { describe, expect, it } from "vitest";
import {
  BALL_RADIUS,
  CENTER_X,
  computeHptVizGeometry,
} from "./hptVizGeometry";
import { buildUserHptViewModel } from "./userHptViewModel";
import { formatThickness } from "../utils/aiPlayStrategyBuilder";
import {
  actualOverlapFractionFromCircles,
  billiardDirectionMatchesT,
  expectedThicknessFractionFromT,
  PHYSICAL_THICKNESS_AUDIT_D240,
} from "./hptPhysicalOverlap.testHelpers";
import { resolveFamilyHpt } from "./family/hptResolver";

const THICKNESS_SAMPLES = ["+2/8", "+5/8", "+7/8", "-2/8", "-5/8", "-7/8", "8/8"] as const;

function overlapFromGeometry(T: string) {
  const geom = computeHptVizGeometry(T, 0, 0);
  return actualOverlapFractionFromCircles({
    targetCx: geom.targetX,
    impactCx: geom.impactX,
    radius: BALL_RADIUS,
  });
}

describe("hptVizGeometry — Impact Thickness SSOT (TEST A ~ TEST F)", () => {
  it("TEST A — Right Thickness '+5/8': label 우측, White Cue (impact) screen-right of Red Target", () => {
    const T = "+5/8";
    expect(formatThickness(T)).toBe("우측 5/8");

    const geom = computeHptVizGeometry(T, 0, 0);
    expect(geom.isRightImpact).toBe(true);
    expect(geom.thicknessValue).toBe(5);

    expect(geom.impactX).toBeGreaterThan(CENTER_X);
    expect(geom.targetX).toBeLessThan(CENTER_X);
    expect(geom.impactX).toBeGreaterThan(geom.targetX);

    const metrics = actualOverlapFractionFromCircles({
      targetCx: geom.targetX,
      impactCx: geom.impactX,
      radius: BALL_RADIUS,
    });
    expect(metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
    expect(metrics.distance).toBe(90);
    expect(metrics.overlap).toBe(150);
  });

  it("TEST B — Left Thickness '-5/8': label 좌측, White Cue screen-left of Red Target", () => {
    const T = "-5/8";
    expect(formatThickness(T)).toBe("좌측 5/8");

    const geom = computeHptVizGeometry(T, 0, 0);
    expect(geom.isRightImpact).toBe(false);

    expect(geom.impactX).toBeLessThan(CENTER_X);
    expect(geom.targetX).toBeGreaterThan(CENTER_X);
    expect(geom.impactX).toBeLessThan(geom.targetX);

    const metrics = actualOverlapFractionFromCircles({
      targetCx: geom.targetX,
      impactCx: geom.impactX,
      radius: BALL_RADIUS,
    });
    expect(metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
    expect(metrics.distance).toBe(90);
  });

  it("TEST C — '+5/8' vs '-5/8' are exact mirrors across CENTER_X", () => {
    const rightGeom = computeHptVizGeometry("+5/8", 1.5, -2.0);
    const leftGeom = computeHptVizGeometry("-5/8", 1.5, -2.0);

    expect(rightGeom.targetX - CENTER_X).toBe(-(leftGeom.targetX - CENTER_X));
    expect(rightGeom.impactX - CENTER_X).toBe(-(leftGeom.impactX - CENTER_X));
    expect(rightGeom.centerDistance).toBe(leftGeom.centerDistance);
  });

  it("TEST D — '8/8' 정면: zero lateral offset", () => {
    expect(formatThickness("8/8")).toBe("정면(8/8)");

    const geom = computeHptVizGeometry("8/8", 0, 0);
    expect(geom.centerDistance).toBe(0);
    expect(geom.targetX).toBe(CENTER_X);
    expect(geom.impactX).toBe(CENTER_X);

    const metrics = overlapFromGeometry("8/8");
    expect(metrics.overlapFraction).toBe(1);
    expect(metrics.overlap).toBe(240);
  });

  it("TEST E — identical hpT yields identical geometry regardless of platform/session", () => {
    const hpt = { T: "+4/8", hit_point: { x: 1.0, y: 2.0 }, mode: "TIP" as const };
    const vm = buildUserHptViewModel({ hpt });
    const geom = computeHptVizGeometry(vm.viz!.T, vm.viz!.hitX, vm.viz!.hitY);

    expect(vm.thicknessLabel).toBe("우측 4/8");
    expect(geom.impactX).toBeGreaterThan(geom.targetX);
  });

  it("TEST F — S1 (-5/8) and S2 (+5/8) preserve distinct semantics and geometries", () => {
    const vmS1 = buildUserHptViewModel({
      hpt: { T: "-5/8", hit_point: { x: 1.5, y: 3.7 }, mode: "TIP" },
    });
    const geomS1 = computeHptVizGeometry(vmS1.viz!.T, vmS1.viz!.hitX, vmS1.viz!.hitY);
    expect(vmS1.thicknessLabel).toBe("좌측 5/8");
    expect(geomS1.impactX).toBeLessThan(geomS1.targetX);

    const vmS2 = buildUserHptViewModel({
      hpt: { T: "+5/8", hit_point: { x: -2.2, y: 3.3 }, mode: "TIP" },
    });
    const geomS2 = computeHptVizGeometry(vmS2.viz!.T, vmS2.viz!.hitX, vmS2.viz!.hitY);
    expect(vmS2.thicknessLabel).toBe("우측 5/8");
    expect(geomS2.impactX).toBeGreaterThan(geomS2.targetX);
  });

  it("TEST J — ADMIN/USER geometry parity: same T → same impactX/targetX", () => {
    for (const T of THICKNESS_SAMPLES) {
      const a = computeHptVizGeometry(T, 0, 0);
      const b = computeHptVizGeometry(T, 0, 0);
      expect(a.impactX).toBe(b.impactX);
      expect(a.targetX).toBe(b.targetX);
    }
  });

  it("thickness magnitude increases → centerDistance decreases monotonically", () => {
    const rightDistances = ["+2/8", "+5/8", "+7/8"].map((T) => overlapFromGeometry(T).distance);
    expect(rightDistances[0]).toBeGreaterThan(rightDistances[1]);
    expect(rightDistances[1]).toBeGreaterThan(rightDistances[2]);

    const leftDistances = ["-2/8", "-5/8", "-7/8"].map((T) => overlapFromGeometry(T).distance);
    expect(leftDistances[0]).toBeGreaterThan(leftDistances[1]);
    expect(leftDistances[1]).toBeGreaterThan(leftDistances[2]);
  });
});

describe("Physical Thickness SSOT Regression Lock", () => {
  describe("P1 — representative physical overlap (independent circle inverse)", () => {
    it.each([
      ["+1/8", 1 / 8],
      ["+3/8", 3 / 8],
      ["+5/8", 5 / 8],
      ["+7/8", 7 / 8],
      ["8/8", 1],
    ] as const)("P1 %s → overlapFraction %s", (T, expectedFraction) => {
      const metrics = overlapFromGeometry(T);
      expect(metrics.overlapFraction).toBeCloseTo(expectedFraction, 10);
      expect(metrics.overlapFraction).toBeCloseTo(expectedThicknessFractionFromT(T), 10);
    });

    it("P1 table-driven — +1/8 through +7/8 and 8/8 match D=240 audit reference", () => {
      for (const row of PHYSICAL_THICKNESS_AUDIT_D240) {
        const T = row.n === 8 ? "8/8" : (`+${row.n}/8` as const);
        const metrics = overlapFromGeometry(T);
        expect(metrics.overlap).toBe(row.overlapPx);
        expect(metrics.distance).toBe(row.centerSeparationPx);
        expect(metrics.overlapFraction).toBeCloseTo(row.n / 8, 10);
      }
    });
  });

  describe("P2 — +3/8 vs +5/8 complement distinction", () => {
    it("P2 — complement pair has different geometry; overlap follows n/8 not gap", () => {
      const three = overlapFromGeometry("+3/8");
      const five = overlapFromGeometry("+5/8");

      expect(three.distance).toBe(150);
      expect(three.overlap).toBe(90);
      expect(three.overlapFraction).toBeCloseTo(3 / 8, 10);

      expect(five.distance).toBe(90);
      expect(five.overlap).toBe(150);
      expect(five.overlapFraction).toBeCloseTo(5 / 8, 10);

      const geom3 = computeHptVizGeometry("+3/8", 0, 0);
      const geom5 = computeHptVizGeometry("+5/8", 0, 0);
      expect(geom3.impactX).not.toBe(geom5.impactX);
      expect(geom3.targetX).not.toBe(geom5.targetX);

      expect(three.distance).toBeGreaterThan(five.distance);
      expect(three.overlap).toBeLessThan(five.overlap);

      // center separation/D = complement — must NOT be confused with thickness
      expect(three.distance / three.diameter).toBeCloseTo(5 / 8, 10);
      expect(five.distance / five.diameter).toBeCloseTo(3 / 8, 10);
    });
  });

  describe("P3 — +/- mirror invariant", () => {
    it.each([1, 3, 5, 7] as const)("P3 ±%s/8 — same magnitude, mirrored placement", (n) => {
      const posT = `+${n}/8`;
      const negT = `-${n}/8`;
      const pos = computeHptVizGeometry(posT, 0, 0);
      const neg = computeHptVizGeometry(negT, 0, 0);
      const posMetrics = actualOverlapFractionFromCircles({
        targetCx: pos.targetX,
        impactCx: pos.impactX,
        radius: BALL_RADIUS,
      });
      const negMetrics = actualOverlapFractionFromCircles({
        targetCx: neg.targetX,
        impactCx: neg.impactX,
        radius: BALL_RADIUS,
      });

      expect(posMetrics.distance).toBe(negMetrics.distance);
      expect(posMetrics.overlapFraction).toBeCloseTo(n / 8, 10);
      expect(negMetrics.overlapFraction).toBeCloseTo(n / 8, 10);

      expect(pos.targetX - CENTER_X).toBe(-(neg.targetX - CENTER_X));
      expect(pos.impactX - CENTER_X).toBe(-(neg.impactX - CENTER_X));
    });
  });

  describe("P4 — 8/8 full ball invariant", () => {
    it("P4 — 8/8: centers coincide, full overlap", () => {
      const geom = computeHptVizGeometry("8/8", 0, 0);
      expect(geom.targetX).toBe(geom.impactX);
      expect(geom.centerDistance).toBe(0);

      const metrics = overlapFromGeometry("8/8");
      expect(metrics.overlap).toBe(240);
      expect(metrics.overlapFraction).toBe(1);
      expect(metrics.distance).toBe(0);
    });
  });

  describe("P11 — ADMIN/USER shared SSOT (single computeHptVizGeometry)", () => {
    it("P11 — identical T inputs yield identical physical overlap contract", () => {
      for (const T of ["+1/8", "+3/8", "+5/8", "+7/8", "-5/8", "8/8"] as const) {
        const first = overlapFromGeometry(T);
        const second = overlapFromGeometry(T);
        expect(first).toEqual(second);
        expect(first.overlapFraction).toBeCloseTo(expectedThicknessFractionFromT(T), 10);
      }
    });
  });
});

describe("Thickness Direction SSOT (D1–D12)", () => {
  function geomMetrics(T: string) {
    const geom = computeHptVizGeometry(T, 0, 0);
    const metrics = actualOverlapFractionFromCircles({
      targetCx: geom.targetX,
      impactCx: geom.impactX,
      radius: BALL_RADIUS,
    });
    return { geom, metrics };
  }

  describe("D1–D4 — positive thickness direction + overlap", () => {
    it.each([
      ["+1/8", "우측 1/8", 1 / 8],
      ["+3/8", "우측 3/8", 3 / 8],
      ["+5/8", "우측 5/8", 5 / 8],
      ["+7/8", "우측 7/8", 7 / 8],
    ] as const)("D %s — %s, overlap %s", (T, label, fraction) => {
      expect(formatThickness(T)).toBe(label);
      const { geom, metrics } = geomMetrics(T);
      expect(billiardDirectionMatchesT(T, geom.targetX, geom.impactX)).toBe(true);
      expect(metrics.overlapFraction).toBeCloseTo(fraction, 10);
    });
  });

  describe("D5 — negative thickness mirrors positive placement", () => {
    it.each([1, 3, 5, 7] as const)("D5 ±%s/8 — same overlap magnitude, mirrored cx", (n) => {
      const pos = geomMetrics(`+${n}/8`);
      const neg = geomMetrics(`-${n}/8`);

      expect(pos.metrics.distance).toBe(neg.metrics.distance);
      expect(pos.metrics.overlapFraction).toBeCloseTo(n / 8, 10);
      expect(neg.metrics.overlapFraction).toBeCloseTo(n / 8, 10);

      expect(billiardDirectionMatchesT(`+${n}/8`, pos.geom.targetX, pos.geom.impactX)).toBe(true);
      expect(billiardDirectionMatchesT(`-${n}/8`, neg.geom.targetX, neg.geom.impactX)).toBe(true);

      expect(pos.geom.impactX - CENTER_X).toBe(-(neg.geom.impactX - CENTER_X));
      expect(pos.geom.targetX - CENTER_X).toBe(-(neg.geom.targetX - CENTER_X));
    });
  });

  describe("D6 — 8/8 full ball direction invariant", () => {
    it("D6 — 8/8: coincident centers, full overlap", () => {
      const { geom, metrics } = geomMetrics("8/8");
      expect(billiardDirectionMatchesT("8/8", geom.targetX, geom.impactX)).toBe(true);
      expect(geom.centerDistance).toBe(0);
      expect(metrics.overlapFraction).toBe(1);
    });
  });

  describe("D7 — +3/8 vs +5/8 remain distinct geometries", () => {
    it("D7 — complement pair, different overlap and placement", () => {
      const three = geomMetrics("+3/8");
      const five = geomMetrics("+5/8");
      expect(three.geom.impactX).not.toBe(five.geom.impactX);
      expect(three.metrics.overlapFraction).toBeCloseTo(3 / 8, 10);
      expect(five.metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
      expect(three.metrics.distance).toBeGreaterThan(five.metrics.distance);
    });
  });

  describe("D9 — ADMIN/USER parity (shared domain SSOT)", () => {
    it("D9 — duplicate computeHptVizGeometry calls yield identical cx contract", () => {
      for (const T of ["+1/8", "+5/8", "-5/8", "8/8"] as const) {
        const admin = computeHptVizGeometry(T, 0, 0);
        const user = computeHptVizGeometry(T, 0, 0);
        expect(user.targetX).toBe(admin.targetX);
        expect(user.impactX).toBe(admin.impactX);
      }
    });
  });

  describe("D10–D11 — handedness mirror preserves overlap magnitude", () => {
    const canonical = {
      T: "-5/8",
      hit_point: { x: -2, y: 1.5 },
      mode: "TIP",
    };

    it("D10 — opposite handedness mirrors T sign and hit_point.x together", () => {
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
      const sameHpt = same.hpt as { T: string; hit_point: { x: number } };
      const oppHpt = opposite.hpt as { T: string; hit_point: { x: number } };

      expect(sameHpt.T).toBe("-5/8");
      expect(sameHpt.hit_point.x).toBe(-2);
      expect(oppHpt.T).toBe("+5/8");
      expect(oppHpt.hit_point.x).toBe(2);

      const sameGeom = geomMetrics(sameHpt.T);
      const oppGeom = geomMetrics(oppHpt.T);
      expect(sameGeom.metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
      expect(oppGeom.metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
      expect(sameGeom.metrics.distance).toBe(oppGeom.metrics.distance);
      expect(sameGeom.geom.impactX - sameGeom.geom.targetX).toBe(
        -(oppGeom.geom.impactX - oppGeom.geom.targetX)
      );
    });
  });

  describe("D12 — no platform-specific geometry branch", () => {
    it("D12 — view model path uses same geometry SSOT for +5/8", () => {
      const vm = buildUserHptViewModel({
        hpt: { T: "+5/8", hit_point: { x: 0, y: 0 }, mode: "TIP" },
      });
      const direct = computeHptVizGeometry("+5/8", 0, 0);
      const viaVm = computeHptVizGeometry(vm.viz!.T, vm.viz!.hitX, vm.viz!.hitY);
      expect(viaVm.targetX).toBe(direct.targetX);
      expect(viaVm.impactX).toBe(direct.impactX);
    });
  });

  it("direction contract reference — Case R (+5/8) vs Case L (-5/8) coordinates", () => {
    const right = computeHptVizGeometry("+5/8", 0, 0);
    const left = computeHptVizGeometry("-5/8", 0, 0);
    const rightMetrics = actualOverlapFractionFromCircles({
      targetCx: right.targetX,
      impactCx: right.impactX,
      radius: BALL_RADIUS,
    });

    expect(formatThickness("+5/8")).toBe("우측 5/8");
    expect(right.thicknessFraction).toBeCloseTo(5 / 8, 10);
    expect(right.centerDistance).toBe(90);
    expect(rightMetrics.overlap).toBe(150);
    expect(rightMetrics.overlapFraction).toBeCloseTo(5 / 8, 10);
    expect(right.targetX).toBe(255);
    expect(right.impactX).toBe(345);
    expect(right.impactX).toBeGreaterThan(right.targetX);

    expect(formatThickness("-5/8")).toBe("좌측 5/8");
    expect(left.targetX).toBe(345);
    expect(left.impactX).toBe(255);
    expect(left.impactX).toBeLessThan(left.targetX);
  });
});
