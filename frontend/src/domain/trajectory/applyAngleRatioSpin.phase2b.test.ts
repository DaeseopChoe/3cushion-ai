/**
 * Phase 2B Option 1 — q/K common spin stage (T1–T7 + live LEFT→BOTTOM fixture).
 *
 * Run: npx vitest run src/domain/trajectory/applyAngleRatioSpin.phase2b.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fiveHalfAnchors from "../../data/systems/5_half_system/anchors.json";
import { computeRailImpactPoint } from "../../utils/geometry/anchorResolve";
import {
  computeReflectionC2,
  isLeftHandedTrack,
  resolveSignedSpinDeg,
} from "../reflectionEngine";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import {
  FRAME_BOTTOM_Y,
  FRAME_LEFT_X,
  FRAME_TOP_Y,
  computeFrameProgressionR1b,
} from "./frameProgressionReflection";
import {
  resolveReflectionC2,
  shouldApplyFrameProgressionR1b,
  type ReflectionMarkReference,
} from "./reflectionPolicy";

beforeAll(() => {
  bindDomainContractSupply({
    getFormulaExpr: () => null,
    getFormulaHash: () => "v1",
    getAnchorsData: (systemId) =>
      systemId === "5_half_system" || systemId === "5_HALF"
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

function c1fReference(
  A: { x: number; y: number },
  B: { x: number; y: number },
  c3 = { x: 37, y: 40 }
): ReflectionMarkReference {
  return {
    co: { point: A, sysFieldKey: "CO_f", valueSpace: "Fg" },
    c1Aim: { point: B, sysFieldKey: "C1_f", valueSpace: "Fg" },
    c3: { point: c3, sysFieldKey: "C3_r", valueSpace: "Rg" },
  };
}

function physicalH(
  A: { x: number; y: number },
  B: { x: number; y: number },
  track = "T2B_R"
) {
  return computeRailImpactPoint(A, B, {
    track,
    mark: "C1",
    systemId: "5_half_system",
  })!;
}

/** Live USER scene: LEFT_F → BOTTOM_F, P7 fail, R0 + q≈6.3. */
const LIVE = {
  A: { x: FRAME_LEFT_X, y: 20 },
  B: { x: 60, y: FRAME_BOTTOM_Y },
  H: { x: 53.7, y: 0 },
  c3: { x: 40, y: 40 },
  track: "T2B_L" as const,
};

describe("T1 — TOP↔BOTTOM R1b tip=0 Phase2A equality", () => {
  it("baseθ = R1b; effectiveSpin=0; K not applied", () => {
    const A = { x: 8, y: FRAME_TOP_Y };
    const B = { x: 4, y: FRAME_BOTTOM_Y };
    const H = physicalH(A, B);
    const reference = c1fReference(A, B);
    const geom = computeFrameProgressionR1b({ A, B, H })!;

    const out = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip: { count: 0, side: "R" },
      track: "T2B_R",
      reference,
    });

    expect(out!.diagnostics.baseLaw).toBe("R1b");
    expect(out!.diagnostics.baseThetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 12);
    expect(out!.thetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 12);
    expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBe(0);
    expect(out!.diagnostics.angleRatioApplied).toBe(false);
    expect(out!.diagnostics.angleRatioApplicationCount).toBe(0);
  });
});

describe("T2 — TOP↔BOTTOM R1b tip=4 q≈6 K once", () => {
  it("K≈0.50 applied exactly once", () => {
    const B = { x: 60, y: FRAME_BOTTOM_Y };
    const t = 42.25 / 44.5;
    const Ax = (53.7 - t * 60) / (1 - t);
    const A = { x: Ax, y: FRAME_TOP_Y };
    const H = physicalH(A, B);
    const reference = c1fReference(A, B);

    const out = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip: { count: 4, side: "R" },
      track: "T2B_R",
      reference,
    });

    expect(out!.diagnostics.baseLaw).toBe("R1b");
    expect(out!.diagnostics.angleRatio!).toBeGreaterThan(6);
    expect(out!.diagnostics.angleRatioK).toBeCloseTo(0.5, 9);
    expect(out!.diagnostics.angleRatioApplicationCount).toBe(1);
    expect(out!.diagnostics.angleRatioApplied).toBe(true);
    const raw = out!.diagnostics.rawSpinCorrectionDeg!;
    expect(Math.abs(raw)).toBeCloseTo(18, 9);
    expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
      raw * 0.5,
      9
    );
    expect(out!.thetaOutDeg).toBeCloseTo(
      out!.diagnostics.baseThetaOutDeg! + raw * 0.5,
      9
    );
  });
});

