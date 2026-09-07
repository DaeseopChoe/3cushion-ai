/**
 * USER runtime tip override — Phase 2B calibration enablement.
 * Run: npx vitest run src/domain/userRuntimeTipOverride.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  clampUserRuntimeTipCount,
  resolveCurrentTipWithUserOverride,
  resolveTipFromHpt,
} from "./userRuntimeTipOverride";
import { hasNonZeroTipSpin } from "./trajectory/reflectionPolicy";

describe("clampUserRuntimeTipCount", () => {
  it.each([0, 1, 2, 3, 4] as const)("accepts %i", (n) => {
    expect(clampUserRuntimeTipCount(n)).toBe(n);
  });

  it("rejects invalid", () => {
    expect(clampUserRuntimeTipCount(-1)).toBeNull();
    expect(clampUserRuntimeTipCount(5)).toBeNull();
    expect(clampUserRuntimeTipCount(Number.NaN)).toBeNull();
    expect(clampUserRuntimeTipCount(null)).toBeNull();
    expect(clampUserRuntimeTipCount(undefined)).toBeNull();
  });

  it("rounds to nearest int in range", () => {
    expect(clampUserRuntimeTipCount(1.4)).toBe(1);
    expect(clampUserRuntimeTipCount(2.6)).toBe(3);
  });
});

describe("resolveCurrentTipWithUserOverride", () => {
  const baseHpt = {
    hit_point: { x: 2, y: 0 },
    mode: "TIP" as const,
    tipCount: 0,
  };

  it("A–E: USER tip 0..4 → engine tipCount 0..4", () => {
    for (const n of [0, 1, 2, 3, 4] as const) {
      const tip = resolveCurrentTipWithUserOverride({
        baseHpt,
        userTipCountOverride: n,
      });
      expect(tip).toEqual({ count: n, side: "R" });
      expect(hasNonZeroTipSpin(tip)).toBe(n > 0);
    }
  });

  it("override null → same as hydrated tipCount (no mutation of base)", () => {
    const hydrated = { ...baseHpt, tipCount: 3 };
    const without = resolveTipFromHpt(hydrated);
    const withNull = resolveCurrentTipWithUserOverride({
      baseHpt: hydrated,
      userTipCountOverride: null,
    });
    expect(withNull).toEqual(without);
    expect(withNull).toEqual({ count: 3, side: "R" });
    expect(hydrated.tipCount).toBe(3);
  });

  it("override does not mutate persisted HPT object", () => {
    const persisted = {
      hit_point: { x: -1.5, y: 0.2 },
      mode: "TIP" as const,
      tipCount: 2,
    };
    const snap = JSON.stringify(persisted);
    resolveCurrentTipWithUserOverride({
      baseHpt: persisted,
      userTipCountOverride: 4,
    });
    expect(JSON.stringify(persisted)).toBe(snap);
    expect(persisted.tipCount).toBe(2);
  });

  it("L side from negative hit_point.x", () => {
    const tip = resolveCurrentTipWithUserOverride({
      baseHpt: {
        hit_point: { x: -2, y: 0 },
        mode: "TIP",
        tipCount: 0,
      },
      userTipCountOverride: 1,
    });
    expect(tip).toEqual({ count: 1, side: "L" });
  });

  it("SPIN hydrated base: override forces TIP count (not hp hypot)", () => {
    const tip = resolveCurrentTipWithUserOverride({
      baseHpt: {
        hit_point: { x: 3, y: 1 },
        mode: "SPIN",
        tipCount: 0,
      },
      userTipCountOverride: 2,
    });
    expect(tip).toEqual({ count: 2, side: "R" });
    expect(tip).not.toHaveProperty("hp");
  });
});
