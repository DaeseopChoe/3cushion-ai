/**
 * Phase 2B — EXPERIMENTAL angle-ratio K(q) on frozen Phase 2A R1b.
 * q = |B∥ − H∥| (NOT incidence angle φ).
 *
 * Run: npx vitest run src/domain/trajectory/angleRatioCalibration.phase2b.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fiveHalfAnchors from "../../data/systems/5_half_system/anchors.json";
import { computeRailImpactPoint } from "../../utils/geometry/anchorResolve";
import {
  computeReflectionC2,
  resolveSignedSpinDeg,
} from "../reflectionEngine";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import {
  ANGLE_RATIO_K_EXPERIMENTAL,
  ANGLE_RATIO_K_FALLBACK,
  ANGLE_RATIO_K_STATUS,
  resolveAngleRatioK,
} from "./angleRatioCalibration";
import { computeAngleRatio } from "./angleRatioGeometry";
import {
  FRAME_BOTTOM_Y,
  FRAME_TOP_Y,
  computeFrameProgressionR1b,
} from "./frameProgressionReflection";
import {
  hasNonZeroTipSpin,
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

const PROGRESSIONS = [
  { name: "8→4→0", A_par: 8, B_par: 4, D_par: 0 },
  { name: "7→4→1", A_par: 7, B_par: 4, D_par: 1 },
  { name: "6→4→2", A_par: 6, B_par: 4, D_par: 2 },
  { name: "5→4→3", A_par: 5, B_par: 4, D_par: 3 },
] as const;

function frameAB(A_par: number, B_par: number) {
  return {
    A: { x: A_par, y: FRAME_TOP_Y },
    B: { x: B_par, y: FRAME_BOTTOM_Y },
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

describe("Phase 2B angle-ratio geometry q = |B∥ − H∥|", () => {
  it("long rail: B.x=60, H.x=53.7 → q≈6.3", () => {
    const B = { x: 60, y: FRAME_BOTTOM_Y };
    const H = { x: 53.7, y: 0 };
    const g = computeAngleRatio(B, H, "BOTTOM");
    expect(g).toBeTruthy();
    expect(g!.longitudinalAxis).toBe("x");
    expect(g!.frameAimLongitudinal).toBe(60);
    expect(g!.railHitLongitudinal).toBeCloseTo(53.7, 9);
    expect(g!.angleRatio).toBeCloseTo(6.3, 9);
    // Normal offset 2.25 must NOT enter q
    expect(g!.angleRatio).not.toBeCloseTo(2.25, 1);
  });

  it("long rail: B.x=40, H.x=37 → q=3", () => {
    const g = computeAngleRatio(
      { x: 40, y: FRAME_BOTTOM_Y },
      { x: 37, y: 0 },
      "BOTTOM"
    );
    expect(g!.angleRatio).toBeCloseTo(3, 12);
  });

  it("short rail axis: q = |B.y − H.y|", () => {
    const g = computeAngleRatio(
      { x: -2.25, y: 30 },
      { x: 0, y: 22 },
      "LEFT"
    );
    expect(g!.longitudinalAxis).toBe("y");
    expect(g!.angleRatio).toBeCloseTo(8, 12);
  });

  it("q uses geometry coords only — not sys conversion", () => {
    // Same numeric 60 as Frame x, not C1_f sys→C1_r
    const B = { x: 60, y: FRAME_BOTTOM_Y };
    const H = { x: 53.7, y: 0 };
    const g = computeAngleRatio(B, H, "BOTTOM");
    expect(g!.angleRatio).toBe(Math.abs(60 - 53.7));
  });
});

describe("Phase 2B K(q) SSOT + interpolation", () => {
  it("status is EXPERIMENTAL", () => {
    expect(ANGLE_RATIO_K_STATUS).toBe("EXPERIMENTAL");
  });

  it.each([
    [3.0, 1.0],
    [4.5, 0.75],
    [6.0, 0.5],
  ] as const)("q=%s → K=%s", (q, k) => {
    expect(resolveAngleRatioK(q)).toBeCloseTo(k, 12);
  });

  it("clamp q<3 → 1.00; q>6 → 0.50", () => {
    expect(resolveAngleRatioK(0)).toBeCloseTo(1.0, 12);
    expect(resolveAngleRatioK(2.9)).toBeCloseTo(1.0, 12);
    expect(resolveAngleRatioK(6.3)).toBeCloseTo(0.5, 12);
    expect(resolveAngleRatioK(10)).toBeCloseTo(0.5, 12);
  });

  it("invalid → fallback 1.0", () => {
    expect(resolveAngleRatioK(Number.NaN)).toBe(ANGLE_RATIO_K_FALLBACK);
    expect(resolveAngleRatioK(Number.POSITIVE_INFINITY)).toBe(
      ANGLE_RATIO_K_FALLBACK
    );
  });

  it("SSOT knots", () => {
    for (const p of ANGLE_RATIO_K_EXPERIMENTAL) {
      expect(resolveAngleRatioK(p.ratio)).toBeCloseTo(p.k, 12);
    }
  });
});

describe("Phase 2A tip=0 golden freeze under corrected Phase 2B", () => {
  it.each(PROGRESSIONS)(
    "$name tip=0: effectiveSpin=0; baseθ = R1b; H/D frozen",
    ({ A_par, B_par, D_par }) => {
      const { A, B } = frameAB(A_par, B_par);
      const H = physicalH(A, B);
      const c3 = { x: 37, y: 40 };
      const reference = c1fReference(A, B, c3);

      const out = resolveReflectionC2({
        co: A,
        c1: H,
        c3,
        tip: { count: 0, side: "R" },
        track: "T2B_R",
        reference,
      });

      expect(out?.diagnostics.baseLaw).toBe("R1b");
      expect(hasNonZeroTipSpin({ count: 0, side: "R" })).toBe(false);
      expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBe(0);
      expect(out!.diagnostics.rawSpinCorrectionDeg).toBe(0);

      const geom = computeFrameProgressionR1b({ A, B, H })!;
      expect(geom.D.x).toBeCloseTo(D_par, 9);
      expect(out!.diagnostics.baseThetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 12);
      expect(out!.thetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 12);
      expect(out!.diagnostics.angleRatio).toBeCloseTo(
        Math.abs(B.x - H.x),
        9
      );
      // tip=0: K multiply bypassed (applicationCount=0); q may still be diagnosed
      expect(out!.diagnostics.angleRatioApplied).toBe(false);
      expect(out!.diagnostics.angleRatioApplicationCount).toBe(0);
      expect(out!.diagnostics.finalThetaOutDeg).toBeCloseTo(
        out!.diagnostics.baseThetaOutDeg!,
        12
      );
    }
  );
});

describe("Phase 2B R1b + K(q) tip scaling", () => {
  it("q≈6.3 → K≈0.50; effective = raw × 0.5", () => {
    // Construct A→B so H.x ≈ 53.7 and B.x = 60 (BOTTOM aim)
    const B = { x: 60, y: FRAME_BOTTOM_Y };
    // Pick A on TOP such that ray hits near x=53.7 on y=0
    // Line A=(Ax,42.25) → B=(60,-2.25): at y=0, t=(0-42.25)/(-2.25-42.25)=42.25/44.5
    // Hx = Ax + t*(60-Ax) = 53.7 → solve Ax
    const t = 42.25 / 44.5;
    const Hx = 53.7;
    const Ax = (Hx - t * 60) / (1 - t);
    const A = { x: Ax, y: FRAME_TOP_Y };
    const H = physicalH(A, B);
    expect(H.x).toBeCloseTo(53.7, 1);

    const c3 = { x: 37, y: 40 };
    const reference = c1fReference(A, B, c3);
    expect(shouldApplyFrameProgressionR1b(reference)).toBe(true);

    const tip = { count: 1, side: "R" as const };
    const out = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip,
      track: "T2B_R",
      reference,
    });

    expect(out?.diagnostics.baseLaw).toBe("R1b");
    expect(out!.diagnostics.angleRatio!).toBeCloseTo(Math.abs(60 - H.x), 6);
    expect(out!.diagnostics.angleRatio!).toBeGreaterThan(6);
    expect(out!.diagnostics.angleRatioK).toBeCloseTo(0.5, 9);
    expect(out!.diagnostics.angleRatioApplicationCount).toBe(1);
    expect(out!.diagnostics.angleRatioApplied).toBe(true);

    const raw = out!.diagnostics.rawSpinCorrectionDeg!;
    expect(Math.abs(raw)).toBeGreaterThan(0);
    expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
      raw * 0.5,
      9
    );

    const geom = computeFrameProgressionR1b({ A, B, H })!;
    expect(out!.diagnostics.baseThetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 12);
    expect(out!.thetaOutDeg).toBeCloseTo(geom.thetaOutDeg + raw * 0.5, 9);
  });

  it("same raw spin S: q=3→S, q=4.5→0.75S, q=6→0.5S (1tip)", () => {
    // Use synthetic B/H with controlled q while keeping R1b gate via A/B Frame pair
    const cases = [
      { Bx: 40, Hx: 37, k: 1.0 },
      { Bx: 40, Hx: 35.5, k: 0.75 }, // |40-35.5|=4.5
      { Bx: 40, Hx: 34, k: 0.5 },
    ] as const;

    for (const { Bx, Hx, k } of cases) {
      const B = { x: Bx, y: FRAME_BOTTOM_Y };
      const A = { x: 0, y: FRAME_TOP_Y };
      // Force H by using physical c1 = synthetic hit (R1b still uses A,B for D)
      const H = { x: Hx, y: 0 };
      // Ensure gate: parallel opposite Frame
      expect(shouldApplyFrameProgressionR1b(c1fReference(A, B))).toBe(true);

      const tip = { count: 1, side: "R" as const };
      const out = resolveReflectionC2({
        co: A,
        c1: H,
        c3: { x: 37, y: 40 },
        tip,
        track: "T2B_R",
        reference: c1fReference(A, B),
      });

      expect(out!.diagnostics.angleRatio).toBeCloseTo(Math.abs(Bx - Hx), 9);
      expect(out!.diagnostics.angleRatioK).toBeCloseTo(k, 9);
      const raw = out!.diagnostics.rawSpinCorrectionDeg!;
      // tip1 on T2B_R: track turn R, tip R → +TIP_TO_DELTA[1]=5 (before handed = same)
      expect(raw).toBeCloseTo(
        resolveSignedSpinDeg("T2B_R", tip) *
          1 /* not left-handed */,
        12
      );
      expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
        raw * k,
        9
      );
    }
  });

  it("2/3/4 tip: same K; magnitude scales with existing tip table", () => {
    const A = { x: 0, y: FRAME_TOP_Y };
    const B = { x: 60, y: FRAME_BOTTOM_Y };
    const H = { x: 53.7, y: 0 };
    const reference = c1fReference(A, B);
    const expectedK = resolveAngleRatioK(Math.abs(60 - 53.7));
    expect(expectedK).toBeCloseTo(0.5, 9);

    const tips = [2, 3, 4] as const;
    const raws: number[] = [];
    for (const count of tips) {
      const out = resolveReflectionC2({
        co: A,
        c1: H,
        c3: { x: 37, y: 40 },
        tip: { count, side: "R" },
        track: "T2B_R",
        reference,
      });
      expect(out!.diagnostics.angleRatioK).toBeCloseTo(expectedK, 12);
      raws.push(out!.diagnostics.rawSpinCorrectionDeg!);
      expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
        out!.diagnostics.rawSpinCorrectionDeg! * expectedK,
        9
      );
    }
    expect(Math.abs(raws[1]!)).toBeGreaterThan(Math.abs(raws[0]!));
    expect(Math.abs(raws[2]!)).toBeGreaterThan(Math.abs(raws[1]!));
  });

  it("+tip / -tip: K identical; sign follows existing spin", () => {
    const A = { x: 8, y: FRAME_TOP_Y };
    const B = { x: 4, y: FRAME_BOTTOM_Y };
    const H = physicalH(A, B);
    const reference = c1fReference(A, B);

    const plus = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip: { count: 2, side: "R" },
      track: "T2B_R",
      reference,
    });
    const minus = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip: { count: 2, side: "L" },
      track: "T2B_R",
      reference,
    });

    expect(plus!.diagnostics.angleRatio).toBeCloseTo(
      minus!.diagnostics.angleRatio!,
      12
    );
    expect(plus!.diagnostics.angleRatioK).toBeCloseTo(
      minus!.diagnostics.angleRatioK!,
      12
    );
    expect(plus!.diagnostics.rawSpinCorrectionDeg).toBeCloseTo(
      -minus!.diagnostics.rawSpinCorrectionDeg!,
      12
    );
    expect(plus!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
      -minus!.diagnostics.effectiveSpinCorrectionDeg!,
      12
    );
  });
});