describe("T3/T4 — live LEFT→BOTTOM R0 + q/K", () => {
  it("T3 tip=0: P7 false; R0 bit-identical to tip=0 engine", () => {
    const { A, B, H, c3, track } = LIVE;
    const reference = c1fReference(A, B, c3);
    expect(shouldApplyFrameProgressionR1b(reference)).toBe(false);

    const tip = { count: 0, side: "L" as const };
    const out = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip,
      track,
      reference,
    });
    const eng = computeReflectionC2({
      co: A,
      c1: H,
      c3,
      tip,
      track,
      manualHint: null,
    });

    expect(out!.diagnostics.baseLaw).toBe("R0");
    expect(out!.thetaOutDeg).toBeCloseTo(eng!.thetaOutDeg, 12);
    expect(out!.c2.x).toBeCloseTo(eng!.c2.x, 12);
    expect(out!.c2.y).toBeCloseTo(eng!.c2.y, 12);
    expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBe(0);
    expect(out!.diagnostics.angleRatioApplied).toBe(false);
  });

  it("T4 tip=4: R0 base + q≈6.3 K=0.5; |raw|≈18 |eff|≈9", () => {
    const { A, B, H, c3, track } = LIVE;
    const reference = c1fReference(A, B, c3);
    expect(shouldApplyFrameProgressionR1b(reference)).toBe(false);

    const tip = { count: 4, side: "L" as const };
    const tip0 = computeReflectionC2({
      co: A,
      c1: H,
      c3,
      tip: { count: 0, side: "L" },
      track,
      manualHint: null,
    });

    const out = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip,
      track,
      reference,
    });

    expect(out!.diagnostics.baseLaw).toBe("R0");
    expect(out!.diagnostics.baseThetaOutDeg).toBeCloseTo(tip0!.thetaOutDeg, 12);
    expect(out!.diagnostics.angleRatio!).toBeCloseTo(Math.abs(60 - 53.7), 6);
    expect(out!.diagnostics.angleRatioK).toBeCloseTo(0.5, 9);
    expect(out!.diagnostics.angleRatioApplicationCount).toBe(1);

    const signed =
      resolveSignedSpinDeg(track, tip) *
      (isLeftHandedTrack(track) ? -1 : 1);
    expect(Math.abs(signed)).toBeCloseTo(18, 9);
    expect(out!.diagnostics.rawSpinCorrectionDeg).toBeCloseTo(signed, 12);
    expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
      signed * 0.5,
      9
    );
    expect(Math.abs(out!.diagnostics.effectiveSpinCorrectionDeg!)).toBeCloseTo(
      9,
      9
    );
    expect(out!.thetaOutDeg).toBeCloseTo(
      tip0!.thetaOutDeg + signed * 0.5,
      9
    );
    expect(out!.diagnostics.finalThetaOutDeg).toBeCloseTo(out!.thetaOutDeg, 12);
  });
});

describe("T5 — C1_r / Native no K", () => {
  it("C1_r matches engine full spin", () => {
    const A = { x: 0, y: FRAME_TOP_Y };
    const B = { x: 40, y: FRAME_BOTTOM_Y };
    const H = physicalH(A, B);
    const tip = { count: 4, side: "R" as const };
    const reference: ReflectionMarkReference = {
      co: { point: A, sysFieldKey: "CO_f", valueSpace: "Fg" },
      c1Aim: { point: B, sysFieldKey: "C1_r", valueSpace: "Rg" },
      c3: { point: { x: 37, y: 40 }, sysFieldKey: "C3_r", valueSpace: "Rg" },
    };
    const pol = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip,
      track: "T2B_R",
      reference,
    });
    const eng = computeReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip,
      track: "T2B_R",
      manualHint: null,
    });
    expect(pol!.thetaOutDeg).toBeCloseTo(eng!.thetaOutDeg, 12);
    expect(pol!.diagnostics.angleRatioApplied).toBe(false);
  });
});

describe("T6 — invalid B/H fail-safe", () => {
  it("interior H (no rail) → reflection null (no crash)", () => {
    const A = { x: 0, y: FRAME_TOP_Y };
    const tip = { count: 2, side: "R" as const };
    const pol = resolveReflectionC2({
      co: A,
      c1: { x: 40, y: 20 },
      c3: { x: 37, y: 40 },
      tip,
      track: "T2B_R",
      reference: c1fReference(A, { x: 40, y: FRAME_BOTTOM_Y }),
    });
    expect(pol).toBeNull();
  });

  it("missing C1_f key → legacy R0 full spin (no K)", () => {
    const A = { x: 0, y: FRAME_TOP_Y };
    const B = { x: 40, y: FRAME_BOTTOM_Y };
    const H = physicalH(A, B);
    const tip = { count: 2, side: "R" as const };
    const reference: ReflectionMarkReference = {
      co: { point: A, sysFieldKey: "CO_f", valueSpace: "Fg" },
      c1Aim: { point: B, valueSpace: "Fg" }, // no sysFieldKey
    };
    const pol = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip,
      track: "T2B_R",
      reference,
    });
    const eng = computeReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip,
      track: "T2B_R",
      manualHint: null,
    });
    expect(pol).toBeTruthy();
    expect(pol!.diagnostics.baseLaw).toBe("R0");
    expect(pol!.thetaOutDeg).toBeCloseTo(eng!.thetaOutDeg, 12);
    expect(pol!.diagnostics.angleRatioApplied).toBe(false);
  });
});

describe("T7 — manual C2 path is outside policy", () => {
  it("policy still returns auto C2; builder skips when anchors.C2 set (contract note)", () => {
    // Manual C2 is builder-level (`anchors["C2"]`); policy is not invoked.
    // Guard: resolveReflectionC2 remains callable and does not crash.
    const out = resolveReflectionC2({
      co: LIVE.A,
      c1: LIVE.H,
      c3: LIVE.c3,
      tip: { count: 4, side: "L" },
      track: LIVE.track,
      reference: c1fReference(LIVE.A, LIVE.B, LIVE.c3),
    });
    expect(out).toBeTruthy();
    expect(out!.diagnostics.baseLaw).toBe("R0");
  });
});
