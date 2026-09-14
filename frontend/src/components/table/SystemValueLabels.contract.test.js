/**
 * SystemValueLabels focus filter/position/color contracts (presentation-only).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSystemValueLabelPresentationEntries } from "./SystemValueLabels.jsx";
import {
  CUSHION_FOCUS_VALUE_COLOR,
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
};

const baseArgs = {
  labelAnchors: sampleAnchors,
  scale: 10,
  tableH: 400,
  padding: 20,
  labelScale: 1.5,
  showAxisCaptions: false,
};

function rawEntries(focusOpts) {
  return buildSystemValueLabelPresentationEntries({
    ...baseArgs,
    focusOpts,
  }).filter((e) => e.id?.startsWith("RAW-"));
}

describe("SystemValueLabels focus selection policy (B)", () => {
  it("selection 0 shows all families at normal pipeline positions", () => {
    const all = rawEntries({ families: [], fontSize: 15, color: CUSHION_FOCUS_VALUE_COLOR });
    const families = new Set(all.map((e) => e.family));
    expect([...families].sort()).toEqual(["C1", "C3", "C4", "CO"]);
    expect(all.every((e) => e.focused === false)).toBe(true);
  });

  it("selection ≥1 shows only selected families", () => {
    const fontSize = resolveFocusedSystemLabelSize({
      labelAnchors: sampleAnchors,
      selectedFamilies: ["CO"],
      scale: 10,
    });
    const entries = rawEntries({
      families: ["CO"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    expect(entries.every((e) => e.family === "CO")).toBe(true);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.focused === true)).toBe(true);
  });

  it("preserves SSOT value and presentation x/y vs non-focus", () => {
    const normal = rawEntries(null);
    const fontSize = resolveFocusedSystemLabelSize({
      labelAnchors: sampleAnchors,
      selectedFamilies: ["C3", "CO"],
      scale: 10,
    });
    const focused = rawEntries({
      families: ["C3", "CO"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    for (const f of focused) {
      const n = normal.find((e) => e.id === f.id);
      expect(n).toBeTruthy();
      expect(f.value).toBe(n.value);
      expect(f.pxX).toBe(n.pxX);
      expect(f.pxY).toBe(n.pxY);
    }
  });

  it("multi-select keeps both families and hides others", () => {
    const fontSize = 28;
    const entries = rawEntries({
      families: ["CO", "C3"],
      fontSize,
      color: CUSHION_FOCUS_VALUE_COLOR,
    });
    const families = new Set(entries.map((e) => e.family));
    expect([...families].sort()).toEqual(["C3", "CO"]);
    expect(entries.some((e) => e.family === "C1")).toBe(false);
  });
});

describe("SystemValueLabels focus isolation source", () => {
  it("reuses focus helpers without Fg↔Rg / _f/_r restoration", () => {
    expect(src).toContain("resolveFocusedSystemLabelSize");
    expect(src).toContain("CUSHION_FOCUS_VALUE_COLOR");
    expect(src).not.toMatch(/fgToRg|FRAME_OFFSET_PX|_f\s*:|_r\s*:/);
    expect(src).not.toMatch(/openai|buildTrajectory/);
  });

  it("trajectory mark path keeps white fill constant", () => {
    expect(src).toContain('fill={labelFill}');
    expect(src).toContain('"#FFFFFF"');
  });
});
