import { describe, expect, it } from "vitest";
import {
  computeSameRailCapEndIndex,
  computeSecondBallCapEndIndex,
  resolveTrajectoryDisplayCap,
  type PathPoint,
} from "./trajectoryPathDisplayPolicy";

const bottom = (x: number): PathPoint => ({ x, y: 0 });
const top = (x: number): PathPoint => ({ x, y: 40 });
const left = (y: number): PathPoint => ({ x: 0, y });

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
});