describe("Phase 2B R0 paths — C1_r/Native no K; short-rail C1_f gets K", () => {
  it("C1_r tip≠0 matches engine R0", () => {
    const { A, B } = frameAB(0, 40);
    const H = physicalH(A, B);
    const tip = { count: 2, side: "R" as const };
    const reference: ReflectionMarkReference = {
      co: { point: A, sysFieldKey: "CO_f", valueSpace: "Fg" },
      c1Aim: { point: B, sysFieldKey: "C1_r", valueSpace: "Rg" },
      c3: { point: { x: 37, y: 40 }, sysFieldKey: "C3_r", valueSpace: "Rg" },
    };
    expect(shouldApplyFrameProgressionR1b(reference)).toBe(false);

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
    expect(pol?.diagnostics.baseLaw).toBe("R0");
    expect(pol!.thetaOutDeg).toBeCloseTo(eng!.thetaOutDeg, 12);
    expect(pol!.diagnostics.angleRatio).toBeUndefined();
    expect(pol!.diagnostics.angleRatioApplied).toBe(false);
    expect(pol!.diagnostics.angleRatioApplicationCount).toBe(0);
  });

  it("Native / no-reference tip≠0 unchanged", () => {
    const tip = { count: 2, side: "R" as const };
    const co = { x: 0, y: FRAME_TOP_Y };
    const c1 = physicalH(co, { x: 40, y: FRAME_BOTTOM_Y });
    const c3 = { x: 37, y: 40 };
    const pol = resolveReflectionC2({ co, c1, c3, tip, track: "T2B_R" });
    const eng = computeReflectionC2({
      co,
      c1,
      c3,
      tip,
      track: "T2B_R",
      manualHint: null,
    });
    expect(pol?.diagnostics.baseLaw).toBe("R0");
    expect(pol!.thetaOutDeg).toBeCloseTo(eng!.thetaOutDeg, 12);
    expect(pol!.diagnostics.angleRatioApplied).toBe(false);
  });

  it("short-rail C1_f tip=0 stays R0 bit-identical to no-reference", () => {
    const A = { x: -2.25, y: 36.125 };
    const B = { x: 75, y: FRAME_BOTTOM_Y };
    const H = physicalH(A, B, "B2T_R");
    const tip = { count: 0, side: "R" as const };
    const reference = c1fReference(A, B);
    expect(shouldApplyFrameProgressionR1b(reference)).toBe(false);

    const withRef = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 40, y: 40 },
      tip,
      track: "B2T_R",
      reference,
    });
    const without = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 40, y: 40 },
      tip,
      track: "B2T_R",
    });
    expect(withRef?.diagnostics.baseLaw).toBe("R0");
    expect(withRef!.thetaOutDeg).toBeCloseTo(without!.thetaOutDeg, 12);
    expect(withRef!.c2.x).toBeCloseTo(without!.c2.x, 12);
    expect(withRef!.c2.y).toBeCloseTo(without!.c2.y, 12);
    expect(withRef!.diagnostics.effectiveSpinCorrectionDeg).toBe(0);
    expect(withRef!.diagnostics.angleRatioApplied).toBe(false);
  });

  it("short-rail C1_f tip≠0: R0 base + K once (not full legacy spin)", () => {
    const A = { x: -2.25, y: 36.125 };
    const B = { x: 75, y: FRAME_BOTTOM_Y };
    const H = physicalH(A, B, "B2T_R");
    const tip = { count: 2, side: "R" as const };
    const reference = c1fReference(A, B);
    expect(shouldApplyFrameProgressionR1b(reference)).toBe(false);

    const withRef = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 40, y: 40 },
      tip,
      track: "B2T_R",
      reference,
    });
    const legacyFull = computeReflectionC2({
      co: A,
      c1: H,
      c3: { x: 40, y: 40 },
      tip,
      track: "B2T_R",
      manualHint: null,
    });
    const tip0 = computeReflectionC2({
      co: A,
      c1: H,
      c3: { x: 40, y: 40 },
      tip: { count: 0, side: "R" },
      track: "B2T_R",
      manualHint: null,
    });

    expect(withRef?.diagnostics.baseLaw).toBe("R0");
    expect(withRef!.diagnostics.baseThetaOutDeg).toBeCloseTo(
      tip0!.thetaOutDeg,
      12
    );
    expect(withRef!.diagnostics.angleRatioEligible).toBe(true);
    expect(withRef!.diagnostics.angleRatioApplied).toBe(true);
    expect(withRef!.diagnostics.angleRatioApplicationCount).toBe(1);
    const raw = withRef!.diagnostics.rawSpinCorrectionDeg!;
    const k = withRef!.diagnostics.angleRatioK!;
    expect(withRef!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
      raw * k,
      9
    );
    expect(withRef!.thetaOutDeg).toBeCloseTo(
      tip0!.thetaOutDeg + raw * k,
      9
    );
    // Must differ from unscaled full-spin R0 when |K|≠1 and |raw|>0
    if (Math.abs(k - 1) > 1e-9 && Math.abs(raw) > 1e-9) {
      expect(
        Math.abs(withRef!.thetaOutDeg - legacyFull!.thetaOutDeg)
      ).toBeGreaterThan(1e-6);
    }
  });
});
