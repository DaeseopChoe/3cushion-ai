/**
 * Phase 3 — SAVE + History Role Ball3 boundary tests.
 * Run: npx vitest run src/admin/slotAutoRecommend.saveHistory.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  canonicalizeBallsStateForHistorySnapshot,
  hydrateBallsStateForUi,
  normalizeBallsToBall3,
} from "./slotAutoRecommend";

const cue = { x: 20, y: 16 };
const yellowPos = { x: 20, y: 20 };
const redPos = { x: 60, y: 20 };

describe("Phase 3 SAVE Role preservation", () => {
  it("A — SAVE Role preservation: red Target", () => {
    const ui = {
      cue,
      target: redPos,
      second: yellowPos,
    };
    const targetColor = "red" as const;
    const saved = normalizeBallsToBall3(ui);
    expect(saved.cue).toEqual(cue);
    expect(saved.target).toEqual(redPos);
    expect(saved.second).toEqual(yellowPos);
    expect("target_center" in saved).toBe(false);
    void targetColor; // metadata only — must not affect field placement
  });

  it("B — SAVE Role preservation: yellow Target", () => {
    const ui = {
      cue,
      target: yellowPos,
      second: redPos,
    };
    const saved = normalizeBallsToBall3(ui);
    expect(saved.target).toEqual(yellowPos);
    expect(saved.second).toEqual(redPos);
  });

  it("E — No color-slot normalization (red Target must not swap fields)", () => {
    const ui = { cue, target: redPos, second: yellowPos };
    const saved = normalizeBallsToBall3(ui);
    // FAIL condition from Phase 3 brief: must NOT become yellow@target / red@second
    expect(saved.target).not.toEqual(yellowPos);
    expect(saved.second).not.toEqual(redPos);
    expect(saved.target).toEqual(redPos);
    expect(saved.second).toEqual(yellowPos);
  });

  it("F — UI → SAVE continuity (canonical UI Ball3 equals saved Ball3)", () => {
    const uiA = { cue, target: redPos, second: yellowPos };
    const uiB = { cue, target: yellowPos, second: redPos };
    expect(normalizeBallsToBall3(uiA)).toEqual({
      cue,
      target: redPos,
      second: yellowPos,
    });
    expect(normalizeBallsToBall3(uiB)).toEqual({
      cue,
      target: yellowPos,
      second: redPos,
    });
  });

  it("target_center shape alias → Role target without yellow-slot meaning", () => {
    const saved = normalizeBallsToBall3({
      cue,
      target_center: redPos,
      second: yellowPos,
    });
    expect(saved.target).toEqual(redPos);
    expect(saved.second).toEqual(yellowPos);
    expect("target_center" in saved).toBe(false);
  });
});

describe("Phase 3 History Role round-trip", () => {
  function saveHistoryRestore(uiBalls: {
    cue: { x: number; y: number };
    target: { x: number; y: number };
    second: { x: number; y: number };
  }, targetColor: "red" | "yellow") {
    // SAVE → LocalDB Ball3
    const savedBall3 = normalizeBallsToBall3(uiBalls);
    // History snapshot write
    const snapshotBalls = canonicalizeBallsStateForHistorySnapshot(uiBalls);
    const snapshot = {
      ballsState: snapshotBalls,
      targetBall: targetColor,
      datasetRecordBalls: savedBall3,
    };
    // History restore → UI
    const restoredUi = hydrateBallsStateForUi(snapshot.ballsState);
    const restoredTargetColor = snapshot.targetBall;
    return { savedBall3, snapshot, restoredUi, restoredTargetColor };
  }

  it("C — History round-trip: red Target", () => {
    const ui = { cue, target: redPos, second: yellowPos };
    const { savedBall3, snapshot, restoredUi, restoredTargetColor } =
      saveHistoryRestore(ui, "red");

    expect(savedBall3.target).toEqual(redPos);
    expect(savedBall3.second).toEqual(yellowPos);

    expect(snapshot.ballsState.target).toEqual(redPos);
    expect(snapshot.ballsState.second).toEqual(yellowPos);
    expect(snapshot.ballsState.target_center).toBeUndefined();
    expect(snapshot.targetBall).toBe("red");

    expect(restoredUi.target).toEqual(redPos);
    expect(restoredUi.second).toEqual(yellowPos);
    expect(restoredTargetColor).toBe("red");
  });

  it("D — History round-trip: yellow Target", () => {
    const ui = { cue, target: yellowPos, second: redPos };
    const { savedBall3, snapshot, restoredUi, restoredTargetColor } =
      saveHistoryRestore(ui, "yellow");

    expect(savedBall3.target).toEqual(yellowPos);
    expect(savedBall3.second).toEqual(redPos);
    expect(snapshot.ballsState.target).toEqual(yellowPos);
    expect(snapshot.ballsState.second).toEqual(redPos);
    expect(restoredUi.target).toEqual(yellowPos);
    expect(restoredUi.second).toEqual(redPos);
    expect(restoredTargetColor).toBe("yellow");
  });

  it("History write strips legacy target_center key", () => {
    const snap = canonicalizeBallsStateForHistorySnapshot({
      cue,
      target: redPos,
      target_center: yellowPos,
      second: yellowPos,
    });
    expect(snap.target).toEqual(redPos);
    expect(snap.target_center).toBeUndefined();
  });
});
