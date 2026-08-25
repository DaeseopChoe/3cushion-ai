/**
 * Phase 6 — C3+ / Product / Coverage Role-native semantics.
 * Run: npx vitest run src/domain/family/c3ProductCoverage.roleSemantics.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3 } from "../positionSearchEngine";
import { placePhysicalSecondSampleOnRoleBall3 } from "../ballRole";
import { resolveC3PlusSecondBall } from "./generateC3PlusScoringDerivedMembers";

const cue = { x: 10, y: 16 };
const yellowPos = { x: 20, y: 20 };
const redPos = { x: 60, y: 20 };
const P = { x: 33, y: 11 };

describe("Phase 6 C3+ Role READ", () => {
  it("A — Target red: physical Second read = balls.second", () => {
    const balls: Ball3 = { cue, target: redPos, second: yellowPos };
    expect(resolveC3PlusSecondBall(balls, "red")).toEqual(yellowPos);
    expect(resolveC3PlusSecondBall(balls, "red")).not.toEqual(redPos);
  });

  it("B — Target yellow: physical Second read = balls.second", () => {
    const balls: Ball3 = { cue, target: yellowPos, second: redPos };
    expect(resolveC3PlusSecondBall(balls, "yellow")).toEqual(redPos);
  });

  it("C — targetColor flip does not change second field selection", () => {
    const balls: Ball3 = { cue, target: redPos, second: yellowPos };
    expect(resolveC3PlusSecondBall(balls, "red")).toEqual(
      resolveC3PlusSecondBall(balls, "yellow")
    );
  });

  it("D — physical Target is balls.target (not color-selected)", () => {
    const balls: Ball3 = { cue, target: redPos, second: yellowPos };
    expect(balls.target).toEqual(redPos);
    expect(resolveC3PlusSecondBall(balls, "red")).toEqual(balls.second);
  });
});

describe("Phase 6 Product WRITE Role", () => {
  it("CASE A — P → balls.second; Target preserved", () => {
    const base = { target: redPos, second: yellowPos };
    const product = placePhysicalSecondSampleOnRoleBall3(base, P, "red");
    expect(product.second).toEqual(P);
    expect(product.target).toEqual(redPos);
    expect(product.target).not.toEqual(P);
  });

  it("CASE B — P → balls.second; Target preserved", () => {
    const base = { target: yellowPos, second: redPos };
    const product = placePhysicalSecondSampleOnRoleBall3(base, P, "yellow");
    expect(product.second).toEqual(P);
    expect(product.target).toEqual(yellowPos);
    expect(product.target).not.toEqual(P);
  });

  it("negative — target must never become P", () => {
    for (const targetBall of ["red", "yellow"] as const) {
      const base =
        targetBall === "red"
          ? { target: redPos, second: yellowPos }
          : { target: yellowPos, second: redPos };
      const product = placePhysicalSecondSampleOnRoleBall3(base, P, targetBall);
      expect(product.target).not.toEqual(P);
      expect(product.second).toEqual(P);
    }
  });
});
