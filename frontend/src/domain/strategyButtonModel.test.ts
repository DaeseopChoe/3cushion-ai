import { describe, expect, it } from "vitest";
import {
  buildStrategyButtons,
  buildStrategyButtonsFromRuntime,
  slotHasUserSearchMatch,
} from "./strategyButtonModel";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";

function makeEntry(
  slot: "S1" | "S2" | "S3",
  shotType: string
): StrategyEntry {
  return {
    slot,
    signature: { systemId: "5_half_system", formulaHash: "x", shotType },
    sysInputs: { CO: 1 },
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 1, y: 1 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
}

function makeRecord(strategies: PositionRecord["strategies"]): PositionRecord {
  return {
    positionId: "pos_1",
    balls: {
      cue: { x: 1, y: 1 },
      target: { x: 2, y: 2 },
      second: { x: 3, y: 3 },
    },
    strategies,
  };
}

describe("buildStrategyButtons", () => {
  it("returns one button per recall entry", () => {
    const buttons = buildStrategyButtons({
      recallRecord: makeRecord({ S1: makeEntry("S1", "뒤돌리기") }),
      slots: {},
      activeSlot: "S1",
    });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].label).toBe("뒤돌리기");
  });
});

describe("slotHasUserSearchMatch", () => {
  it("detects Search-applied draft meta", () => {
    expect(
      slotHasUserSearchMatch({
        draft: {
          meta: { recommendedFrom: { positionId: "pos_1", score: 0 } },
          shotType: "옆돌리기",
        },
      })
    ).toBe(true);
    expect(slotHasUserSearchMatch({ draft: { shotType: "옆돌리기" } })).toBe(false);
  });
});

describe("buildStrategyButtonsFromRuntime", () => {
  it("shows rail after Search meta without requiring table hydrate", () => {
    const buttons = buildStrategyButtonsFromRuntime({
      slots: {
        S1: {
          draft: {
            meta: { recommendedFrom: { positionId: "pos_1", score: 0 } },
            shotType: "뒤돌리기",
          },
        },
      },
      activeSlot: "S1",
    });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].hasRecall).toBe(true);
    expect(buttons[0].label).toBe("뒤돌리기");
    expect(buttons[0].hasLoadedDraft).toBe(false);
  });

  it("returns empty before Search", () => {
    expect(
      buildStrategyButtonsFromRuntime({ slots: {}, activeSlot: "S1" })
    ).toHaveLength(0);
  });

  it("enables S1 rail after Search even when activeSlot already S1 (pick is not currentButtonId-gated)", () => {
    const buttons = buildStrategyButtonsFromRuntime({
      slots: {
        S1: {
          draft: {
            meta: { recommendedFrom: { positionId: "pos_1", score: 0 } },
            shotType: "옆돌리기",
          },
        },
      },
      activeSlot: "S1",
    });
    expect(buttons[0].hasRecall).toBe(true);
    expect(buttons[0].label).toBe("옆돌리기");
  });

  it("prefers searchRecord signature shotType over draft", () => {
    const buttons = buildStrategyButtonsFromRuntime({
      searchRecord: makeRecord({ S1: makeEntry("S1", "뒤돌리기") }),
      slots: {
        S1: {
          draft: {
            meta: { recommendedFrom: { positionId: "pos_1", score: 0 } },
            shotType: "옆돌리기",
          },
        },
      },
      activeSlot: "S1",
    });
    expect(buttons[0].label).toBe("뒤돌리기");
  });

  it("falls back to 공략1/2/3 when shotType is missing (never lone 공략)", () => {
    const buttons = buildStrategyButtonsFromRuntime({
      searchRecord: makeRecord({
        S1: { ...makeEntry("S1", ""), signature: { systemId: "5_half_system", formulaHash: "x", shotType: "" } },
        S2: makeEntry("S2", ""),
      }),
      slots: {
        S1: {
          draft: {
            meta: { recommendedFrom: { positionId: "pos_1", score: 0 } },
          },
        },
        S2: {
          draft: {
            meta: { recommendedFrom: { positionId: "pos_1", score: 0 } },
          },
        },
      },
      activeSlot: "S1",
    });
    expect(buttons.map((b) => b.label)).toEqual(["공략1", "공략2"]);
  });

  it("does not show rail from runtime draft without Search meta", () => {
    expect(
      buildStrategyButtonsFromRuntime({
        slots: {
          S1: { draft: { shotType: "옆돌리기", sys: { inputs: {} } } },
        },
        activeSlot: "S1",
      })
    ).toHaveLength(0);
  });
});
