import { describe, expect, it } from "vitest";
import { detectRail, resolveNearestRail } from "./reflectionEngine";
import {
  computeBaselinePhysicalLimitEndIndex,
  computeSameRailCapEndIndex,
  computeSecondBallCapEndIndex,
  resolveBaselineTrajectoryDisplayCap,
  resolveTrajectoryDisplayCap,
  type PathPoint,
} from "./trajectoryPathDisplayPolicy";

const bottom = (x: number): PathPoint => ({ x, y: 0 });
const top = (x: number): PathPoint => ({ x, y: 40 });
const left = (y: number): PathPoint => ({ x: 0, y });

const fullPathNodes = (): (PathPoint | null)[] => [
  bottom(30),
  top(4),
  { x: 48, y: 18 },
  bottom(26),
  left(16),
  top(16),
  bottom(16),
];

describe("trajectoryPathDisplayPolicy", () => {
  it("Case 1: same-rail C4-C5 stops at C4 (degenerate corner)", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 50, y: 20 },
      bottom(26),
      top(16),
      top(16.05),
      bottom(16),
    ];
    const cap = computeSameRailCapEndIndex(pathNodes);
    expect(cap.endIndex).toBe(4);
    expect(cap.reason).toBe("same_rail");
    expect(cap.stoppedSegment).toBe("C4-C5");
  });

  it("Case 2: corrected side-rail chain C4 LEFT → C5 TOP → C6 BOTTOM allowed", () => {
    const pathNodes = [
      bottom(33),
      top(4),
      { x: 55, y: 22 },
      bottom(34),
      left(25.5),
      top(25.5),
      bottom(25.5),
    ];
    const cap = computeSameRailCapEndIndex(pathNodes);
    expect(cap.endIndex).toBe(6);
    expect(cap.reason).toBe("full");
  });

  it("Case 3: CO/C3/C6 all BOTTOM — non-consecutive segments allowed", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 48, y: 18 },
      bottom(26),
      left(16),
      top(16),
      bottom(16),
    ];
    const cap = computeSameRailCapEndIndex(pathNodes);
    expect(cap.endIndex).toBe(6);
  });

  it("Case 4: second ball hit on C6 segment extends to index 6", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 48, y: 18 },
      bottom(26),
      left(16),
      top(16),
      bottom(16),
    ];
    const secondBall = bottom(15);
    const cap = resolveTrajectoryDisplayCap(pathNodes, secondBall, 2);
    expect(cap.endIndex).toBe(6);
    expect(cap.reason).toBe("second_ball");
  });

  it("same-rail cap wins over second-ball when C4-C5 invalid", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 48, y: 18 },
      bottom(26),
      top(16),
      top(16),
      bottom(16),
    ];
    const secondBall = bottom(15);
    const cap = resolveTrajectoryDisplayCap(pathNodes, secondBall, 2);
    expect(cap.endIndex).toBe(4);
    expect(cap.reason).toBe("same_rail");
  });

  it("default second-ball cap stops at C3 when no hit", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 48, y: 18 },
      bottom(26),
      left(16),
      top(16),
      bottom(16),
    ];
    const cap = computeSecondBallCapEndIndex(pathNodes, null, 2);
    expect(cap.endIndex).toBe(3);
    expect(cap.reason).toBe("full");
  });

  it("chain break at missing C2 stops before gap", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      null,
      bottom(26),
      left(16),
    ];
    const cap = resolveTrajectoryDisplayCap(pathNodes, null, 2);
    expect(cap.endIndex).toBe(1);
    expect(cap.reason).toBe("missing_node");
  });

  describe("Baseline Display Cap SSOT (5&Half) — C4 Minimum · no corrected ceiling", () => {
    it("PhysicalLimit: C4 < 20 → C4; C4 >= 20 → C6", () => {
      expect(computeBaselinePhysicalLimitEndIndex(16)).toBe(4);
      expect(computeBaselinePhysicalLimitEndIndex(19.9)).toBe(4);
      expect(computeBaselinePhysicalLimitEndIndex(20)).toBe(6);
      expect(computeBaselinePhysicalLimitEndIndex(25)).toBe(6);
      expect(computeBaselinePhysicalLimitEndIndex(null)).toBe(4);
    });

    it("Case1: Baseline C4<20 → Baseline ends at C4 (PhysicalLimit)", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        baselineC4Value: 16,
      });
      expect(cap.endIndex).toBe(4);
      expect(cap.reason).toBe("baseline_physical");
    });

    it("Case2: Baseline C4>=20 → Baseline to C6 (independent of corrected)", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(6);
      expect(cap.reason).toBe("full");
    });

    it("C4 Minimum: correctedEnd=C3 must not pull baseline below C4", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 3,
        baselineC4Value: 16,
      });
      expect(cap.endIndex).toBe(4);
      expect(cap.reason).toBe("baseline_physical");
      expect(cap.reason).not.toBe("corrected_ceiling");
    });

    it("C4 Minimum: correctedEnd=C3 + C4>=20 → still C6 (no ceiling)", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 3,
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(6);
      expect(cap.reason).not.toBe("corrected_ceiling");
    });

    it("legacy Case3: correctedEnd=C5 no longer ceilings baseline (C4>=20 → C6)", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 5,
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(6);
      expect(cap.reason).not.toBe("corrected_ceiling");
    });
  });

  it("skipSameRail: true same-rail C4-C5 is skipped when override opts set", () => {
    // True same-rail (not corner EPS steal). Corner C1-C2 is handled by nearest-rail.
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 48, y: 18 },
      bottom(26),
      top(16),
      top(16.05),
      bottom(16),
    ];
    const cut = computeSameRailCapEndIndex(pathNodes);
    expect(cut.reason).toBe("same_rail");
    expect(cut.endIndex).toBe(4);

    const skip = computeSameRailCapEndIndex(pathNodes, { skipSameRail: true });
    expect(skip.endIndex).toBe(6);
    expect(skip.reason).not.toBe("same_rail");

    const resolved = resolveTrajectoryDisplayCap(pathNodes, null, 2, {
      skipSameRail: true,
    });
    expect(resolved.endIndex).toBeGreaterThanOrEqual(3);
  });

  describe("BUG-A: corner side-rail C2 must not false same_rail with C1 (no skipSameRail)", () => {
    // Measured corrected nodes (T2B_L tip L tipCount=3 slide=8 CO_eff=55). No override.
    const f1 = {
      c1_5: { C1: { x: 70.471, y: 0 }, C2: { x: 80, y: 2.273 } },
      c1_7: { C1: { x: 70.471, y: 0 }, C2: { x: 80, y: 2.887 } },
      c1_7_5: { C1: { x: 70.471, y: 0 }, C2: { x: 80, y: 3.041 } },
      c1_10: { C1: { x: 70.471, y: 0 }, C2: { x: 80, y: 3.808 } },
    };
    const f2Mirror = {
      C1: { x: 9.529, y: 0 },
      C2: { x: 0, y: 2.273 },
    };

    function pathWithC1C2(C1: PathPoint, C2: PathPoint): (PathPoint | null)[] {
      // CO on TOP (T2B-like) — must not share BOTTOM with C1 or CO–C1 true same_rail masks BUG-A.
      return [
        top(30),
        C1,
        C2,
        bottom(26),
        left(16),
        top(16),
        bottom(16),
      ];
    }

    it.each([
      ["C1=5", f1.c1_5],
      ["C1=7", f1.c1_7],
      ["C1=7.5", f1.c1_7_5],
      ["C1=10", f1.c1_10],
    ] as const)(
      "F1 %s: C1 BOTTOM + side-rail C2 → not same_rail; cap past C1",
      (_label, pts) => {
        const pathNodes = pathWithC1C2(pts.C1, pts.C2);
        const same = computeSameRailCapEndIndex(pathNodes);
        expect(same.reason).not.toBe("same_rail");
        expect(same.endIndex).toBeGreaterThanOrEqual(2);
        expect(same.stoppedSegment).not.toBe("C1-C2");

        const cap = resolveTrajectoryDisplayCap(pathNodes, null, 2);
        expect(cap.reason).not.toBe("same_rail");
        expect(cap.endIndex).toBeGreaterThan(1);
      }
    );

    it("F2 mirror LEFT: C1 BOTTOM + C2≈(0,2.273) → not same_rail", () => {
      const pathNodes = pathWithC1C2(f2Mirror.C1, f2Mirror.C2);
      const same = computeSameRailCapEndIndex(pathNodes);
      expect(same.reason).not.toBe("same_rail");
      expect(same.endIndex).toBeGreaterThanOrEqual(2);
      expect(same.stoppedSegment).not.toBe("C1-C2");
    });

    it("NORMAL true same-rail C4-C5 still truncates", () => {
      const pathNodes = [
        top(30),
        f1.c1_5.C1,
        f1.c1_5.C2,
        bottom(26),
        top(16),
        top(16.05),
        bottom(16),
      ];
      const same = computeSameRailCapEndIndex(pathNodes);
      expect(same.endIndex).toBe(4);
      expect(same.reason).toBe("same_rail");
      expect(same.stoppedSegment).toBe("C4-C5");
    });

    it("exact/near-corner: side-rail wins over TOP/BOTTOM steal", () => {
      // Exact corner: LEFT/RIGHT preferred over TOP/BOTTOM
      expect(resolveNearestRail({ x: 80, y: 0 })).toBe("RIGHT");
      expect(resolveNearestRail({ x: 80, y: 40 })).toBe("RIGHT");
      expect(resolveNearestRail({ x: 0, y: 0 })).toBe("LEFT");
      expect(resolveNearestRail({ x: 0, y: 40 })).toBe("LEFT");
      // Near-corner inside former EPS=3 band
      expect(resolveNearestRail({ x: 80, y: 2.273 })).toBe("RIGHT");
      expect(resolveNearestRail({ x: 80, y: 2.89 })).toBe("RIGHT");
      expect(resolveNearestRail({ x: 80, y: 38 })).toBe("RIGHT");
      expect(resolveNearestRail({ x: 0, y: 2.273 })).toBe("LEFT");
      // Mid-rail BOTTOM unchanged
      expect(resolveNearestRail({ x: 70.47, y: 0 })).toBe("BOTTOM");
      // detectRail would steal these as BOTTOM; presence+nearest keeps side identity
      expect(detectRail({ x: 80, y: 2.273 })).toBe("BOTTOM");
      expect(resolveNearestRail({ x: 80, y: 2.273 })).toBe("RIGHT");
    });

    it("geometry presence: 7 path nodes still cap without cutting at C1", () => {
      const pathNodes = pathWithC1C2(f1.c1_5.C1, f1.c1_5.C2);
      expect(pathNodes.filter(Boolean)).toHaveLength(7);
      const cap = resolveTrajectoryDisplayCap(pathNodes, null, 2);
      expect(cap.endIndex).toBeGreaterThanOrEqual(3);
      expect(cap.stoppedSegment).not.toBe("C1-C2");
    });
  });
});
