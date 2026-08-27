import { describe, expect, it } from "vitest";
import {
  EMPTY_BALL_GUIDE,
  createBallGuideState,
  selectBallGuideState,
  updateBallGuideFromPointer,
  updateBallGuideAxis,
} from "./useBallGuide";
import {
  ballGuideArrowDeltaRg,
  getBallGuideSnapAction,
  getBallGuideArrowDescriptors,
  GUIDE_ALT_DRAG_FACTOR,
  GUIDE_FINE_STEP_RG,
  resolveBallGuideArrowHit,
  resolveBallGuideHandleHit,
  resolveBallGuideSnapActionHit,
} from "../interaction/ballGuideInteractionPolicy";

describe("Ball Guide runtime state", () => {
  it("creates both guide coordinates at the selected ball center", () => {
    expect(createBallGuideState("cue", { x: 12.3, y: 27.4 })).toEqual({
      active: true,
      ballId: "cue",
      horizontalY: 27.4,
      verticalX: 12.3,
    });
  });

  it("preserves the existing session when the same ball is selected again", () => {
    const existing = {
      active: true,
      ballId: "cue",
      horizontalY: 25,
      verticalX: 10,
    };

    expect(selectBallGuideState(existing, "cue", { x: 30, y: 35 })).toBe(
      existing
    );
  });

  it("replaces the session at the new ball center", () => {
    const existing = createBallGuideState("cue", { x: 10, y: 20 });

    expect(selectBallGuideState(existing, "target", { x: 30, y: 35 })).toEqual({
      active: true,
      ballId: "target",
      horizontalY: 35,
      verticalX: 30,
    });
  });

  it("clears to the runtime empty state", () => {
    expect(EMPTY_BALL_GUIDE).toEqual({
      active: false,
      ballId: null,
      horizontalY: null,
      verticalX: null,
    });
  });

  it("resolves all four end handles before ball hit-testing", () => {
    const guide = createBallGuideState("cue", { x: 37.2, y: 16.8 });

    expect(
      resolveBallGuideHandleHit({ x: 0.4, y: 16.8 }, guide, 80, 40)
    ).toEqual({ axis: "horizontal", side: "start" });
    expect(
      resolveBallGuideHandleHit({ x: 79.6, y: 16.8 }, guide, 80, 40)
    ).toEqual({ axis: "horizontal", side: "end" });
    expect(
      resolveBallGuideHandleHit({ x: 37.2, y: 39.6 }, guide, 80, 40)
    ).toEqual({ axis: "vertical", side: "start" });
    expect(
      resolveBallGuideHandleHit({ x: 37.2, y: 0.4 }, guide, 80, 40)
    ).toEqual({ axis: "vertical", side: "end" });
  });

  it("does not resolve a handle outside its hit radius", () => {
    const guide = createBallGuideState("cue", { x: 37.2, y: 16.8 });

    expect(
      resolveBallGuideHandleHit({ x: 3, y: 16.8 }, guide, 80, 40)
    ).toBeNull();
  });

  it("updates only the dragged axis and clamps horizontal bounds", () => {
    const guide = createBallGuideState("cue", { x: 37.2, y: 16.8 });

    expect(updateBallGuideAxis(guide, "horizontal", -4)).toMatchObject({
      horizontalY: 0.5,
      verticalX: 37.2,
      ballId: "cue",
    });
    expect(updateBallGuideAxis(guide, "horizontal", 44)).toMatchObject({
      horizontalY: 39.5,
      verticalX: 37.2,
    });
  });

  it("updates only the dragged axis and clamps vertical bounds", () => {
    const guide = createBallGuideState("cue", { x: 37.2, y: 16.8 });

    expect(updateBallGuideAxis(guide, "vertical", -4)).toMatchObject({
      verticalX: 0.5,
      horizontalY: 16.8,
    });
    expect(updateBallGuideAxis(guide, "vertical", 84)).toMatchObject({
      verticalX: 79.5,
      horizontalY: 16.8,
    });
  });

  it("exposes only vertical arrows for H and horizontal arrows for V", () => {
    const arrows = getBallGuideArrowDescriptors(
      createBallGuideState("cue", { x: 37.2, y: 16.8 }),
      80,
      40
    );

    expect(arrows.map(({ direction }) => direction)).toEqual([
      "up",
      "down",
      "left",
      "right",
    ]);
    expect(arrows.filter(({ axis }) => axis === "horizontal")).toHaveLength(2);
    expect(arrows.filter(({ axis }) => axis === "vertical")).toHaveLength(2);
  });

  it("maps arrows to signed 0.1 Rg nudge deltas", () => {
    expect(ballGuideArrowDeltaRg("up")).toBe(GUIDE_FINE_STEP_RG);
    expect(ballGuideArrowDeltaRg("right")).toBe(GUIDE_FINE_STEP_RG);
    expect(ballGuideArrowDeltaRg("down")).toBe(-GUIDE_FINE_STEP_RG);
    expect(ballGuideArrowDeltaRg("left")).toBe(-GUIDE_FINE_STEP_RG);
  });

  it("nudges H upward in Rg while preserving V", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });

    const next = updateBallGuideAxis(
      guide,
      "horizontal",
      guide.horizontalY + ballGuideArrowDeltaRg("up")
    );
    expect(next).toMatchObject({ horizontalY: 20.1, verticalX: 30 });
  });

  it("nudges V left in Rg while preserving H", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });

    const next = updateBallGuideAxis(
      guide,
      "vertical",
      guide.verticalX + ballGuideArrowDeltaRg("left")
    );
    expect(next).toMatchObject({ horizontalY: 20, verticalX: 29.9 });
  });

  it("hits arrows before falling through to nearby Ball selection", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });
    const up = getBallGuideArrowDescriptors(guide, 80, 40).find(
      ({ direction }) => direction === "up"
    );

    expect(resolveBallGuideArrowHit(up.point, guide, 80, 40)).toMatchObject({
      axis: "horizontal",
      direction: "up",
    });
  });

  it("keeps arrow hit positions outside the handle hit radius", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });

    for (const arrow of getBallGuideArrowDescriptors(guide, 80, 40)) {
      expect(
        resolveBallGuideHandleHit(arrow.point, guide, 80, 40)
      ).toBeNull();
    }
  });

  it("clamps arrow nudges at all four axis bounds", () => {
    const upperH = createBallGuideState("cue", { x: 30, y: 39.5 });
    const lowerH = createBallGuideState("cue", { x: 30, y: 0.5 });
    const upperV = createBallGuideState("cue", { x: 79.5, y: 20 });
    const lowerV = createBallGuideState("cue", { x: 0.5, y: 20 });

    expect(
      updateBallGuideAxis(
        upperH,
        "horizontal",
        upperH.horizontalY + ballGuideArrowDeltaRg("up")
      ).horizontalY
    ).toBe(39.5);
    expect(
      updateBallGuideAxis(
        lowerH,
        "horizontal",
        lowerH.horizontalY + ballGuideArrowDeltaRg("down")
      ).horizontalY
    ).toBe(0.5);
    expect(
      updateBallGuideAxis(
        upperV,
        "vertical",
        upperV.verticalX + ballGuideArrowDeltaRg("right")
      ).verticalX
    ).toBe(79.5);
    expect(
      updateBallGuideAxis(
        lowerV,
        "vertical",
        lowerV.verticalX + ballGuideArrowDeltaRg("left")
      ).verticalX
    ).toBe(0.5);
  });

  it("uses the drag-start reference for normal H and V movement", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });
    const hDrag = {
      active: true,
      axis: "horizontal" as const,
      pointerId: 1,
      startRg: { x: 30, y: 20 },
      startValue: 20,
      precisionFactor: 1,
    };
    const vDrag = {
      active: true,
      axis: "vertical" as const,
      pointerId: 2,
      startRg: { x: 30, y: 20 },
      startValue: 30,
      precisionFactor: 1,
    };

    expect(updateBallGuideFromPointer(guide, hDrag, { x: 99, y: 25 })).toMatchObject({
      horizontalY: 25,
      verticalX: 30,
    });
    expect(updateBallGuideFromPointer(guide, vDrag, { x: 38, y: -4 })).toMatchObject({
      horizontalY: 20,
      verticalX: 38,
    });
  });

  it("scales H/V Rg deltas by the Alt precision factor without drift", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });
    const hDrag = {
      active: true,
      axis: "horizontal" as const,
      pointerId: 1,
      startRg: { x: 30, y: 20 },
      startValue: 20,
      precisionFactor: GUIDE_ALT_DRAG_FACTOR,
    };
    const vDrag = {
      active: true,
      axis: "vertical" as const,
      pointerId: 2,
      startRg: { x: 30, y: 20 },
      startValue: 30,
      precisionFactor: GUIDE_ALT_DRAG_FACTOR,
    };

    expect(updateBallGuideFromPointer(guide, hDrag, { x: 99, y: 25 })).toMatchObject({
      horizontalY: 20.5,
      verticalX: 30,
    });
    expect(updateBallGuideFromPointer(guide, vDrag, { x: 38, y: -4 })).toMatchObject({
      horizontalY: 20,
      verticalX: 30.8,
    });
  });

  it("preserves negative Alt drag direction and applies existing clamps", () => {
    const guide = createBallGuideState("cue", { x: 79.5, y: 0.5 });
    const hDrag = {
      active: true,
      axis: "horizontal" as const,
      pointerId: 1,
      startRg: { x: 79.5, y: 0.5 },
      startValue: 0.5,
      precisionFactor: GUIDE_ALT_DRAG_FACTOR,
    };
    const vDrag = {
      active: true,
      axis: "vertical" as const,
      pointerId: 2,
      startRg: { x: 79.5, y: 0.5 },
      startValue: 79.5,
      precisionFactor: GUIDE_ALT_DRAG_FACTOR,
    };

    expect(
      updateBallGuideFromPointer(guide, hDrag, { x: 0, y: -20 })
    ).toMatchObject({
      horizontalY: 0.5,
      verticalX: 79.5,
    });
    expect(
      updateBallGuideFromPointer(guide, vDrag, { x: 0, y: -20 })
    ).toMatchObject({
      horizontalY: 0.5,
      verticalX: 71.55,
    });
  });

  it("exposes a snap action only for a valid active guide session", () => {
    const guide = createBallGuideState("cue", { x: 30, y: 20 });
    const action = getBallGuideSnapAction(guide, 80, 40);

    expect(action).toEqual({
      target: { x: 30, y: 20 },
      point: { x: 33, y: 23 },
    });
    expect(
      getBallGuideSnapAction(
        { ...guide, active: false },
        80,
        40
      )
    ).toBeNull();
    expect(
      getBallGuideSnapAction(
        { ...guide, ballId: null },
        80,
        40
      )
    ).toBeNull();
    expect(
      getBallGuideSnapAction(
        { ...guide, horizontalY: null },
        80,
        40
      )
    ).toBeNull();
    expect(
      getBallGuideSnapAction(
        { ...guide, verticalX: Number.NaN },
        80,
        40
      )
    ).toBeNull();
  });

  it("keeps the snap target logical while keeping the action inside table edges", () => {
    const guide = createBallGuideState("cue", { x: 79.5, y: 39.5 });
    const action = getBallGuideSnapAction(guide, 80, 40);

    expect(action).toEqual({
      target: { x: 79.5, y: 39.5 },
      point: { x: 78.5, y: 38.5 },
    });
    expect(resolveBallGuideSnapActionHit(action.point, guide, 80, 40)).toEqual(
      action
    );
    expect(
      resolveBallGuideSnapActionHit({ x: 74, y: 34 }, guide, 80, 40)
    ).toBeNull();
  });
});
