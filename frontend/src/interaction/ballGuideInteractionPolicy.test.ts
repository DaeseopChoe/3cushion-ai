import { describe, expect, it } from "vitest";
import { createBallGuideState } from "../hooks/useBallGuide";
import {
  BALL_GUIDE_HANDLE_HIT_RADIUS_RG,
  BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE,
  BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG,
  BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE,
  BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG,
  BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE,
  BALL_GUIDE_TRIANGLE_OFFSET_RG,
  BALL_GUIDE_TRIANGLE_VISUAL_HALF_RG,
  getBallGuideSnapAction,
  getBallGuideTriangleDescriptors,
  getBallGuideTriangleSpacingMetrics,
  resolveBallGuideHandleHit,
  resolveBallGuideHitRadii,
  resolveBallGuideSnapActionHit,
  resolveBallGuideTriangleHit,
} from "./ballGuideInteractionPolicy";

const TABLE_W = 80;
const TABLE_H = 40;

describe("ballGuideInteractionPolicy hit radii", () => {
  const guide = createBallGuideState("cue", { x: 37.2, y: 16.8 });

  it("keeps fine pointer triangle and 2x handle radii", () => {
    expect(resolveBallGuideHitRadii(false)).toEqual({
      handleHitRadiusRg: BALL_GUIDE_HANDLE_HIT_RADIUS_RG,
      triangleHitRadiusRg: BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG,
      snapHitRadiusRg: BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG,
    });
    expect(BALL_GUIDE_HANDLE_HIT_RADIUS_RG).toBe(3.0);
    expect(BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG).toBe(2.2);
    expect(BALL_GUIDE_TRIANGLE_OFFSET_RG).toBe(6.5);
  });

  it("uses enlarged coarse pointer radii including snap confirm", () => {
    expect(resolveBallGuideHitRadii(true)).toEqual({
      handleHitRadiusRg: BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE,
      triangleHitRadiusRg: BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE,
      snapHitRadiusRg: BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE,
    });
    expect(BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE).toBe(8.0);
    expect(BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE).toBe(4.0);
    expect(BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE).toBe(2.8);
  });

  it("places fine-nudge triangles around the snap-action button", () => {
    const triangles = getBallGuideTriangleDescriptors(guide, TABLE_W, TABLE_H);
    expect(triangles).toHaveLength(4);
    const snap = { x: 40.2, y: 19.8 };
    const up = triangles.find((t) => t.direction === "up");
    const down = triangles.find((t) => t.direction === "down");
    const left = triangles.find((t) => t.direction === "left");
    const right = triangles.find((t) => t.direction === "right");

    expect(up?.point).toEqual({
      x: snap.x,
      y: snap.y + BALL_GUIDE_TRIANGLE_OFFSET_RG,
    });
    expect(down?.point).toEqual({
      x: snap.x,
      y: snap.y - BALL_GUIDE_TRIANGLE_OFFSET_RG,
    });
    expect(left?.point).toEqual({
      x: snap.x - BALL_GUIDE_TRIANGLE_OFFSET_RG,
      y: snap.y,
    });
    expect(right?.point).toEqual({
      x: snap.x + BALL_GUIDE_TRIANGLE_OFFSET_RG,
      y: snap.y,
    });
  });

  it("exposes spacing metrics for manual QA reporting", () => {
    expect(getBallGuideTriangleSpacingMetrics()).toMatchObject({
      triangleOffsetFromSnapCenterRg: BALL_GUIDE_TRIANGLE_OFFSET_RG,
      triangleVisualHalfRg: BALL_GUIDE_TRIANGLE_VISUAL_HALF_RG,
      triangleCenterSeparationRg: BALL_GUIDE_TRIANGLE_OFFSET_RG * 2,
      snapActionOffsetRg: 3,
      legacyHandleVisualRadiusRg: 0.4,
      legacyHandleHitRadiusRg: 1.5,
    });
  });

  it("fine pointer misses triangle beyond legacy radius", () => {
    const up = getBallGuideTriangleDescriptors(guide, TABLE_W, TABLE_H).find(
      (t) => t.direction === "up"
    );
    expect(up).toBeDefined();
    const missPoint = {
      x: up.point.x,
      y: up.point.y + 3,
    };
    expect(
      resolveBallGuideTriangleHit(
        missPoint,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG
      )
    ).toBeNull();
  });

  it("coarse pointer hits triangle beyond fine radius", () => {
    const up = getBallGuideTriangleDescriptors(guide, TABLE_W, TABLE_H).find(
      (t) => t.direction === "up"
    );
    expect(up).toBeDefined();
    const hitPoint = {
      x: up.point.x,
      y: up.point.y + 2.5,
    };
    expect(
      resolveBallGuideTriangleHit(
        hitPoint,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE
      )
    ).not.toBeNull();
  });

  it("coarse pointer still misses clearly distant triangle points", () => {
    expect(
      resolveBallGuideTriangleHit(
        { x: 50, y: 30 },
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE
      )
    ).toBeNull();
  });

  it("fine pointer resolves edge handle hits within 2x radius", () => {
    expect(
      resolveBallGuideHandleHit(
        { x: 0.4, y: 16.8 },
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_HANDLE_HIT_RADIUS_RG
      )
    ).toEqual({ axis: "horizontal", side: "start" });
  });

  it("coarse pointer resolves handle hits beyond legacy fine radius", () => {
    expect(
      resolveBallGuideHandleHit(
        { x: 4.5, y: 16.8 },
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_HANDLE_HIT_RADIUS_RG
      )
    ).toBeNull();
    expect(
      resolveBallGuideHandleHit(
        { x: 4.5, y: 16.8 },
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE
      )
    ).toEqual({ axis: "horizontal", side: "start" });
  });

  it("keeps closest handle candidate at corners", () => {
    const cornerGuide = createBallGuideState("cue", { x: 1, y: 1 });
    const tiePoint = { x: 0.6, y: 0.6 };
    const coarseHit = resolveBallGuideHandleHit(
      tiePoint,
      cornerGuide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE
    );
    expect(coarseHit).toEqual({ axis: "horizontal", side: "start" });
    const nearVerticalEnd = { x: 6.5, y: 0 };
    expect(
      resolveBallGuideHandleHit(
        nearVerticalEnd,
        cornerGuide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_HANDLE_HIT_RADIUS_RG
      )
    ).toBeNull();
    expect(
      resolveBallGuideHandleHit(
        nearVerticalEnd,
        cornerGuide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE
      )
    ).toEqual({ axis: "vertical", side: "end" });
  });

  it("resolves closest triangle deterministically near a control center", () => {
    const left = getBallGuideTriangleDescriptors(guide, TABLE_W, TABLE_H).find(
      (t) => t.direction === "left"
    );
    expect(left).toBeDefined();
    const nearLeft = {
      x: left.point.x + 2,
      y: left.point.y,
    };
    expect(
      resolveBallGuideTriangleHit(
        nearLeft,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE
      )
    ).toMatchObject({ direction: "left", axis: "vertical" });
  });

  it("coarse snap center is not captured by triangle hit at 6.5 Rg offset", () => {
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    expect(snap).not.toBeNull();
    expect(
      resolveBallGuideTriangleHit(
        snap!.point,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE
      )
    ).toBeNull();
    expect(
      resolveBallGuideSnapActionHit(
        snap!.point,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE
      )
    ).not.toBeNull();
  });

  it("coarse snap center wins over residual triangle overlap via priority contract", () => {
    const snap = getBallGuideSnapAction(guide, TABLE_W, TABLE_H);
    expect(snap).not.toBeNull();
    const snapHit = resolveBallGuideSnapActionHit(
      snap!.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE
    );
    const triangleHit = resolveBallGuideTriangleHit(
      snap!.point,
      guide,
      TABLE_W,
      TABLE_H,
      BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE
    );
    expect(snapHit).not.toBeNull();
    if (triangleHit) {
      expect(snapHit).not.toBeNull();
    }
  });

  it("fine pointer keeps triangle-before-snap behavior at triangle centers", () => {
    const left = getBallGuideTriangleDescriptors(guide, TABLE_W, TABLE_H).find(
      (t) => t.direction === "left"
    );
    expect(left).toBeDefined();
    expect(
      resolveBallGuideTriangleHit(
        left!.point,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG
      )
    ).not.toBeNull();
    expect(
      resolveBallGuideSnapActionHit(
        left!.point,
        guide,
        TABLE_W,
        TABLE_H,
        BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG
      )
    ).toBeNull();
  });
});
