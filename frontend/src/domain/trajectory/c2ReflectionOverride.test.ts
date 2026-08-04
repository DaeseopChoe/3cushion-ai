import { describe, expect, it } from "vitest";
import {
  C2_RAIL_EDGE_EPS,
  clampRailT,
  normalizeReflectionOverride,
  railPointFromT,
  railTFromPoint,
  reflectionOverrideToPoint,
  resolveRailForC2Handle,
  snapPointerToReflectionOverride,
} from "./c2ReflectionOverride";

describe("c2ReflectionOverride", () => {
  it("normalizes { rail, t } and rejects bad payloads", () => {
    expect(normalizeReflectionOverride({ rail: "TOP", t: 0.5 })).toEqual({
      rail: "TOP",
      t: 0.5,
    });
    expect(normalizeReflectionOverride({ rail: "X", t: 0.5 })).toBeNull();
    expect(normalizeReflectionOverride(null)).toBeNull();
  });

  it("clamps t away from exact corners (ε~end-ε)", () => {
    const rightLo = clampRailT("RIGHT", 0);
    const rightHi = clampRailT("RIGHT", 1);
    expect(railPointFromT("RIGHT", rightLo).y).toBeCloseTo(C2_RAIL_EDGE_EPS);
    expect(railPointFromT("RIGHT", rightHi).y).toBeCloseTo(40 - C2_RAIL_EDGE_EPS);

    const topLo = clampRailT("TOP", 0);
    const topHi = clampRailT("TOP", 1);
    expect(railPointFromT("TOP", topLo).x).toBeCloseTo(C2_RAIL_EDGE_EPS);
    expect(railPointFromT("TOP", topHi).x).toBeCloseTo(80 - C2_RAIL_EDGE_EPS);
  });

  it("round-trips rail point ↔ t inside safe band", () => {
    const p = railPointFromT("BOTTOM", 0.25);
    expect(p.y).toBe(0);
    expect(railTFromPoint(p, "BOTTOM")).toBeCloseTo(0.25);
  });

  it("snap always returns override on locked rail (never null)", () => {
    const ov = snapPointerToReflectionOverride({ x: 40, y: 20 }, "TOP");
    expect(ov.rail).toBe("TOP");
    expect(ov.t).toBeCloseTo(0.5);
    const pt = reflectionOverrideToPoint(ov);
    expect(pt?.y).toBe(40);
    expect(pt?.x).toBeCloseTo(40);
  });

  it("near former EPS=3 band still keeps RIGHT (not TOP)", () => {
    // y=38 would be stolen by detectRail(EPS=3) as TOP; nearest-rail keeps RIGHT.
    expect(resolveRailForC2Handle({ x: 80, y: 38 })).toBe("RIGHT");
    expect(resolveRailForC2Handle({ x: 80, y: 2 })).toBe("RIGHT");
    expect(resolveRailForC2Handle({ x: 80, y: 39.5 })).toBe("RIGHT");

    const ov = snapPointerToReflectionOverride({ x: 90, y: 39 }, "RIGHT");
    expect(ov.rail).toBe("RIGHT");
    expect(railPointFromT("RIGHT", ov.t).y).toBeGreaterThanOrEqual(
      C2_RAIL_EDGE_EPS
    );
    expect(railPointFromT("RIGHT", ov.t).y).toBeLessThanOrEqual(
      40 - C2_RAIL_EDGE_EPS
    );
  });

  it("preferred rail wins at exact corner", () => {
    expect(resolveRailForC2Handle({ x: 80, y: 40 }, "RIGHT")).toBe("RIGHT");
  });
});
