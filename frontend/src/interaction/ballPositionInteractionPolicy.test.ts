import { describe, expect, it } from "vitest";
import { createBallGuideState } from "../hooks/useBallGuide";
import {
  resolveGuideCoordinateDisplay,
} from "./ballGuideCoordinatePolicy";
import {
  BALL_PICK_RADIUS_MULTIPLIER,
  BALL_POSITION_JOYSTICK_PAD_VISIBLE,
  computeJoystickCenterRg,
  shouldJoystickPadCapturePointer,
} from "./joystickInteractionPolicy";

const SCALE = 10;
const BALL_RADIUS_RG = 0.865;

describe("ball position UX experiment", () => {
  it("A — joystick pad visible flag is off for direct-drag experiment", () => {
    expect(BALL_POSITION_JOYSTICK_PAD_VISIBLE).toBe(false);
  });

  it("B — hidden pad does not capture pointer at former pad center", () => {
    const ballPos = { x: 20, y: 15 };
    const padCenter = computeJoystickCenterRg(ballPos, BALL_RADIUS_RG, SCALE);
    expect(
      shouldJoystickPadCapturePointer(
        false,
        true,
        "cue",
        padCenter,
        ballPos,
        BALL_RADIUS_RG,
        SCALE
      )
    ).toBe(false);
  });

  it("B2 — visible pad would capture pointer at pad center", () => {
    const ballPos = { x: 20, y: 15 };
    const padCenter = computeJoystickCenterRg(ballPos, BALL_RADIUS_RG, SCALE);
    expect(
      shouldJoystickPadCapturePointer(
        true,
        true,
        "cue",
        padCenter,
        ballPos,
        BALL_RADIUS_RG,
        SCALE
      )
    ).toBe(true);
  });

  it("D/E — direct ball drag shows ball center even when guide is active", () => {
    const guide = createBallGuideState("cue", { x: 53, y: 20.6 });
    const ballCenter = { x: 12.4, y: 18.2 };
    const display = resolveGuideCoordinateDisplay(guide, "cue", ballCenter, {
      ballDirectDragActive: true,
    });
    expect(display).toEqual({ x: 12.4, y: 18.2, mode: "ball" });
  });

  it("F — after drag (not dragging) guide active returns guide intersection", () => {
    const guide = createBallGuideState("cue", { x: 53, y: 20.6 });
    const ballCenter = { x: 12.4, y: 18.2 };
    const display = resolveGuideCoordinateDisplay(guide, "cue", ballCenter, {
      ballDirectDragActive: false,
    });
    expect(display.mode).toBe("guide");
    expect(display.x).toBe(53);
    expect(display.y).toBe(20.6);
  });

  it("K — ball pick radius multiplier unchanged at 5×", () => {
    expect(BALL_PICK_RADIUS_MULTIPLIER).toBe(5.0);
  });
});
