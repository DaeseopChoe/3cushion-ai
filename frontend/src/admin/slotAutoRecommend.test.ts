/**
 * UI balls hydration SSOT.
 * Run: npx vitest run src/admin/slotAutoRecommend.test.ts
 */

import { describe, expect, it } from "vitest";
import { hydrateBallsStateForUi } from "./slotAutoRecommend";

describe("hydrateBallsStateForUi", () => {
  it("maps Ball3.target onto UI target_center without mutating input", () => {
    const balls = {
      cue: { x: 8, y: 16 },
      target: { x: 30, y: 16 },
      second: { x: 62, y: 12 },
    };
    const before = structuredClone(balls);
    const ui = hydrateBallsStateForUi(balls);
    expect(ui.target_center).toEqual(balls.target);
    expect(ui.cue).toEqual(balls.cue);
    expect(ui.second).toEqual(balls.second);
    expect(ui.target).toBeUndefined();
    expect(balls).toEqual(before);
    expect("target_center" in balls).toBe(false);
  });

  it("prefers existing target_center over target", () => {
    const ui = hydrateBallsStateForUi({
      cue: { x: 1, y: 1 },
      target: { x: 2, y: 2 },
      target_center: { x: 3, y: 3 },
      second: { x: 4, y: 4 },
    });
    expect(ui.target_center).toEqual({ x: 3, y: 3 });
  });
});
