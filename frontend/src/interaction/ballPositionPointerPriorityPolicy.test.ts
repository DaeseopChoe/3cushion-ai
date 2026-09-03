import { describe, expect, it } from "vitest";
import {
  createBallGuideState,
  setBallGuideIntersection,
} from "../hooks/useBallGuide";
import {
  BALL_GUIDE_HANDLE_HIT_RADIUS_RG,
  BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE,
  BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG,
  BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE,
  BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG,
  getBallGuideSnapAction,
  resolveBallGuideHandleHit,
  resolveBallGuideSnapActionHit,
  resolveBallGuideTriangleHit,
} from "./ballGuideInteractionPolicy";
import { resolveGuideCoordinateDisplay } from "./ballGuideCoordinatePolicy";
import {
  BALL_PICK_RADIUS_MULTIPLIER,
  BALL_POSITION_JOYSTICK_PAD_VISIBLE,
  shouldJoystickPadCapturePointer,
} from "./joystickInteractionPolicy";
import {
  resolveBallVisualCoreHit,
  resolveClosestBallHit,
  shouldPreferSnapOverRailHandle,
} from "./ballPositionPointerPriorityPolicy";

const TABLE_W = 80;
const TABLE_H = 40;
/** Matches App.jsx BALL_RADIUS_RG ≈ 61.5/35.55/2 */
const BALL_RADIUS_RG = 61.5 / 35.55 / 2;
const BALL_PICK_RADIUS_RG = BALL_RADIUS_RG * BALL_PICK_RADIUS_MULTIPLIER;

