/**
 * Phase 2A — R1b destination-preserving Frame progression.
 * Parallel opposite-Frame only; short-rail / C1_r / native stay R0.
 *
 * Run: npx vitest run src/domain/trajectory/frameProgressionReflection.phase2a.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fiveHalfAnchors from "../../data/systems/5_half_system/anchors.json";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import {
  computeRailImpactPoint,
  normalizeAnchor,
} from "../../utils/geometry/anchorResolve";
import { transformPoint } from "../family/trackSymmetry";
import { angleDeg, computeReflectionC2 } from "../reflectionEngine";
import {
  computeFrameProgressionR1b,
  isC1FrameAimProvenance,
  resolveParallelOppositeFrame,
  FRAME_BOTTOM_Y,
  FRAME_TOP_Y,
} from "./frameProgressionReflection";
import {
  resolveReflectionC2,
  shouldApplyFrameProgressionR1b,
  type ReflectionMarkReference,
} from "./reflectionPolicy";
import { buildTrajectory } from "./trajectoryBuilder";

const TOL = 1e-6;
const GEOM_TOL = 0.05;

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

/** Longitudinal Frame progression fixtures (geometry coords, NOT sys arithmetic). */
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
  });
}

function c1fReference(
  A: { x: number; y: number },
  B: { x: number; y: number },
  c3 = { x: 40, y: 40 }
): ReflectionMarkReference {
  return {
    co: { point: A, sysFieldKey: "CO_f", valueSpace: "Fg" },
    c1Aim: { point: B, sysFieldKey: "C1_f", valueSpace: "Fg" },
    c3: { point: c3, sysFieldKey: "C3_r", valueSpace: "Rg" },
  };
}

describe("Phase 2A helper — R1b geometry (no sys conversion)", () => {
  it.each(PROGRESSIONS)(
    "$name: D_∥ = 2B_∥ − A_∥ on opposite Frame",
    ({ A_par, B_par, D_par }) => {
      const { A, B } = frameAB(A_par, B_par);
      const H = physicalH(A, B);
      expect(H).toBeTruthy();
      const r1b = computeFrameProgressionR1b({ A, B, H: H! });
      expect(r1b).toBeTruthy();
      expect(r1b!.D.x).toBeCloseTo(D_par, 9);
      expect(r1b!.D.y).toBeCloseTo(FRAME_TOP_Y, 9);
      expect(r1b!.R.x).toBeCloseTo(B.x, 9);
      expect(r1b!.R.y).toBeCloseTo(0, 9);
      expect(r1b!.thetaOutDeg).toBeCloseTo(angleDeg(H!, r1b!.D), 12);
      // R is projection only — not a Mark/sys rewrite of B
      expect(B.y).toBe(FRAME_BOTTOM_Y);
      expect(r1b!.R.y).not.toBe(B.y);
    }
  );

  it("parallel opposite gate true for TOP↔BOTTOM; false for short-rail mix", () => {
    expect(
      resolveParallelOppositeFrame(
        { x: 0, y: FRAME_TOP_Y },
        { x: 40, y: FRAME_BOTTOM_Y }
      )
    ).toBeTruthy();
    expect(
      resolveParallelOppositeFrame(
        { x: -2.25, y: 36.125 },
        { x: 75, y: FRAME_BOTTOM_Y }
      )
    ).toBeNull();
  });

  it("isC1FrameAimProvenance: C1_f yes, C1_r / bare no", () => {
    expect(
      isC1FrameAimProvenance({
        sysFieldKey: "C1_f",
        valueSpace: "Fg",
      })
    ).toBe(true);
    expect(
      isC1FrameAimProvenance({
        sysFieldKey: "C1_r",
        valueSpace: "Rg",
      })
    ).toBe(false);
    expect(isC1FrameAimProvenance({ valueSpace: "Fg" })).toBe(false);
  });
});

