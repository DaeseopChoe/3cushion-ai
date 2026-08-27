import { describe, expect, it } from "vitest";
import {
  IMPACT_GEOMETRY_EPSILON_RG,
  resolveActiveImpactForPrecision,
  resolveImpactThroughMark,
  validateImpactSourceConsistency,
  type ImpactThroughMarkInput,
} from "./baselineImpactSnap";
import {
  resolveMarkAxisLockForAxis,
  type MarkAxisLock,
} from "./baselineMarkAxisSnap";

const RgHorizontal: MarkAxisLock = {
  rail: "BOTTOM",
  varying: "x",
  constantAxis: "y",
  constantValue: 0,
  varyMin: 0,
  varyMax: 80,
};

const FgHorizontal: MarkAxisLock = {
  rail: "BOTTOM",
  varying: "x",
  constantAxis: "y",
  constantValue: -2.25,
  varyMin: -2.25,
  varyMax: 82.25,
};

const RgVertical: MarkAxisLock = {
  rail: "RIGHT",
  varying: "y",
  constantAxis: "x",
  constantValue: 80,
  varyMin: 0,
  varyMax: 40,
};

function resolve(input: Partial<ImpactThroughMarkInput>) {
  return resolveImpactThroughMark({
    movingMark: "CO",
    fixedCoord: { x: 20, y: 10 },
    impactCoord: { x: 40, y: 5 },
    allowedAxis: RgHorizontal,
    ...input,
  });
}

describe("resolveImpactThroughMark", () => {
  it("computes a normal horizontal-axis intersection", () => {
    expect(
      resolve({
        fixedCoord: { x: 20, y: 10 },
        impactCoord: { x: 40, y: 5 },
        allowedAxis: RgHorizontal,
      })
    ).toEqual({ x: 60, y: 0 });
  });

  it("computes a normal vertical-axis intersection", () => {
    expect(
      resolve({
        impactCoord: { x: 40, y: 20 },
        allowedAxis: RgVertical,
      })
    ).toEqual({ x: 80, y: 40 });
  });

  it("supports a moving CO with a fixed C1", () => {
    expect(
      resolve({
        movingMark: "CO",
        allowedAxis: RgHorizontal,
      })
    ).toEqual({ x: 60, y: 0 });
  });

  it("supports a moving C1 with a fixed CO", () => {
    expect(
      resolve({
        movingMark: "C1",
        impactCoord: { x: 40, y: 20 },
        allowedAxis: RgVertical,
      })
    ).toEqual({ x: 80, y: 40 });
  });

  it("returns a candidate ordered as candidate → Impact → fixed", () => {
    const candidate = resolve({
      allowedAxis: RgHorizontal,
    });
    expect(candidate).toEqual({ x: 60, y: 0 });
    expect(candidate!.x).toBeGreaterThan(40);
    expect(40).toBeGreaterThan(20);
  });

  it("requires Impact to be between candidate and fixed", () => {
    expect(
      resolve({
        fixedCoord: { x: 20, y: -10 },
        impactCoord: { x: 40, y: 10 },
        allowedAxis: RgHorizontal,
      })
    ).toBeNull();
  });

  it("fails for a parallel moving axis", () => {
    expect(
      resolve({
        impactCoord: { x: 40, y: 10 },
        allowedAxis: RgHorizontal,
      })
    ).toBeNull();
  });

  it("fails for a coincident line and axis", () => {
    expect(
      resolve({
        fixedCoord: { x: 20, y: 0 },
        impactCoord: { x: 40, y: 0 },
        allowedAxis: RgHorizontal,
      })
    ).toBeNull();
  });

  it("fails when fixed and Impact are identical", () => {
    expect(
      resolve({
        impactCoord: { x: 20, y: 10 },
      })
    ).toBeNull();
  });

  it("fails when the candidate is outside the axis domain", () => {
    expect(
      resolve({
        impactCoord: { x: 60, y: 5 },
        allowedAxis: RgHorizontal,
      })
    ).toBeNull();
  });

  it("fails for opposite-side extrapolation", () => {
    expect(
      resolve({
        allowedAxis: { ...RgHorizontal, constantValue: 15 },
      })
    ).toBeNull();
  });

  it("fails for NaN coordinates", () => {
    expect(
      resolve({
        fixedCoord: { x: Number.NaN, y: 10 },
      })
    ).toBeNull();
  });

  it("fails for Infinity coordinates", () => {
    expect(
      resolve({
        impactCoord: { x: Number.POSITIVE_INFINITY, y: 20 },
      })
    ).toBeNull();
  });

  it("fails for an invalid moving Mark", () => {
    expect(
      resolve({
        movingMark: "C2" as "CO",
      })
    ).toBeNull();
  });

  it("fails when the allowed axis descriptor is missing", () => {
    expect(resolve({ allowedAxis: null })).toBeNull();
  });

  it("uses the canonical Fg axis/domain contract", () => {
    const axis = resolveMarkAxisLockForAxis({ x: 40, y: -2.25 }, "x");
    expect(axis).not.toBeNull();
    expect(
      resolve({
        allowedAxis: axis,
        fixedCoord: { x: 20, y: 10 },
        impactCoord: { x: 40, y: 0 },
      })
    ).toEqual({ x: 44.5, y: -2.25 });
  });

  it("uses the canonical Rg axis/domain contract", () => {
    const axis = resolveMarkAxisLockForAxis({ x: 80, y: 20 }, "y");
    expect(axis).not.toBeNull();
    expect(
      resolve({
        allowedAxis: axis,
        impactCoord: { x: 40, y: 20 },
      })
    ).toEqual({ x: 80, y: 40 });
  });

  it("keeps the numerical tolerance small and explicit", () => {
    expect(IMPACT_GEOMETRY_EPSILON_RG).toBeLessThan(1e-6);
  });
});

