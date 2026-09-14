/**
 * SystemValueLabels Focus FRAME/RAIL + initial hide contracts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSystemValueLabelPresentationEntries } from "./SystemValueLabels.jsx";
import {
  CUSHION_FOCUS_VALUE_COLOR,
  FOCUS_FRAME_EDGE,
  FOCUS_RAIL_EDGE,
  resolveFocusedSystemLabelSize,
} from "../../renderer/labels/cushionValuePanelModel";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "SystemValueLabels.jsx"),
  "utf8"
);

const sampleAnchors = {
  CO: [
    { coord: { x: 40, y: -2.25 }, value: 30 },
    { coord: { x: -2.25, y: 10 }, value: 60 },
  ],
  C1: [{ coord: { x: 50, y: 42.25 }, value: 20 }],
  C3: [
    { coord: { x: 70, y: 0 }, value: 10 },
    { coord: { x: 30, y: 0 }, value: 60 },
  ],
  C4: [{ coord: { x: 20, y: 0 }, value: 40 }],
  C5: [{ coord: { x: 25, y: 0 }, value: 35 }],
  C6: [{ coord: { x: -2.25, y: 0 }, value: 60 }],
};

const baseArgs = {
  labelAnchors: sampleAnchors,
  scale: 10,
  tableH: 400,
  padding: 20,
  labelScale: 1.5,
  showAxisCaptions: false,
};

function entries(focusOpts, showAxisCaptions = false) {
  return buildSystemValueLabelPresentationEntries({
    ...baseArgs,
    showAxisCaptions,
    focusOpts,
  });
}

function rawEntries(focusOpts) {
  return entries(focusOpts).filter((e) => e.id?.startsWith("RAW-"));
}

describe("initial selection 0 hides system values", () => {
  it("focus feature on + empty selection → zero system labels", () => {
    const list = entries({
      families: [],
      fontSize: 30,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    expect(list).toHaveLength(0);
  });

  it("focus feature off (null) still shows legacy labels", () => {
    const list = rawEntries(null);
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("Focus FRAME/RAIL positions", () => {
  const fontSize = resolveFocusedSystemLabelSize({ clientHeight: 400 });

  it("C4 snaps to FRAME (not old nudge / cloth)", () => {
    const list = rawEntries({
      families: ["C4"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    expect(list).toHaveLength(1);
    expect(list[0].layer).toBe("FRAME");
    expect(list[0].fgX).toBe(20);
    expect(list[0].fgY).toBe(FOCUS_FRAME_EDGE.bottom);
  });

  it("C5 and C6 snap to FRAME", () => {
    const list = rawEntries({
      families: ["C5", "C6"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    const c5 = list.find((e) => e.family === "C5");
    const c6 = list.find((e) => e.family === "C6");
    expect(c5.layer).toBe("FRAME");
    expect(c5.fgY).toBe(FOCUS_FRAME_EDGE.bottom);
    expect(c6.layer).toBe("FRAME");
    expect(c6.fgX).toBe(FOCUS_FRAME_EDGE.left);
    expect(c6.fgY).toBe(0);
  });

  it("C3 stays on RAIL cloth edge", () => {
    const list = rawEntries({
      families: ["C3"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    expect(list.every((e) => e.layer === "RAIL")).toBe(true);
    expect(list.every((e) => e.fgY === FOCUS_RAIL_EDGE.bottom)).toBe(true);
  });

  it("CO/C1 stay on FRAME; along-axis preserved", () => {
    const list = rawEntries({
      families: ["CO", "C1"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    const co = list.find((e) => e.family === "CO" && e.fgX === 40);
    const c1 = list.find((e) => e.family === "C1");
    expect(co.layer).toBe("FRAME");
    expect(co.fgY).toBe(FOCUS_FRAME_EDGE.bottom);
    expect(c1.layer).toBe("FRAME");
    expect(c1.fgY).toBe(FOCUS_FRAME_EDGE.top);
    expect(c1.fgX).toBe(50);
  });

  it("Focus path does not apply old C4/C5/C6 collision nudge values", () => {
    const list = rawEntries({
      families: ["C4", "C5", "C6"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    // Old nudge would place C4 bottom at -0.5, C5 at 0.5, C6 at -1
    expect(list.some((e) => e.fgY === -0.5 || e.fgY === 0.5 || e.fgY === -1)).toBe(
      false
    );
  });
});

describe("selection filter + typography", () => {
  it("selection ≥1 shows only selected families", () => {
    const list = rawEntries({
      families: ["CO"],
      fontSize: 30,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    expect(list.every((e) => e.family === "CO")).toBe(true);
  });

  it("caption and value share Focus typography and layer", () => {
    const fontSize = resolveFocusedSystemLabelSize({ clientHeight: 400 });
    const list = entries(
      {
        families: ["C3", "C4"],
        fontSize,
        color: CUSHION_FOCUS_VALUE_COLOR,
      },
      true
    );
    const values = list.filter((e) => e.kind === "value");
    const captions = list.filter((e) => e.kind === "caption");
    expect(values.length).toBeGreaterThan(0);
    expect(captions.length).toBeGreaterThan(0);
    for (const e of [...values, ...captions]) {
      expect(e.fontSize).toBe(fontSize);
      expect(e.color).toBe(CUSHION_FOCUS_VALUE_COLOR);
    }
  });
});

describe("source isolation", () => {
  it("uses Focus position helpers; no Fg↔Rg / openai", () => {
    expect(src).toContain("resolveFocusLabelPosition");
    expect(src).toContain("getFocusDisplayLayer");
    expect(src).not.toMatch(/fgToRg|FRAME_OFFSET_PX|_f\s*:|_r\s*:/);
    expect(src).not.toMatch(/openai|buildTrajectory/);
  });

  it("skips collision nudge when Focus active", () => {
    expect(src).toContain("const applyCushionNudges = !focusActive");
  });
});