describe("Phase 2A policy gate + H invariant", () => {
  it.each(PROGRESSIONS)(
    "$name: R1b C2; path bend stays H; outgoing ≈ H→D",
    ({ A_par, B_par, D_par }) => {
      const { A, B } = frameAB(A_par, B_par);
      const H = physicalH(A, B)!;
      const c3 = { x: 37, y: 40 };
      const reference = c1fReference(A, B, c3);

      expect(shouldApplyFrameProgressionR1b(reference)).toBe(true);

      const r0 = computeReflectionC2({
        co: A,
        c1: H,
        c3,
        tip: { count: 0, side: "R" },
        track: "T2B_R",
        manualHint: null,
      });
      const r1bPolicy = resolveReflectionC2({
        co: A,
        c1: H,
        c3,
        tip: { count: 0, side: "R" },
        track: "T2B_R",
        manualHint: null,
        reference,
      });

      expect(r1bPolicy).toBeTruthy();
      expect(r1bPolicy!.diagnostics.baseLaw).toBe("R1b");
      expect(r1bPolicy!.diagnostics.c1Rail).toBe("BOTTOM");
      expect(r1bPolicy!.spinAdjustDeg).toBe(0);

      const geom = computeFrameProgressionR1b({ A, B, H })!;
      expect(geom.D.x).toBeCloseTo(D_par, 9);
      expect(r1bPolicy!.thetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 9);

      // Physical bend input unchanged — C2 is from H, not B/R/D
      expect(H.y).toBeCloseTo(0, 6);
      expect(Math.hypot(H.x - B.x, H.y - B.y)).toBeGreaterThan(0.5);
      expect(Math.hypot(r1bPolicy!.c2.x - B.x, r1bPolicy!.c2.y - B.y)).toBeGreaterThan(
        TOL
      );

      // Destination progression: C2 is TOP-rail hit of H→D (not Frame D y)
      expect(r1bPolicy!.c2Rail).toBe("TOP");
      expect(r1bPolicy!.c2.y).toBeCloseTo(40, 6);
      // Longitudinal trends toward D_par (rail clip shifts x slightly vs Frame D)
      expect(Math.abs(r1bPolicy!.c2.x - D_par)).toBeLessThan(3);

      // Differs from legacy R0 for these Frame fixtures
      expect(r0).toBeTruthy();
      expect(
        Math.hypot(r1bPolicy!.c2.x - r0!.c2.x, r1bPolicy!.c2.y - r0!.c2.y)
      ).toBeGreaterThan(GEOM_TOL);
    }
  );

  it("short-rail / perpendicular: gate false → R0 identical", () => {
    const A = { x: -2.25, y: 36.125 };
    const B = { x: 75, y: FRAME_BOTTOM_Y };
    const H = physicalH(A, B, "B2T_R")!;
    const c3 = { x: 40, y: 40 };
    const reference = c1fReference(A, B, c3);

    expect(shouldApplyFrameProgressionR1b(reference)).toBe(false);

    const without = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip: { count: 0, side: "R" },
      track: "B2T_R",
    });
    const withRef = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip: { count: 0, side: "R" },
      track: "B2T_R",
      reference,
    });
    expect(withRef?.diagnostics.baseLaw).toBe("R0");
    expect(withRef!.c2.x).toBeCloseTo(without!.c2.x, 9);
    expect(withRef!.c2.y).toBeCloseTo(without!.c2.y, 9);
    expect(withRef!.thetaOutDeg).toBeCloseTo(without!.thetaOutDeg, 12);
  });

  it("C1_r: gate false → R0 bit-identical vs no-reference", () => {
    const { A, B } = frameAB(0, 40);
    const H = physicalH(A, B)!;
    const c3 = { x: 37, y: 40 };
    const reference: ReflectionMarkReference = {
      co: { point: A, sysFieldKey: "CO_f", valueSpace: "Fg" },
      c1Aim: { point: B, sysFieldKey: "C1_r", valueSpace: "Rg" },
      c3: { point: c3, sysFieldKey: "C3_r", valueSpace: "Rg" },
    };
    expect(shouldApplyFrameProgressionR1b(reference)).toBe(false);

    const without = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip: null,
      track: "T2B_R",
    });
    const withR = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip: null,
      track: "T2B_R",
      reference,
    });
    expect(withR?.diagnostics.baseLaw).toBe("R0");
    expect(withR!.c2.x).toBeCloseTo(without!.c2.x, 12);
    expect(withR!.c2.y).toBeCloseTo(without!.c2.y, 12);
    expect(withR!.thetaOutDeg).toBeCloseTo(without!.thetaOutDeg, 12);
  });

  it("Native / no-reference stays R0", () => {
    const result = resolveReflectionC2({
      co: { x: 10, y: 0 },
      c1: { x: 50, y: 0 },
      c3: { x: 70, y: 40 },
      tip: { count: 0, side: "R" },
      track: "B2T_L",
    });
    expect(result?.diagnostics.baseLaw).toBe("R0");
  });

  it("C3_r / C3_f provenance unused for R1b θ; keys preserved on bag", () => {
    const { A, B } = frameAB(8, 4);
    const H = physicalH(A, B)!;
    const c3 = { x: 20, y: 40 };
    const refR = c1fReference(A, B, c3);
    refR.c3 = { point: c3, sysFieldKey: "C3_r", valueSpace: "Rg" };
    const refF = {
      ...refR,
      c3: { point: c3, sysFieldKey: "C3_f", valueSpace: "Fg" },
    };
    const a = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip: { count: 0, side: "R" },
      track: "T2B_R",
      reference: refR,
    });
    const b = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip: { count: 0, side: "R" },
      track: "T2B_R",
      reference: refF,
    });
    expect(a!.thetaOutDeg).toBeCloseTo(b!.thetaOutDeg, 12);
    expect(a!.c2.x).toBeCloseTo(b!.c2.x, 9);
    expect(refR.c3?.sysFieldKey).toBe("C3_r");
    expect(refF.c3?.sysFieldKey).toBe("C3_f");
  });

  it("tip=0: no spin adjust; no K(theta)", () => {
    const { A, B } = frameAB(6, 4);
    const H = physicalH(A, B)!;
    const out = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip: { count: 0, side: "R" },
      track: "T2B_R",
      reference: c1fReference(A, B),
    });
    expect(out!.spinAdjustDeg).toBe(0);
    const geom = computeFrameProgressionR1b({ A, B, H })!;
    expect(out!.thetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 12);
  });
});

