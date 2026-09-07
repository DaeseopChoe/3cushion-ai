/**
 * Phase 1 — Mark reference provenance plumbing.
 * Provenance round-trip + B≠H invariants.
 * Phase 2A may change C2 when C1_f + parallel opposite applies (R1b);
 * C1_r / no-reference remain R0-identical.
 *
 * Run: npx vitest run src/domain/trajectory/markReferenceProvenance.phase1.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fiveHalfAnchors from "../../data/systems/5_half_system/anchors.json";
import { getAnchorCoordFromSys } from "../anchorLookupEngine";
import { getAnchorsForRendering } from "../anchorCoordinateEngine";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import {
  computeRailImpactPoint,
  normalizeAnchor,
  resolveAnchorPoint,
} from "../../utils/geometry/anchorResolve";
import { resolveReflectionC2 } from "./reflectionPolicy";
import { buildTrajectory } from "./trajectoryBuilder";

const EPS = 1e-9;

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

function expectSamePoint(
  a: { x: number; y: number } | null | undefined,
  b: { x: number; y: number } | null | undefined
) {
  expect(a).toBeTruthy();
  expect(b).toBeTruthy();
  expect(a!.x).toBeCloseTo(b!.x, 9);
  expect(a!.y).toBeCloseTo(b!.y, 9);
}

describe("Phase 1 Mark reference provenance — lookup L1", () => {
  it("5&1/2 CO_f / C1_f / C3_r retain sysFieldKey + valueSpace", () => {
    const track = "T2B_R";
    const co = getAnchorCoordFromSys({
      systemId: "5_half_system",
      track,
      mark: "CO",
      sysValue: 0,
      sysFieldKey: "CO_f",
    });
    const c1 = getAnchorCoordFromSys({
      systemId: "5_half_system",
      track,
      mark: "C1",
      sysValue: 40,
      sysFieldKey: "C1_f",
    });
    const c3 = getAnchorCoordFromSys({
      systemId: "5_half_system",
      track,
      mark: "C3",
      sysValue: 40,
      sysFieldKey: "C3_r",
    });

    expect(co?.sysFieldKey).toBe("CO_f");
    expect(co?.valueSpace).toBe("Fg");
    expect(c1?.sysFieldKey).toBe("C1_f");
    expect(c1?.valueSpace).toBe("Fg");
    expect(c3?.sysFieldKey).toBe("C3_r");
    expect(c3?.valueSpace).toBe("Rg");
  });

  it("getAnchorsForRendering preserves keyUsed as sysFieldKey (no C3_r→C3_f)", () => {
    const rendered = getAnchorsForRendering({
      systemId: "5_half_system",
      track: "T2B_R",
      sysValues: { CO_f: 0, C1_f: 40, C3_r: 40 },
      anchorsData: fiveHalfAnchors as never,
    });
    const co = rendered.CO as { sysFieldKey?: string; valueSpace?: string };
    const c1 = rendered.C1 as { sysFieldKey?: string; valueSpace?: string };
    const c3 = rendered.C3 as { sysFieldKey?: string; valueSpace?: string };
    expect(co.sysFieldKey).toBe("CO_f");
    expect(c1.sysFieldKey).toBe("C1_f");
    expect(c3.sysFieldKey).toBe("C3_r");
    expect(c3.sysFieldKey).not.toBe("C3_f");
  });

  it("C3_f systems keep _f (7_system formula family key)", () => {
    // Provenance is keyUsed from sysValues — not forced to Rail.
    const rendered = getAnchorsForRendering({
      systemId: "5_half_system",
      track: "B2T_L",
      sysValues: { CO_f: 30, C1_f: 20, C3_f: 10 },
      anchorsData: fiveHalfAnchors as never,
    });
    const c3 = rendered.C3 as { sysFieldKey?: string } | undefined;
    // If C3_f is present in candidates and chosen, key must stay C3_f.
    if (c3?.sysFieldKey) {
      expect(c3.sysFieldKey).toBe("C3_f");
    }
  });

  it("C1_r key is preserved when supplied (minus_5-style)", () => {
    const hit = getAnchorCoordFromSys({
      systemId: "5_half_system",
      track: "T2B_R",
      mark: "C1",
      sysValue: 40,
      sysFieldKey: "C1_r",
    });
    expect(hit?.sysFieldKey).toBe("C1_r");
    // _r forces Rg embedding when lookup started from Fg frame points
    expect(hit?.valueSpace).toBe("Rg");
  });
});

describe("Phase 1 normalizeAnchor L2 bypass", () => {
  it("preserves sysFieldKey + valueSpace; resolveAnchorPoint still returns Point only", () => {
    const n = normalizeAnchor({
      coord: { x: 40, y: -2.25 },
      valueSpace: "Fg",
      sysFieldKey: "C1_f",
    });
    expect(n?.sysFieldKey).toBe("C1_f");
    expect(n?.valueSpace).toBe("Fg");
    const p = resolveAnchorPoint(n);
    expect(p).toEqual({ x: 40, y: -2.25 });
    expect(p).not.toHaveProperty("sysFieldKey");
  });

  it("allows bare key / missing provenance without failure", () => {
    const n = normalizeAnchor({ coord: { x: 10, y: 0 } });
    expect(n?.sysFieldKey).toBeUndefined();
    expect(resolveAnchorPoint(n)).toEqual({ x: 10, y: 0 });
  });
});

describe("Phase 1 B vs H separation + reflection freeze", () => {
  it("Frame aim B differs from physical H; path bend uses H", () => {
    const track = "T2B_R";
    const coAim = { x: 0, y: 42.25 };
    const c1Aim = { x: 40, y: -2.25 };
    const H = computeRailImpactPoint(coAim, c1Aim, {
      track,
      mark: "C1",
      systemId: "5_half_system",
    });
    expect(H).toBeTruthy();
    expect(H!.y).toBeCloseTo(0, 6);
    // B ≠ H for Frame center aim
    expect(Math.hypot(H!.x - c1Aim.x, H!.y - c1Aim.y)).toBeGreaterThan(0.5);
  });

  it("resolveReflectionC2: C1_r reference → identical C2 to no-reference (R0 freeze)", () => {
    const co = { x: 20, y: 0 };
    const c1 = { x: 40, y: 0 };
    const c3 = { x: 60, y: 40 };
    const tip = null;
    const track = "T2B_R";

    const without = resolveReflectionC2({
      co,
      c1,
      c3,
      tip,
      track,
      manualHint: null,
      systemId: "5_half_system",
    });
    const withRef = resolveReflectionC2({
      co,
      c1,
      c3,
      tip,
      track,
      manualHint: null,
      systemId: "5_half_system",
      reference: {
        co: { point: { x: 0, y: 42.25 }, sysFieldKey: "CO_f", valueSpace: "Fg" },
        c1Aim: {
          point: { x: 40, y: -2.25 },
          sysFieldKey: "C1_r",
          valueSpace: "Rg",
        },
        c3: { point: c3, sysFieldKey: "C3_r", valueSpace: "Rg" },
      },
    });

    expect(without).toBeTruthy();
    expect(withRef).toBeTruthy();
    expect(withRef!.diagnostics.baseLaw).toBe("R0");
    expectSamePoint(without!.c2, withRef!.c2);
    expect(without!.thetaInDeg).toBeCloseTo(withRef!.thetaInDeg, 12);
    expect(without!.thetaOutDeg).toBeCloseTo(withRef!.thetaOutDeg, 12);
    expect(without!.c2Rail).toBe(withRef!.c2Rail);
    expect(Math.abs(without!.thetaOutDeg - withRef!.thetaOutDeg)).toBeLessThan(
      EPS
    );
  });

  it("Native Rail / no-reference path still resolves", () => {
    const reflected = resolveReflectionC2({
      co: { x: 10, y: 0 },
      c1: { x: 50, y: 0 },
      c3: { x: 70, y: 40 },
      tip: { count: 0, side: "R" },
      track: "B2T_L",
    });
    expect(reflected?.c2).toBeTruthy();
  });
});

describe("Phase 1 buildTrajectory markReference + golden C2", () => {
  const resolveAnchorCtx = {
    track: "T2B_R",
    systemId: "5_half_system",
  };

  function rawFiveHalf() {
    return {
      CO: {
        coord: { x: 0, y: 42.25 },
        valueSpace: "Fg" as const,
        sysFieldKey: "CO_f",
      },
      C1: {
        coord: { x: 40, y: -2.25 },
        valueSpace: "Fg" as const,
        sysFieldKey: "C1_f",
      },
      C3: {
        coord: { x: 37, y: 40 },
        valueSpace: "Rg" as const,
        sysFieldKey: "C3_r",
      },
    };
  }

  function minimalBuild(rawAnchors: Record<string, unknown>, c2?: unknown) {
    const anchors = c2
      ? { ...rawAnchors, C2: c2 }
      : { ...rawAnchors };
    return buildTrajectory({
      anchors,
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
  }

  it("exposes CO_f / C1_f / C3_r on meta.markReference; B≠H", () => {
    const raw = rawFiveHalf();
    const result = minimalBuild(raw);
    const mr = result.meta.markReference;
    expect(mr?.co?.sysFieldKey).toBe("CO_f");
    expect(mr?.co?.valueSpace).toBe("Fg");
    expect(mr?.c1Aim?.sysFieldKey).toBe("C1_f");
    expect(mr?.c1Aim?.valueSpace).toBe("Fg");
    expect(mr?.c3?.sysFieldKey).toBe("C3_r");
    expect(mr?.c3?.valueSpace).toBe("Rg");

    expect(result.meta.c1Prep).toEqual(raw.C1.coord);
    expect(result.meta.c1Rail).toBeTruthy();
    expect(result.meta.c1Rail!.y).toBeCloseTo(0, 6);
    expect(
      Math.hypot(
        result.meta.c1Rail!.x - raw.C1.coord.x,
        result.meta.c1Rail!.y - raw.C1.coord.y
      )
    ).toBeGreaterThan(0.5);

    // path bend = H
    expect(result.corrected.pathNodes[1]).toEqual(result.meta.c1Rail);
  });

  it("C1_r keeps R0; C1_f may use R1b (Phase 2A) when geometry identical", () => {
    const base = rawFiveHalf();
    const asF = minimalBuild(base);
    const asR = minimalBuild({
      ...base,
      C1: {
        coord: { x: 40, y: -2.25 },
        // Same Frame embedding coords; key alone selects R0 vs R1b gate.
        valueSpace: "Fg" as const,
        sysFieldKey: "C1_r",
      },
    });
    expect(asR.meta.markReference?.c1Aim?.sysFieldKey).toBe("C1_r");
    expect(asR.meta.reflectedDiagnostics?.baseLaw).toBe("R0");
    // Parallel C1_f fixture opts into R1b — C2 may differ from C1_r R0.
    if (asF.meta.reflectedDiagnostics?.baseLaw === "R1b") {
      const c2f = asF.corrected.pathNodes[2]!;
      const c2r = asR.corrected.pathNodes[2]!;
      expect(
        Math.hypot(c2f.x - c2r.x, c2f.y - c2r.y)
      ).toBeGreaterThan(1e-6);
    }
  });

  it("manual C2 override still bypasses reflection", () => {
    const raw = rawFiveHalf();
    const override = { x: 55, y: 40 };
    const result = minimalBuild(raw, override);
    expect(result.corrected.pathNodes[2]).toBeTruthy();
    // firstRailHitTowardTarget may snap; override present means no auto reflection bag required
    expect(result.meta.reflectedDiagnostics).toBeNull();
  });

  it("four-track: markReference keys stable under same sysValues shape", () => {
    for (const track of ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const) {
      const rendered = getAnchorsForRendering({
        systemId: "5_half_system",
        track,
        sysValues: { CO_f: 25, C1_f: 40, C3_r: 30 },
        anchorsData: fiveHalfAnchors as never,
      });
      expect((rendered.CO as { sysFieldKey?: string }).sysFieldKey).toBe("CO_f");
      expect((rendered.C1 as { sysFieldKey?: string }).sysFieldKey).toBe("C1_f");
      expect((rendered.C3 as { sysFieldKey?: string }).sysFieldKey).toBe("C3_r");
    }
  });
});
