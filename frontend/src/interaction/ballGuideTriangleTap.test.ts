import { describe, expect, it } from "vitest";
import { createBallGuideState } from "../hooks/useBallGuide";
import {
  applyGuideTriangleFineNudge,
  formatRgCoordinateDisplay,
  nudgeBallGuideAxisValue,
  resolveGuideCoordinateDisplay,
} from "./ballGuideCoordinatePolicy";
import { ballGuideFineStepDeltaRg } from "./ballGuideInteractionPolicy";

/** Mirrors App.jsx triangle tap handler without React. */
function runTriangleTapHandler(
  guideState: ReturnType<typeof createBallGuideState>,
  direction: "up" | "down" | "left" | "right"
) {
  const hit = { axis: direction === "left" || direction === "right" ? "vertical" : "horizontal", direction } as const;
  const delta = ballGuideFineStepDeltaRg(hit.direction);
  const axis = hit.axis;
  const currentValue =
    axis === "horizontal" ? guideState.horizontalY : guideState.verticalX;
  if (!Number.isFinite(currentValue)) return guideState;
  const nextValue = nudgeBallGuideAxisValue(axis, currentValue as number, delta);
  if (axis === "horizontal") {
    return { ...guideState, horizontalY: nextValue };
  }
  return { ...guideState, verticalX: nextValue };
}

describe("ballGuideTriangleTap runtime", () => {
  it("TEST 1: triangle tap handler path does not throw", () => {
    const guide = createBallGuideState("cue", { x: 60.0, y: 20.0 });
    expect(() => runTriangleTapHandler(guide, "right")).not.toThrow();
    expect(() => applyGuideTriangleFineNudge(guide, "left")).not.toThrow();
  });

  it("TEST 2: LEFT triangle → verticalX - 0.1", () => {
    const guide = createBallGuideState("cue", { x: 60.1, y: 20.0 });
    const next = applyGuideTriangleFineNudge(guide, "left");
    expect(next.verticalX).toBe(60.0);
    expect(next.horizontalY).toBe(20.0);
  });

  it("TEST 3: RIGHT triangle → verticalX + 0.1", () => {
    let guide = createBallGuideState("cue", { x: 60.0, y: 20.0 });
    guide = applyGuideTriangleFineNudge(guide, "right");
    expect(guide.verticalX).toBe(60.1);
    guide = applyGuideTriangleFineNudge(guide, "right");
    expect(guide.verticalX).toBe(60.2);
  });

  it("TEST 4: UP triangle → horizontalY + 0.1", () => {
    const guide = createBallGuideState("cue", { x: 60.1, y: 20.0 });
    const next = applyGuideTriangleFineNudge(guide, "up");
    expect(next.horizontalY).toBe(20.1);
    expect(next.verticalX).toBe(60.1);
  });

  it("TEST 5: DOWN triangle → horizontalY - 0.1", () => {
    const guide = createBallGuideState("cue", { x: 60.1, y: 20.1 });
    const next = applyGuideTriangleFineNudge(guide, "down");
    expect(next.horizontalY).toBe(20.0);
  });

  it("TEST 6: each tap updates coordinate display immediately", () => {
    let guide = createBallGuideState("cue", { x: 60.0, y: 20.0 });
    const display0 = resolveGuideCoordinateDisplay(guide, "cue", { x: 1, y: 1 });
    expect(formatRgCoordinateDisplay(display0.x)).toBe("60.0");
    expect(formatRgCoordinateDisplay(display0.y)).toBe("20.0");

    guide = applyGuideTriangleFineNudge(guide, "right");
    const display1 = resolveGuideCoordinateDisplay(guide, "cue", { x: 1, y: 1 });
    expect(formatRgCoordinateDisplay(display1.x)).toBe("60.1");

    guide = applyGuideTriangleFineNudge(guide, "left");
    const display2 = resolveGuideCoordinateDisplay(guide, "cue", { x: 1, y: 1 });
    expect(formatRgCoordinateDisplay(display2.x)).toBe("60.0");

    guide = applyGuideTriangleFineNudge(guide, "up");
    const display3 = resolveGuideCoordinateDisplay(guide, "cue", { x: 1, y: 1 });
    expect(formatRgCoordinateDisplay(display3.y)).toBe("20.1");

    guide = applyGuideTriangleFineNudge(guide, "down");
    const display4 = resolveGuideCoordinateDisplay(guide, "cue", { x: 1, y: 1 });
    expect(formatRgCoordinateDisplay(display4.y)).toBe("20.0");
  });

  it("TEST 7: repeated taps avoid floating artifacts", () => {
    let guide = createBallGuideState("cue", { x: 60.0, y: 20.0 });
    for (let i = 0; i < 10; i += 1) {
      guide = applyGuideTriangleFineNudge(guide, "right");
    }
    expect(guide.verticalX).toBe(61.0);
    expect(String(guide.verticalX)).not.toMatch(/000000/);
  });

  it("TEST 8: triangle tap preserves valid guide state shape", () => {
    let guide = createBallGuideState("cue", { x: 60.0, y: 20.0 });
    guide = applyGuideTriangleFineNudge(guide, "right");
    expect(guide).toMatchObject({
      active: true,
      ballId: "cue",
      verticalX: 60.1,
      horizontalY: 20.0,
    });
    expect(Number.isFinite(guide.verticalX)).toBe(true);
    expect(Number.isFinite(guide.horizontalY)).toBe(true);
  });
});