describe("ballPositionPointerPriorityPolicy", () => {
  it("1 — guide-active same-ball center is inside visual core", () => {
    const ball = { x: 40, y: 20 };
    const hit = resolveBallVisualCoreHit(
      ball,
      { cue: ball },
      BALL_RADIUS_RG
    );
    expect(hit).toEqual({ id: "cue", pos: ball });
  });

  it("2 — same-ball reselect core still resolves (guide association irrelevant)", () => {
    const ball = { x: 55, y: 18 };
    const guide = createBallGuideState("cue", ball);
    expect(guide.ballId).toBe("cue");
    expect(
      resolveBallVisualCoreHit(ball, { cue: ball }, BALL_RADIUS_RG)?.id
    ).toBe("cue");
  });

  it("3 — outside visual core but inside 5× pick still expands; core miss", () => {
    const ball = { x: 40, y: 20 };
    const offset = {
      x: ball.x + BALL_RADIUS_RG + 0.5,
      y: ball.y,
    };
    expect(
      resolveBallVisualCoreHit(offset, { cue: ball }, BALL_RADIUS_RG)
    ).toBeNull();
    expect(
      resolveClosestBallHit(offset, { cue: ball }, BALL_PICK_RADIUS_RG)?.id
    ).toBe("cue");
  });

  it("4a — ball visual core preferred over snap geometry for core press", () => {
    const ball = { x: 40, y: 20 };
    const guide = createBallGuideState("cue", ball);
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    expect(snap).not.toBeNull();
    // Core at ball center is outside fine snap radius (~4.24 away).
    expect(
      resolveBallGuideSnapActionHit(
        ball,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG
      )
    ).toBeNull();
    expect(
      resolveBallVisualCoreHit(ball, { cue: ball }, BALL_RADIUS_RG)?.id
    ).toBe("cue");
  });

  it("4b — clear snap press is a snap hit (not ball core)", () => {
    const ball = { x: 40, y: 20 };
    const guide = createBallGuideState("cue", ball);
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    expect(
      resolveBallVisualCoreHit(snap.point, { cue: ball }, BALL_RADIUS_RG)
    ).toBeNull();
    expect(
      resolveBallGuideSnapActionHit(
        snap.point,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG
      )
    ).not.toBeNull();
  });

  it("5 — edge (78.6,38.6): snap hit prefers snap over rail handle", () => {
    const guide = createBallGuideState("cue", { x: 78.6, y: 38.6 });
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    expect(snap?.point).toEqual({ x: 78.5, y: 38.5 });
    const handleHit = resolveBallGuideHandleHit(
      snap.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_HANDLE_HIT_RADIUS_RG
    );
    const snapHit = resolveBallGuideSnapActionHit(
      snap.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG
    );
    expect(handleHit).not.toBeNull();
    expect(snapHit).not.toBeNull();
    expect(shouldPreferSnapOverRailHandle(snapHit, handleHit)).toBe(true);
  });

  it("6 — edge (76.0,36.4): snap prefers snap over rail handle", () => {
    const guide = createBallGuideState("cue", { x: 76.0, y: 36.4 });
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    expect(snap?.point).toEqual({ x: 78.5, y: 38.5 });
    const handleHit = resolveBallGuideHandleHit(
      snap.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_HANDLE_HIT_RADIUS_RG
    );
    const snapHit = resolveBallGuideSnapActionHit(
      snap.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG
    );
    expect(handleHit).not.toBeNull();
    expect(snapHit).not.toBeNull();
    expect(shouldPreferSnapOverRailHandle(snapHit, handleHit)).toBe(true);
  });

  it("7 — rail handle outside snap still resolves as handle-only", () => {
    const guide = createBallGuideState("cue", { x: 40, y: 20 });
    const handleOnlyPoint = { x: 80, y: 20 };
    const handleHit = resolveBallGuideHandleHit(
      handleOnlyPoint,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_HANDLE_HIT_RADIUS_RG
    );
    const snapHit = resolveBallGuideSnapActionHit(
      handleOnlyPoint,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG
    );
    expect(handleHit).toEqual({ axis: "horizontal", side: "end" });
    expect(snapHit).toBeNull();
    expect(shouldPreferSnapOverRailHandle(snapHit, handleHit)).toBe(false);
  });

  it("8 — triangle ±0.1 hit still resolves at triangle center", () => {
    const guide = createBallGuideState("cue", { x: 40, y: 20 });
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    const up = { x: snap.point.x, y: snap.point.y + 6.5 };
    expect(
      resolveBallGuideTriangleHit(
        up,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG
      )?.direction
    ).toBe("up");
  });

  it("9 — BALL_PICK_RADIUS_RG remains 5× visual radius", () => {
    expect(BALL_PICK_RADIUS_MULTIPLIER).toBe(5.0);
    expect(BALL_PICK_RADIUS_RG).toBeCloseTo(BALL_RADIUS_RG * 5.0, 10);
  });

  it("10 — hidden joystick never captures pointer", () => {
    expect(BALL_POSITION_JOYSTICK_PAD_VISIBLE).toBe(false);
    expect(
      shouldJoystickPadCapturePointer(
        BALL_POSITION_JOYSTICK_PAD_VISIBLE,
        true,
        "cue",
        { x: 40, y: 20 },
        { x: 40, y: 20 },
        BALL_RADIUS_RG,
        10
      )
    ).toBe(false);
  });

  it("11 — guide-active ball drag label uses live ball center", () => {
    const guide = createBallGuideState("cue", { x: 53, y: 20.6 });
    const live = { x: 41.2, y: 19.1 };
    expect(
      resolveGuideCoordinateDisplay(guide, "cue", live, {
        ballDirectDragActive: true,
      })
    ).toEqual({ x: 41.2, y: 19.1, mode: "ball" });
  });

  it("pointer-up after sync: label uses guide == final ball (no stale 20,20)", () => {
    const staleGuide = createBallGuideState("cue", { x: 20, y: 20 });
    const finalBall = { x: 33.7, y: 22.1 };
    const synced = setBallGuideIntersection(staleGuide, finalBall);
    const afterUp = resolveGuideCoordinateDisplay(synced, "cue", finalBall, {
      ballDirectDragActive: false,
    });
    expect(afterUp).toEqual({ x: 33.7, y: 22.1, mode: "guide" });
    expect(afterUp.x).not.toBe(20);
    expect(afterUp.y).not.toBe(20);
  });

  it("coarse edge snap also prefers snap over enlarged handle", () => {
    const guide = createBallGuideState("cue", { x: 78.6, y: 38.6 });
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    const handleHit = resolveBallGuideHandleHit(
      snap.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE
    );
    const snapHit = resolveBallGuideSnapActionHit(
      snap.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE
    );
    expect(shouldPreferSnapOverRailHandle(snapHit, handleHit)).toBe(true);
  });
});
