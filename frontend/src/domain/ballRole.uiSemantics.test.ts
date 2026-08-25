/**
 * Role-based Ball3 UI semantics — Phase 2.
 * Run: npx vitest run src/domain/ballRole.uiSemantics.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  BALL_PAINT_HEX,
  lockTargetRoleFromClickedBall,
  paintHexForSecondRole,
  paintHexForTargetRole,
  uiTargetRoleCoords,
} from "./ballRole";

describe("Phase 2 UI Role semantics", () => {
  const yellowPos = { x: 20, y: 20 };
  const redPos = { x: 60, y: 20 };
  const cue = { x: 20, y: 16 };

  it("TEST A — targetColor=red: Role fields + paint", () => {
    const targetColor = "red" as const;
    const balls = { cue, target: redPos, second: yellowPos };
    expect(balls.target).toEqual(redPos);
    expect(balls.second).toEqual(yellowPos);
    expect(paintHexForTargetRole(targetColor)).toBe(BALL_PAINT_HEX.red);
    expect(paintHexForSecondRole(targetColor)).toBe(BALL_PAINT_HEX.yellow);
  });

  it("TEST B — targetColor=yellow: Role fields + paint", () => {
    const targetColor = "yellow" as const;
    const balls = { cue, target: yellowPos, second: redPos };
    expect(balls.target).toEqual(yellowPos);
    expect(balls.second).toEqual(redPos);
    expect(paintHexForTargetRole(targetColor)).toBe(BALL_PAINT_HEX.yellow);
    expect(paintHexForSecondRole(targetColor)).toBe(BALL_PAINT_HEX.red);
  });

  it("TEST C — Target Lock yellow → red (select second)", () => {
    const before = {
      cue,
      target: yellowPos,
      second: redPos,
    };
    const after = lockTargetRoleFromClickedBall(before, "second", "yellow");
    expect(after.targetColor).toBe("red");
    expect(after.balls.target).toEqual(redPos);
    expect(after.balls.second).toEqual(yellowPos);
    expect(after.balls.target_center).toBeUndefined();
    expect(paintHexForTargetRole(after.targetColor)).toBe(BALL_PAINT_HEX.red);
    expect(paintHexForSecondRole(after.targetColor)).toBe(BALL_PAINT_HEX.yellow);
  });

  it("TEST D — Target Lock red → yellow (select second under red Target)", () => {
    const before = {
      cue,
      target: redPos,
      second: yellowPos,
    };
    const after = lockTargetRoleFromClickedBall(before, "second", "red");
    expect(after.targetColor).toBe("yellow");
    expect(after.balls.target).toEqual(yellowPos);
    expect(after.balls.second).toEqual(redPos);
  });

  it("TEST C/D — locking current Target Role keeps coordinates + color", () => {
    const yellowLock = lockTargetRoleFromClickedBall(
      { cue, target: yellowPos, second: redPos },
      "target",
      "yellow"
    );
    expect(yellowLock.targetColor).toBe("yellow");
    expect(yellowLock.balls.target).toEqual(yellowPos);
    expect(yellowLock.balls.second).toEqual(redPos);

    const redLock = lockTargetRoleFromClickedBall(
      { cue, target: redPos, second: yellowPos },
      "target",
      "red"
    );
    expect(redLock.targetColor).toBe("red");
    expect(redLock.balls.target).toEqual(redPos);
    expect(redLock.balls.second).toEqual(yellowPos);
  });

  it("yellow → red → yellow Target Lock round-trip preserves coords", () => {
    const start = { cue, target: yellowPos, second: redPos };
    const toRed = lockTargetRoleFromClickedBall(start, "second", "yellow");
    expect(toRed.targetColor).toBe("red");
    expect(toRed.balls.target).toEqual(redPos);
    expect(toRed.balls.second).toEqual(yellowPos);
    expect(toRed.balls.cue).toEqual(cue);

    const backYellow = lockTargetRoleFromClickedBall(
      toRed.balls,
      "second",
      "red"
    );
    expect(backYellow.targetColor).toBe("yellow");
    expect(backYellow.balls.target).toEqual(yellowPos);
    expect(backYellow.balls.second).toEqual(redPos);
    expect(backYellow.balls.cue).toEqual(cue);
    expect(backYellow.balls.target).not.toEqual(backYellow.balls.second);
  });

  it("TEST E — Drag mutates Role fields only (not color→field)", () => {
    // Simulate Target drag under CASE A (red Target)
    const ballsA = { cue, target: { ...redPos }, second: { ...yellowPos } };
    ballsA.target = { x: 25, y: 22 };
    expect(ballsA.target).toEqual({ x: 25, y: 22 });
    expect(ballsA.second).toEqual(yellowPos);

    // Simulate Second drag under CASE B (yellow Target)
    const ballsB = { cue, target: { ...yellowPos }, second: { ...redPos } };
    ballsB.second = { x: 55, y: 18 };
    expect(ballsB.target).toEqual(yellowPos);
    expect(ballsB.second).toEqual({ x: 55, y: 18 });
  });

  it("TEST F — Cue remains white Role / identity", () => {
    const balls = { cue, target: yellowPos, second: redPos };
    expect(balls.cue).toEqual(cue);
    expect(BALL_PAINT_HEX.white).toBe("#ffffff");
  });

  it("uiTargetRoleCoords prefers balls.target over legacy target_center", () => {
    expect(
      uiTargetRoleCoords({
        target: yellowPos,
        target_center: redPos,
        second: redPos,
      })
    ).toEqual(yellowPos);
    expect(
      uiTargetRoleCoords({
        target_center: redPos,
        second: yellowPos,
      })
    ).toEqual(redPos);
  });
});
