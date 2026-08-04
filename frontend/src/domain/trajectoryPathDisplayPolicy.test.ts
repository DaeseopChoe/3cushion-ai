import { describe, expect, it } from "vitest";
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

  it("skipSameRail: corner-like TOP/RIGHT pair does not cut when override opts set", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 80, y: 38 },
      bottom(26),
      left(16),
      top(16),
      bottom(16),
    ];
    const cut = computeSameRailCapEndIndex(pathNodes);
    expect(cut.reason).toBe("same_rail");

    const skip = computeSameRailCapEndIndex(pathNodes, { skipSameRail: true });
    expect(skip.endIndex).toBe(6);
    expect(skip.reason).not.toBe("same_rail");

    const resolved = resolveTrajectoryDisplayCap(pathNodes, null, 2, {
      skipSameRail: true,
    });
    expect(resolved.endIndex).toBeGreaterThanOrEqual(3);
  });
});
