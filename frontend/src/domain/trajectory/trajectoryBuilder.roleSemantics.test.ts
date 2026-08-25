/**
 * Phase 5 — trajectoryBuilder Role Ball3 semantics.
 * Run: npx vitest run src/domain/trajectory/trajectoryBuilder.roleSemantics.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  resolveTrajectorySecondBall,
  resolveTrajectoryTargetBall,
} from "./trajectoryBuilder";
import { transformBall3 } from "../family/trackSymmetry";
import type { Ball3 } from "../positionSearchEngine";

const cue = { x: 20, y: 16 };
const yellowPos = { x: 20, y: 20 };
const redPos = { x: 60, y: 20 };

describe("Phase 5 trajectory Role readers", () => {
  it("A — CASE A Target red: Target=balls.target, Second=balls.second", () => {
    const balls = {
      cue,
      target: redPos,
      second: yellowPos,
    };
    expect(resolveTrajectoryTargetBall(balls, "red")).toEqual(redPos);
    expect(resolveTrajectorySecondBall(balls, "red")).toEqual(yellowPos);
  });

  it("B — CASE B Target yellow: Target=balls.target, Second=balls.second", () => {
    const balls = {
      cue,
      target: yellowPos,
      second: redPos,
    };
    expect(resolveTrajectoryTargetBall(balls, "yellow")).toEqual(yellowPos);
    expect(resolveTrajectorySecondBall(balls, "yellow")).toEqual(redPos);
  });

  it("C — flipping targetColor does not change Role field selection", () => {
    const balls = {
      cue,
      target: redPos,
      second: yellowPos,
    };
    expect(resolveTrajectoryTargetBall(balls, "red")).toEqual(
      resolveTrajectoryTargetBall(balls, "yellow")
    );
    expect(resolveTrajectorySecondBall(balls, "red")).toEqual(
      resolveTrajectorySecondBall(balls, "yellow")
    );
    expect(resolveTrajectoryTargetBall(balls, null)).toEqual(redPos);
    expect(resolveTrajectorySecondBall(balls, undefined)).toEqual(yellowPos);
  });

  it("D — no target/second swap under opposite targetColor", () => {
    const balls = {
      cue,
      target: redPos,
      second: yellowPos,
    };
    expect(resolveTrajectoryTargetBall(balls, "yellow")).not.toEqual(yellowPos);
    expect(resolveTrajectorySecondBall(balls, "yellow")).not.toEqual(redPos);
  });

  it("E — no color-slot normalization (target_center alias only when target absent)", () => {
    expect(
      resolveTrajectoryTargetBall(
        { target: redPos, target_center: yellowPos, second: yellowPos },
        "red"
      )
    ).toEqual(redPos);
    expect(
      resolveTrajectoryTargetBall(
        { target_center: yellowPos, second: redPos },
        "red"
      )
    ).toEqual(yellowPos);
  });
});

describe("Phase 5 transformBall3 Role identity", () => {
  const base: Ball3 = {
    cue,
    target: redPos,
    second: yellowPos,
  };

  it.each(["H", "V", "RPI"] as const)(
    "%s preserves Role fields (coords only)",
    (op) => {
      const out = transformBall3(op, base);
      expect(Object.keys(out).sort()).toEqual(["cue", "second", "target"]);
      // Field identity: transformed.target comes from base.target, not second
      const fromTarget = transformBall3(op, {
        ...base,
        target: { x: 11, y: 11 },
        second: { x: 22, y: 22 },
      });
      const fromSecond = transformBall3(op, {
        ...base,
        target: { x: 22, y: 22 },
        second: { x: 11, y: 11 },
      });
      expect(fromTarget.target).not.toEqual(fromSecond.target);
      expect(fromTarget.second).not.toEqual(fromSecond.second);
    }
  );
});