describe("resolveActiveImpactForPrecision", () => {
  it("uses the visible CONTACT calculation as the active source", () => {
    expect(
      resolveActiveImpactForPrecision({
        impactMode: "CONTACT",
        contactVisibleImpactRg: { x: 12, y: 18 },
        trajectoryContactImpactRg: { x: 12, y: 18 },
      })
    ).toEqual({ x: 12, y: 18 });
  });

  it("uses stored FREE Impact before the calculated fallback", () => {
    expect(
      resolveActiveImpactForPrecision({
        impactMode: "FREE",
        freeStoredImpactRg: { x: 22, y: 28 },
        freeCalculatedFallbackImpactRg: { x: 12, y: 18 },
      })
    ).toEqual({ x: 22, y: 28 });
  });

  it("uses the FREE calculated fallback when no stored Impact exists", () => {
    expect(
      resolveActiveImpactForPrecision({
        impactMode: "FREE",
        freeStoredImpactRg: null,
        freeCalculatedFallbackImpactRg: { x: 12, y: 18 },
      })
    ).toEqual({ x: 12, y: 18 });
  });

  it("fails when the required visible source is missing", () => {
    expect(
      resolveActiveImpactForPrecision({
        impactMode: "CONTACT",
      })
    ).toBeNull();
  });

  it("fails for a non-finite visible source", () => {
    expect(
      resolveActiveImpactForPrecision({
        impactMode: "FREE",
        freeStoredImpactRg: { x: Number.NaN, y: 18 },
        freeCalculatedFallbackImpactRg: { x: 12, y: 18 },
      })
    ).toBeNull();
  });

  it("fails closed when an equivalent trajectory source mismatches", () => {
    expect(
      resolveActiveImpactForPrecision({
        impactMode: "CONTACT",
        contactVisibleImpactRg: { x: 12, y: 18 },
        trajectoryContactImpactRg: { x: 12.01, y: 18 },
      })
    ).toBeNull();
  });

  it("validates equivalent sources within tolerance", () => {
    expect(
      validateImpactSourceConsistency(
        { x: 12, y: 18 },
        { x: 12 + 5e-7, y: 18 }
      )
    ).toBe(true);
    expect(
      validateImpactSourceConsistency(
        { x: 12, y: 18 },
        { x: 12 + 2e-6, y: 18 }
      )
    ).toBe(false);
  });

  it("fails consistency validation for missing or non-finite sources", () => {
    expect(validateImpactSourceConsistency(null, { x: 1, y: 2 })).toBe(false);
    expect(
      validateImpactSourceConsistency(
        { x: 1, y: 2 },
        { x: Number.POSITIVE_INFINITY, y: 2 }
      )
    ).toBe(false);
  });
});

