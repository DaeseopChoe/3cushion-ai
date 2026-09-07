/**
 * Zero-tip tipSideIntent contracts (T1–T9) — pure helpers + geometry.
 * Controller wiring: hpDirection = tipSideIntent; setSystemTip updates intent.
 */
import { describe, expect, it } from "vitest";
import {
  computeSystemTipHitPoint,
  deriveTipSideFromHitPointX,
  initialTipSideIntentFromHp,
} from "./useHptController";

describe("useHptController zero-tip side intent helpers", () => {
  it("T6: left 0 and right 0 produce identical center geometry", () => {
    const L = computeSystemTipHitPoint("left", 0);
    const R = computeSystemTipHitPoint("right", 0);
    expect(L.x).toBeCloseTo(R.x, 10);
    expect(L.y).toBeCloseTo(R.y, 10);
    expect(L.tipCount).toBe(0);
    expect(R.tipCount).toBe(0);
    expect(Math.abs(L.x)).toBeLessThan(1e-9);
  });

  it("T1/T8: zero-tip geometry does not derive side (intent preserved by caller)", () => {
    const center = computeSystemTipHitPoint("left", 0);
    expect(deriveTipSideFromHitPointX(center.x)).toBeNull();
    expect(deriveTipSideFromHitPointX(0)).toBeNull();
  });

  it("T2: left intent + tip 3 → left geometry (x < 0)", () => {
    const p = computeSystemTipHitPoint("left", 3);
    expect(p.tipCount).toBe(3);
    expect(p.x).toBeLessThan(0);
    expect(deriveTipSideFromHitPointX(p.x)).toBe("left");
  });

  it("T3: right intent + tip 3 → right geometry (x > 0)", () => {
    const p = computeSystemTipHitPoint("right", 3);
    expect(p.tipCount).toBe(3);
    expect(p.x).toBeGreaterThan(0);
    expect(deriveTipSideFromHitPointX(p.x)).toBe("right");
  });

  it("T4: right 3 → left 3 mirrors x sign", () => {
    const r = computeSystemTipHitPoint("right", 3);
    const l = computeSystemTipHitPoint("left", 3);
    expect(l.x).toBeCloseTo(-r.x, 10);
    expect(l.y).toBeCloseTo(r.y, 10);
  });

  it("T5/T9: N→0 collapses to center; 0→N restores from intent", () => {
    const left3 = computeSystemTipHitPoint("left", 3);
    expect(deriveTipSideFromHitPointX(left3.x)).toBe("left");
    const left0 = computeSystemTipHitPoint("left", 0);
    expect(deriveTipSideFromHitPointX(left0.x)).toBeNull();
    const left2 = computeSystemTipHitPoint("left", 2);
    expect(deriveTipSideFromHitPointX(left2.x)).toBe("left");
    expect(left2.x).toBeLessThan(0);
  });

  it("T7: hydrate non-zero left initializes intent left", () => {
    const p = computeSystemTipHitPoint("left", 3);
    expect(initialTipSideIntentFromHp(p.x)).toBe("left");
  });

  it("zero-tip hydrate defaults intent to right", () => {
    expect(initialTipSideIntentFromHp(0)).toBe("right");
    expect(initialTipSideIntentFromHp(undefined)).toBe("right");
  });
});
