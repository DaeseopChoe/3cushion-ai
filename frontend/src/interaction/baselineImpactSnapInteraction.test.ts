import { describe, expect, it } from "vitest";
import {
  resolveBaselineImpactSnapCandidate,
  resolveBaselineImpactSnapTarget,
} from "./baselineImpactSnapInteraction";
import type { MarkAxisLock } from "../domain/trajectory/baselineMarkAxisSnap";

const horizontalAxis: MarkAxisLock = {
  rail: "BOTTOM",
  varying: "x",
  constantAxis: "y",
  constantValue: 0,
  varyMin: 0,
  varyMax: 80,
};

const verticalAxis: MarkAxisLock = {
  rail: "RIGHT",
  varying: "y",
  constantAxis: "x",
  constantValue: 80,
  varyMin: 0,
  varyMax: 40,
};

describe("resolveBaselineImpactSnapTarget", () => {
  it("recognizes a CO double-click target", () => {
    expect(
      resolveBaselineImpactSnapTarget({
        pointerRg: { x: 20, y: 10 },
        coRg: { x: 20, y: 10 },
        c1Rg: { x: 60, y: 20 },
      })
    ).toBe("CO");
  });

  it("recognizes a C1 double-click target", () => {
    expect(
      resolveBaselineImpactSnapTarget({
        pointerRg: { x: 60, y: 20 },
        coRg: { x: 20, y: 10 },
        c1Rg: { x: 60, y: 20 },
      })
    ).toBe("C1");
  });

  it("fails closed for a miss and an exactly tied endpoint hit", () => {
    expect(
      resolveBaselineImpactSnapTarget({
        pointerRg: { x: 40, y: 20 },
        coRg: { x: 20, y: 10 },
        c1Rg: { x: 60, y: 30 },
      })
    ).toBeNull();
    expect(
      resolveBaselineImpactSnapTarget({
        pointerRg: { x: 40, y: 0 },
        coRg: { x: 38, y: 0 },
        c1Rg: { x: 42, y: 0 },
      })
    ).toBeNull();
  });
});

describe("resolveBaselineImpactSnapCandidate", () => {
  it("uses C1 as fixed when CO is moving", () => {
    expect(
      resolveBaselineImpactSnapCandidate({
        movingMark: "CO",
        coRg: { x: 20, y: 10 },
        c1Rg: { x: 40, y: 5 },
        activeImpactRg: { x: 72, y: 1 },
        allowedAxis: horizontalAxis,
      })
    ).toEqual({ x: 80, y: 0 });
  });

  it("uses CO as fixed when C1 is moving", () => {
    expect(
      resolveBaselineImpactSnapCandidate({
        movingMark: "C1",
        coRg: { x: 20, y: 10 },
        c1Rg: { x: 40, y: 20 },
        activeImpactRg: { x: 20, y: 10 },
        allowedAxis: verticalAxis,
      })
    ).toBeNull();
    expect(
      resolveBaselineImpactSnapCandidate({
        movingMark: "C1",
        coRg: { x: 20, y: 10 },
        c1Rg: { x: 40, y: 20 },
        activeImpactRg: { x: 40, y: 20 },
        allowedAxis: verticalAxis,
      })
    ).toEqual({ x: 80, y: 40 });
  });

  it("does not return a candidate when Impact is unavailable", () => {
    expect(
      resolveBaselineImpactSnapCandidate({
        movingMark: "CO",
        coRg: { x: 20, y: 10 },
        c1Rg: { x: 40, y: 5 },
        activeImpactRg: null,
        allowedAxis: horizontalAxis,
      })
    ).toBeNull();
  });
});

