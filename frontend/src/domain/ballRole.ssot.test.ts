/**
 * Role-based Ball3 SSOT — Phase 1 foundation tests.
 * Run: npx vitest run src/domain/ballRole.ssot.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  oppositeColor,
  physicalSecondFromBall3,
  physicalTargetFromBall3,
  placePhysicalSecondSampleOnRoleBall3,
  secondColorFromTargetColor,
} from "./ballRole";

describe("Role-based Ball3 SSOT (Phase 1)", () => {
  const redPos = { x: 60, y: 20 };
  const yellowPos = { x: 20, y: 20 };
  const cue = { x: 32, y: 18 };

  it("CASE A targetColor=red: field names stay roles (no color→field swap)", () => {
    const targetColor = "red" as const;
    const balls = {
      cue,
      target: redPos,
      second: yellowPos,
    };
    expect(physicalTargetFromBall3(balls)).toEqual(redPos);
    expect(physicalSecondFromBall3(balls)).toEqual(yellowPos);
    expect(secondColorFromTargetColor(targetColor)).toBe("yellow");
    expect(oppositeColor(targetColor)).toBe("yellow");
    // Color metadata must not remapped fields:
    expect(balls.target).toEqual(redPos);
    expect(balls.second).toEqual(yellowPos);
  });

  it("CASE B targetColor=yellow: field names stay roles (no color→field swap)", () => {
    const targetColor = "yellow" as const;
    const balls = {
      cue,
      target: yellowPos,
      second: redPos,
    };
    expect(physicalTargetFromBall3(balls)).toEqual(yellowPos);
    expect(physicalSecondFromBall3(balls)).toEqual(redPos);
    expect(secondColorFromTargetColor(targetColor)).toBe("red");
    expect(balls.target).toEqual(yellowPos);
    expect(balls.second).toEqual(redPos);
  });

  it("canonical Product write: P always lands on balls.second", () => {
    const P = { x: 33, y: 11 };
    const baseA = { target: redPos, second: yellowPos };
    const baseB = { target: yellowPos, second: redPos };
    expect(placePhysicalSecondSampleOnRoleBall3(baseA, P, "red")).toEqual({
      target: redPos,
      second: P,
    });
    expect(placePhysicalSecondSampleOnRoleBall3(baseB, P, "yellow")).toEqual({
      target: yellowPos,
      second: P,
    });
  });
});
