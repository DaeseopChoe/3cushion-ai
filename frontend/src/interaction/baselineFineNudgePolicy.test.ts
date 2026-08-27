import { describe, expect, it } from "vitest";
import {
  BASELINE_FINE_NUDGE_HIT_RADIUS_RG,
  BASELINE_FINE_NUDGE_STEP_RG,
  getBaselineFineNudgeArrowDelta,
  getBaselineFineNudgeArrowDescriptors,
  resolveBaselineFineNudgeArrowHit,
} from "./baselineFineNudgePolicy";

describe("CO/C1 baseline fine nudge arrows", () => {
  it("renders only left/right for an x-axis Mark", () => {
    const arrows = getBaselineFineNudgeArrowDescriptors({
      mark: "CO",
      coord: { x: 40, y: -2.25 },
      axis: "x",
    });

    expect(arrows.map(({ direction }) => direction)).toEqual(["left", "right"]);
    expect(arrows.every(({ axis, mark }) => axis === "x" && mark === "CO")).toBe(
      true
    );
  });

  it("renders only up/down for a y-axis Mark", () => {
    const arrows = getBaselineFineNudgeArrowDescriptors({
      mark: "C1",
      coord: { x: -2.25, y: 10 },
      axis: "y",
    });

    expect(arrows.map(({ direction }) => direction)).toEqual(["down", "up"]);
    expect(arrows.every(({ axis, mark }) => axis === "y" && mark === "C1")).toBe(
      true
    );
  });

  it("maps screen directions to signed 0.1 Rg deltas", () => {
    expect(getBaselineFineNudgeArrowDelta("left")).toBe(
      -BASELINE_FINE_NUDGE_STEP_RG
    );
    expect(getBaselineFineNudgeArrowDelta("right")).toBe(
      BASELINE_FINE_NUDGE_STEP_RG
    );
    expect(getBaselineFineNudgeArrowDelta("down")).toBe(
      -BASELINE_FINE_NUDGE_STEP_RG
    );
    expect(getBaselineFineNudgeArrowDelta("up")).toBe(
      BASELINE_FINE_NUDGE_STEP_RG
    );
  });

  it("hits the arrow geometry without changing the logical handle target", () => {
    const arrows = getBaselineFineNudgeArrowDescriptors({
      mark: "CO",
      coord: { x: 40, y: -2.25 },
      axis: "x",
    });
    const right = arrows[1];
    const hit = resolveBaselineFineNudgeArrowHit(
      right.point,
      arrows,
      BASELINE_FINE_NUDGE_HIT_RADIUS_RG
    );

    expect(hit).toEqual(right);
    expect(right.point).not.toEqual({ x: 40, y: -2.25 });
  });

  it("fails closed without a safely resolved axis", () => {
    expect(
      getBaselineFineNudgeArrowDescriptors({
        mark: "CO",
        coord: { x: -2.25, y: -2.25 },
        axis: null,
      })
    ).toEqual([]);
  });
});
