/**
 * UI balls hydration SSOT.
 * Run: npx vitest run src/admin/slotAutoRecommend.test.ts
 */

import { describe, expect, it } from "vitest";
import { hydrateBallsStateForUi, normalizeBallsToBall3 } from "./slotAutoRecommend";

describe("hydrateBallsStateForUi", () => {
  it("maps Ball3.target onto UI Role field balls.target without mutating input", () => {
    const balls = {
      cue: { x: 8, y: 16 },
      target: { x: 30, y: 16 },
      second: { x: 62, y: 12 },
    };
    const before = structuredClone(balls);
    const ui = hydrateBallsStateForUi(balls);
    expect(ui.target).toEqual(balls.target);
    expect(ui.cue).toEqual(balls.cue);
    expect(ui.second).toEqual(balls.second);
    expect(ui.target_center).toBeUndefined();
    expect(balls).toEqual(before);
    expect("target_center" in balls).toBe(false);
  });

  it("maps legacy target_center onto UI balls.target when target absent", () => {
    const ui = hydrateBallsStateForUi({
      cue: { x: 1, y: 1 },
      target_center: { x: 3, y: 3 },
      second: { x: 4, y: 4 },
    });
    expect(ui.target).toEqual({ x: 3, y: 3 });
    expect(ui.target_center).toBeUndefined();
  });

  it("prefers Role balls.target over legacy target_center", () => {
    const ui = hydrateBallsStateForUi({
      cue: { x: 1, y: 1 },
      target: { x: 2, y: 2 },
      target_center: { x: 3, y: 3 },
      second: { x: 4, y: 4 },
    });
    expect(ui.target).toEqual({ x: 2, y: 2 });
    expect(ui.target_center).toBeUndefined();
  });
});

describe("normalizeBallsToBall3 Role SAVE (Phase 3)", () => {
  it("preserves Role fields and never emits target_center", () => {
    const saved = normalizeBallsToBall3({
      cue: { x: 1, y: 1 },
      target: { x: 60, y: 20 },
      second: { x: 20, y: 20 },
    });
    expect(saved).toEqual({
      cue: { x: 1, y: 1 },
      target: { x: 60, y: 20 },
      second: { x: 20, y: 20 },
    });
    expect("target_center" in saved).toBe(false);
  });
});
