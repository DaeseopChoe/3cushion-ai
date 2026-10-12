import { describe, expect, it } from "vitest";
import { detectRail, resolveNearestRail } from "./reflectionEngine";
import * as policy from "./trajectoryPathDisplayPolicy";
import {
  computeBaselinePhysicalLimitEndIndex,
  computeSameRailCapEndIndex,
  PATH_NODE_MARKS,
  resolveBaselineTrajectoryDisplayCap,
  resolveTrajectoryDisplayCap,
  slicePathNodesToCap,
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
    expect(cap.reason).toBe("full_valid_path");
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

  it("세컨드볼은 표시 Cap 입력이 아님 — 정책 모듈에 세컨드볼 절단 API 없음", () => {
    expect("computeSecondBallCapEndIndex" in policy).toBe(false);
    expect(policy.resolveTrajectoryDisplayCap.length).toBeLessThanOrEqual(2);
  });

  it("유효 노드 C6까지 → 마지막 유효 쿠션(C6)까지 표시 · 공 위치 점 없음", () => {
    const pathNodes = fullPathNodes();
    const cap = resolveTrajectoryDisplayCap(pathNodes);
    expect(cap.endIndex).toBe(6);
    expect(cap.reason).toBe("full_valid_path");
    expect(cap).not.toHaveProperty("endPoint");
    expect(slicePathNodesToCap(pathNodes, cap)).toEqual(pathNodes);
    expect(PATH_NODE_MARKS.slice(0, cap.endIndex + 1)).toContain("C6");
  });

  it("노드가 C4에서 끝남 → C4까지 (없는 C5/C6 미표시)", () => {
    const pathNodes = fullPathNodes().slice(0, 5);
    const cap = resolveTrajectoryDisplayCap(pathNodes);
    expect(cap.endIndex).toBe(4);
    expect(slicePathNodesToCap(pathNodes, cap)).toHaveLength(5);
  });

  it("노드가 C3에서 끊김 → C3까지 (missing_node)", () => {
    const pathNodes = [...fullPathNodes().slice(0, 4), null, null, null];
    const cap = resolveTrajectoryDisplayCap(pathNodes);
    expect(cap.endIndex).toBe(3);
    expect(cap.reason).toBe("missing_node");
  });

  it("same-rail(C4–C5) 절단 유지", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      { x: 48, y: 18 },
      bottom(26),
      top(16),
      top(16.05),
      bottom(16),
    ];
    const cap = resolveTrajectoryDisplayCap(pathNodes);
    expect(cap.endIndex).toBe(4);
    expect(cap.reason).toBe("same_rail");
    expect(slicePathNodesToCap(pathNodes, cap)).toEqual(pathNodes.slice(0, 5));
  });

  it("물리 제한(physicalLimitEndIndex=4) → C4 · 제한이 chain 이상이면 full_valid_path", () => {
    const limited = resolveTrajectoryDisplayCap(fullPathNodes(), {
      physicalLimitEndIndex: 4,
    });
    expect(limited.endIndex).toBe(4);
    expect(limited.reason).toBe("physical_limit");

    const open = resolveTrajectoryDisplayCap(fullPathNodes(), {
      physicalLimitEndIndex: 6,
    });
    expect(open.endIndex).toBe(6);
    expect(open.reason).toBe("full_valid_path");
  });

  it("chain break at missing C2 stops before gap", () => {
    const pathNodes = [
      bottom(30),
      top(4),
      null,
      bottom(26),
      left(16),
    ];
    const cap = resolveTrajectoryDisplayCap(pathNodes);
    expect(cap.endIndex).toBe(1);
    expect(cap.reason).toBe("missing_node");
  });

  describe("Baseline Display Cap SSOT (5&Half) — corrected DISPLAY ceiling", () => {
    it("PhysicalLimit: C4 < 20 → C4; C4 >= 20 → C6", () => {
      expect(computeBaselinePhysicalLimitEndIndex(16)).toBe(4);
      expect(computeBaselinePhysicalLimitEndIndex(19.9)).toBe(4);
      expect(computeBaselinePhysicalLimitEndIndex(20)).toBe(6);
      expect(computeBaselinePhysicalLimitEndIndex(25)).toBe(6);
      expect(computeBaselinePhysicalLimitEndIndex(null)).toBe(4);
    });

    it("Case1: Baseline C4<20 → Baseline ends at C4 (PhysicalLimit) without ceiling", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        baselineC4Value: 16,
      });
      expect(cap.endIndex).toBe(4);
      expect(cap.reason).toBe("baseline_physical");
    });

    it("Case2: Baseline C4>=20 → Baseline to C6 when no corrected ceiling", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(6);
      expect(cap.reason).toBe("full_valid_path");
    });

    it("T1: corrected ends C4 → baseline DISPLAY ends C4 (even if PhysicalLimit C6)", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 4,
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(4);
      expect(cap.reason).toBe("corrected_ceiling");
    });

    it("T2: corrected ends C5 → baseline DISPLAY ends C5", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 5,
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(5);
      expect(cap.reason).toBe("corrected_ceiling");
    });

    it("T3: internal pathNodes C5/C6 preserved; cushionPath only through corrected Cn", () => {
      const pathNodes = fullPathNodes();
      expect(pathNodes.filter(Boolean)).toHaveLength(7);
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes,
        correctedDisplayEndIndex: 4,
        baselineC4Value: 25,
      });
      const sliced = slicePathNodesToCap(pathNodes, cap);
      expect(pathNodes[5]).toEqual(top(16));
      expect(pathNodes[6]).toEqual(bottom(16));
      expect(sliced).toHaveLength(5);
      expect(sliced[4]).toEqual(pathNodes[4]);
      expect(sliced.some((p) => p === pathNodes[5] || p === pathNodes[6])).toBe(
        false
      );
    });

    it("T4: labels share same cap — C5/C6 keys absent when corrected ends C4", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 4,
        baselineC4Value: 25,
      });
      const visibleKeys = PATH_NODE_MARKS.slice(0, cap.endIndex + 1);
      expect(visibleKeys).toEqual(["CO", "C1", "C2", "C3", "C4"]);
      expect(visibleKeys).not.toContain("C5");
      expect(visibleKeys).not.toContain("C6");
    });

    it("T6: ceiling is index-only — baseline C4 geometry stays baseline node, not second-ball XY", () => {
      const pathNodes = fullPathNodes();
      const secondBallXy = { x: 12, y: 8 };
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes,
        correctedDisplayEndIndex: 4,
        baselineC4Value: 25,
      });
      const sliced = slicePathNodesToCap(pathNodes, cap);
      expect(sliced[4]).toEqual(pathNodes[4]);
      expect(sliced[4]).not.toEqual(secondBallXy);
    });

    it("T13: corrected display end change updates baseline ceiling", () => {
      const pathNodes = fullPathNodes();
      const atC4 = resolveBaselineTrajectoryDisplayCap({
        pathNodes,
        correctedDisplayEndIndex: 4,
        baselineC4Value: 25,
      });
      const atC5 = resolveBaselineTrajectoryDisplayCap({
        pathNodes,
        correctedDisplayEndIndex: 5,
        baselineC4Value: 25,
      });
      expect(atC4.endIndex).toBe(4);
      expect(atC5.endIndex).toBe(5);
    });

    it("T14: corrected at max (C6) preserves PhysicalLimit C6 behavior", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 6,
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(6);
      expect(cap.reason).toBe("full_valid_path");
    });

    it("baseline은 세컨드볼 입력이 없어도 자체 PhysicalLimit/chain까지 (C6) · 공 위치 점 없음", () => {
      const pathNodes = fullPathNodes();
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes,
        baselineC4Value: 25,
      });
      expect(cap.endIndex).toBe(6);
      expect(cap).not.toHaveProperty("endPoint");
      expect(slicePathNodesToCap(pathNodes, cap)).toEqual(pathNodes);
    });

    it("PhysicalLimit still binds when tighter than corrected ceiling", () => {
      const cap = resolveBaselineTrajectoryDisplayCap({
        pathNodes: fullPathNodes(),
        correctedDisplayEndIndex: 6,
        baselineC4Value: 16,
      });
      expect(cap.endIndex).toBe(4);
      expect(cap.reason).toBe("baseline_physical");
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

    const resolved = resolveTrajectoryDisplayCap(pathNodes, {
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

        const cap = resolveTrajectoryDisplayCap(pathNodes);
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
      const cap = resolveTrajectoryDisplayCap(pathNodes);
      expect(cap.endIndex).toBeGreaterThanOrEqual(3);
      expect(cap.stoppedSegment).not.toBe("C1-C2");
    });
  });
});