describe("Phase 2A opposite track / H/V/RPI symmetry", () => {
  it("sys unchanged; coordinates transform only — R1b D_∥ matches", () => {
    const { A, B } = frameAB(8, 4);
    const base = computeFrameProgressionR1b({
      A,
      B,
      H: physicalH(A, B)!,
    })!;

    for (const op of ["H", "V", "RPI"] as const) {
      const At = transformPoint(op, A);
      const Bt = transformPoint(op, B);
      // Frame y after V/RPI lands on opposite Frame; helper still classifies.
      const Ht = physicalH(At, Bt)!;
      const r1b = computeFrameProgressionR1b({ A: At, B: Bt, H: Ht });
      expect(r1b).toBeTruthy();
      const Dt = transformPoint(op, base.D);
      expect(r1b!.D.x).toBeCloseTo(Dt.x, 6);
      expect(r1b!.D.y).toBeCloseTo(Dt.y, 6);
    }
  });
});

describe("Phase 2A buildTrajectory integration", () => {
  const resolveAnchorCtx = {
    track: "T2B_R",
    systemId: "5_half_system",
  };

  it("C1_f parallel: pathNodes[1]=H; C2 follows R1b; provenance round-trip", () => {
    const A = { x: 0, y: FRAME_TOP_Y };
    const B = { x: 40, y: FRAME_BOTTOM_Y };
    const rawAnchors = {
      CO: { coord: A, valueSpace: "Fg" as const, sysFieldKey: "CO_f" },
      C1: { coord: B, valueSpace: "Fg" as const, sysFieldKey: "C1_f" },
      C3: {
        coord: { x: 37, y: 40 },
        valueSpace: "Rg" as const,
        sysFieldKey: "C3_r",
      },
    };
    const result = buildTrajectory({
      anchors: rawAnchors,
      anchorsBase: null,
      rawAnchors,
      resolveAnchorCtx,
      balls: {
        cue: { x: 20, y: 10 },
        target: { x: 40, y: 20 },
        second: { x: 60, y: 20 },
      },
      hitTolerance: 2,
      ballDiameterRg: 1.6,
      ballRadiusRg: 0.8,
    });

    expect(result.meta.markReference?.c1Aim?.sysFieldKey).toBe("C1_f");
    expect(result.meta.c1Rail).toBeTruthy();
    expect(result.corrected.pathNodes[1]).toEqual(result.meta.c1Rail);
    expect(result.meta.reflectedDiagnostics?.baseLaw).toBe("R1b");

    const H = result.meta.c1Rail!;
    const geom = computeFrameProgressionR1b({ A, B, H })!;
    expect(geom.D.x).toBeCloseTo(80, 9);
    const c2 = result.corrected.pathNodes[2]!;
    expect(c2.y).toBeCloseTo(40, 5);
    // Physical C2 is rail hit of H→D (TOP y=40), not Frame D itself (y=42.25).
    const expected = resolveReflectionC2({
      co: A,
      c1: H,
      c3: { x: 37, y: 40 },
      tip: { count: 0, side: "R" },
      track: "T2B_R",
      reference: {
        co: { point: A, sysFieldKey: "CO_f", valueSpace: "Fg" },
        c1Aim: { point: B, sysFieldKey: "C1_f", valueSpace: "Fg" },
        c3: { point: { x: 37, y: 40 }, sysFieldKey: "C3_r", valueSpace: "Rg" },
      },
    });
    expect(c2.x).toBeCloseTo(expected!.c2.x, 5);
    expect(c2.x).toBeGreaterThan(75);
    expect(Math.abs(c2.x - 80)).toBeLessThan(5);
  });

  it("manual C2 override still bypasses R1b", () => {
    const rawAnchors = {
      CO: {
        coord: { x: 0, y: FRAME_TOP_Y },
        valueSpace: "Fg" as const,
        sysFieldKey: "CO_f",
      },
      C1: {
        coord: { x: 40, y: FRAME_BOTTOM_Y },
        valueSpace: "Fg" as const,
        sysFieldKey: "C1_f",
      },
      C3: {
        coord: { x: 37, y: 40 },
        valueSpace: "Rg" as const,
        sysFieldKey: "C3_r",
      },
      C2: { x: 55, y: 40 },
    };
    const result = buildTrajectory({
      anchors: rawAnchors,
      anchorsBase: null,
      rawAnchors,
      resolveAnchorCtx,
      balls: {
        cue: { x: 20, y: 10 },
        target: { x: 40, y: 20 },
        second: { x: 60, y: 20 },
      },
      hitTolerance: 2,
      ballDiameterRg: 1.6,
      ballRadiusRg: 0.8,
    });
    expect(result.meta.reflectedDiagnostics).toBeNull();
    expect(result.corrected.pathNodes[2]).toBeTruthy();
  });

  it("normalizeAnchor still preserves C3 keys (no conversion)", () => {
    const n = normalizeAnchor({
      coord: { x: 10, y: 0 },
      valueSpace: "Rg",
      sysFieldKey: "C3_r",
    });
    expect(n?.sysFieldKey).toBe("C3_r");
  });
});
