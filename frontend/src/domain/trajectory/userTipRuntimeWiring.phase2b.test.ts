/**
 * USER tip override → R1b / Phase 2B K path (tip=0 invariant + tip>0 scaling).
 * Does not change q/K/R1b math — only proves tip wiring into policy.
 *
 * Run: npx vitest run src/domain/trajectory/userTipRuntimeWiring.phase2b.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fiveHalfAnchors from "../../data/systems/5_half_system/anchors.json";
import { computeRailImpactPoint } from "../../utils/geometry/anchorResolve";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import { resolveCurrentTipWithUserOverride } from "../userRuntimeTipOverride";
import { resolveAngleRatioK } from "./angleRatioCalibration";
import {
  FRAME_BOTTOM_Y,
  FRAME_TOP_Y,
  computeFrameProgressionR1b,
} from "./frameProgressionReflection";
import { resolveReflectionC2 } from "./reflectionPolicy";

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

const A = { x: 0, y: FRAME_TOP_Y };
const B = { x: 60, y: FRAME_BOTTOM_Y };

function fixture() {
  const H = computeRailImpactPoint(A, B, {
    track: "T2B_R",
    mark: "C1",
    systemId: "5_half_system",
  })!;
  const c3 = { x: 37, y: 40 };
  const reference = {
    co: { point: A, sysFieldKey: "CO_f" as const, valueSpace: "Fg" as const },
    c1Aim: { point: B, sysFieldKey: "C1_f" as const, valueSpace: "Fg" as const },
    c3: { point: c3, sysFieldKey: "C3_r" as const, valueSpace: "Rg" as const },
  };
  return { H, c3, reference };
}

describe("USER tip wiring → Phase 2B path", () => {
  it("F: tip=0 override → finalTheta == Phase 2A base", () => {
    const { H, c3, reference } = fixture();
    const tip = resolveCurrentTipWithUserOverride({
      baseHpt: {
        hit_point: { x: 2, y: 0 },
        mode: "TIP",
        tipCount: 3,
      },
      userTipCountOverride: 0,
    });
    expect(tip).toEqual({ count: 0, side: "R" });

    const out = resolveReflectionC2({
      co: A,
      c1: H,
      c3,
      tip,
      track: "T2B_R",
      reference,
    });
    const geom = computeFrameProgressionR1b({ A, B, H })!;
    expect(out?.diagnostics.baseLaw).toBe("R1b");
    expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBe(0);
    expect(out!.thetaOutDeg).toBeCloseTo(geom.thetaOutDeg, 12);
    expect(out!.diagnostics.finalThetaOutDeg).toBeCloseTo(
      out!.diagnostics.baseThetaOutDeg!,
      12
    );
  });

  it("G–H: q≥6 → K=0.50; tip>0 effective = raw × K (K constant across tips)", () => {
    // Controlled geometry: B.x=60, H.x=53.7 → q≈6.3 (same R1b A/B Frame pair for gate)
    const H = { x: 53.7, y: 0 };
    const c3 = { x: 37, y: 40 };
    const reference = {
      co: { point: A, sysFieldKey: "CO_f" as const, valueSpace: "Fg" as const },
      c1Aim: { point: B, sysFieldKey: "C1_f" as const, valueSpace: "Fg" as const },
      c3: { point: c3, sysFieldKey: "C3_r" as const, valueSpace: "Rg" as const },
    };
    const q = Math.abs(B.x - H.x);
    expect(q).toBeCloseTo(6.3, 9);
    const K = resolveAngleRatioK(q);
    expect(K).toBeCloseTo(0.5, 9);

    const ks: number[] = [];
    for (const n of [1, 2, 3, 4] as const) {
      const tip = resolveCurrentTipWithUserOverride({
        baseHpt: {
          hit_point: { x: 2, y: 0 },
          mode: "TIP",
          tipCount: 0,
        },
        userTipCountOverride: n,
      });
      expect(tip?.count).toBe(n);

      const out = resolveReflectionC2({
        co: A,
        c1: H,
        c3,
        tip,
        track: "T2B_R",
        reference,
      });
      expect(out!.diagnostics.angleRatioK).toBeCloseTo(K, 9);
      ks.push(out!.diagnostics.angleRatioK!);
      expect(out!.diagnostics.effectiveSpinCorrectionDeg).toBeCloseTo(
        out!.diagnostics.rawSpinCorrectionDeg! * K,
        9
      );
    }
    expect(new Set(ks.map((k) => k.toFixed(12))).size).toBe(1);
  });

  it("I: ADMIN path — null override leaves hydrated tipCount", () => {
    const tip = resolveCurrentTipWithUserOverride({
      baseHpt: {
        hit_point: { x: 1, y: 0 },
        mode: "TIP",
        tipCount: 2,
      },
      userTipCountOverride: null,
    });
    expect(tip).toEqual({ count: 2, side: "R" });
  });
});
