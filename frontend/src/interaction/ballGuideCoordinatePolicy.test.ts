import { describe, expect, it } from "vitest";
import { createBallGuideState, updateBallGuideAxis } from "../hooks/useBallGuide";
import {
  applyGuideTriangleFineNudge,
  formatRgCoordinateDisplay,
  nudgeBallGuideAxisValue,
  normalizeRgTenth,
  resolveGuideCoordinateDisplay,
} from "./ballGuideCoordinatePolicy";
import { getBallGuideSnapAction } from "./ballGuideInteractionPolicy";

describe("ballGuideCoordinatePolicy", () => {
  it("TEST A: right triangle nudge increases verticalX by 0.1", () => {
    const guide = createBallGuideState("cue", { x: 53.0, y: 20.6 });
    const next = applyGuideTriangleFineNudge(guide, "right");
    expect(next.verticalX).toBe(53.1);
    expect(next.horizontalY).toBe(20.6);
    const display = resolveGuideCoordinateDisplay(next, "cue", { x: 10, y: 10 });
    expect(formatRgCoordinateDisplay(display.x)).toBe("53.1");
    expect(formatRgCoordinateDisplay(display.y)).toBe("20.6");
  });

  it("TEST B: repeated nudges avoid floating-point artifacts", () => {
    let guide = createBallGuideState("cue", { x: 53.0, y: 20.6 });
    guide = applyGuideTriangleFineNudge(guide, "right");
    expect(guide.verticalX).toBe(53.1);
    for (let i = 0; i < 4; i += 1) {
      guide = applyGuideTriangleFineNudge(guide, "right");
    }
    expect(guide.verticalX).toBe(53.5);
    expect(String(guide.verticalX)).not.toContain("000000");
  });

  it("TEST C: horizontal triangles change Y only; vertical change X only", () => {
    const guide = createBallGuideState("cue", { x: 53.0, y: 20.6 });
    const right = applyGuideTriangleFineNudge(guide, "right");
    expect(right).toMatchObject({ verticalX: 53.1, horizontalY: 20.6 });
    const left = applyGuideTriangleFineNudge(guide, "left");
    expect(left).toMatchObject({ verticalX: 52.9, horizontalY: 20.6 });
    const up = applyGuideTriangleFineNudge(guide, "up");
    expect(up).toMatchObject({ verticalX: 53.0, horizontalY: 20.7 });
    const down = applyGuideTriangleFineNudge(guide, "down");
    expect(down).toMatchObject({ verticalX: 53.0, horizontalY: 20.5 });
  });

  it("TEST D: nudge respects BALL_GUIDE_AXIS_BOUNDS", () => {
    const upper = createBallGuideState("cue", { x: 79.5, y: 39.5 });
    expect(applyGuideTriangleFineNudge(upper, "right").verticalX).toBe(79.5);
    expect(applyGuideTriangleFineNudge(upper, "up").horizontalY).toBe(39.5);
    const lower = createBallGuideState("cue", { x: 0.5, y: 0.5 });
    expect(applyGuideTriangleFineNudge(lower, "left").verticalX).toBe(0.5);
    expect(applyGuideTriangleFineNudge(lower, "down").horizontalY).toBe(0.5);
  });

  it("TEST E: guide drag display follows guide intersection", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });
    const dragged = updateBallGuideAxis(guide, "vertical", 53.5);
    const display = resolveGuideCoordinateDisplay(dragged, "cue", { x: 10, y: 10 });
    expect(display.mode).toBe("guide");
    expect(formatRgCoordinateDisplay(display.x)).toBe("53.5");
    expect(formatRgCoordinateDisplay(display.y)).toBe("20.0");
  });

  it("TEST F: direct intersection update reflects in display source", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });
    const applied = { ...guide, verticalX: 70, horizontalY: 39 };
    const display = resolveGuideCoordinateDisplay(applied, "cue", { x: 10, y: 10 });
    expect(display).toMatchObject({ x: 70, y: 39, mode: "guide" });
  });

  it("TEST G: ball center display when guide inactive for selected ball", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });
    const display = resolveGuideCoordinateDisplay(guide, "target", { x: 12.3, y: 18.7 });
    expect(display.mode).toBe("ball");
    expect(display.x).toBe(12.3);
    expect(display.y).toBe(18.7);
  });

  it("TEST G2: ball direct drag overrides guide intersection in display source", () => {
    const guide = createBallGuideState("cue", { x: 53.0, y: 20.6 });
    const display = resolveGuideCoordinateDisplay(
      guide,
      "cue",
      { x: 15.5, y: 22.1 },
      { ballDirectDragActive: true }
    );
    expect(display).toEqual({ x: 15.5, y: 22.1, mode: "ball" });
  });

  it("TEST H: snap action target remains guide intersection", () => {
    const guide = createBallGuideState("cue", { x: 53.0, y: 20.6 });
    const snap = getBallGuideSnapAction(guide, 80, 40);
    expect(snap?.target).toEqual({ x: 53.0, y: 20.6 });
  });

  it("TEST I: nudgeBallGuideAxisValue normalizes tenths", () => {
    expect(nudgeBallGuideAxisValue("vertical", 53.0, 0.1)).toBe(53.1);
    expect(normalizeRgTenth(0.30000000000004)).toBe(0.3);
    expect(formatRgCoordinateDisplay(52.25)).toBe("52.3");
    expect(formatRgCoordinateDisplay(19.763352966308595)).toBe("19.8");
  });
});
