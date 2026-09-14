/**
 * Cushion Focus model — availability, scale, FRAME/RAIL display SSOT.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIXED_CUSHION_FAMILIES,
  buildFixedFamilyAvailability,
  listAvailableFamilies,
  pruneSelectedFamilies,
  resolveCushionPanelHint,
  shouldEnableCushionValuePanel,
  toggleFamilyInSet,
  resolveFocusedSystemLabelSize,
  resolveNormalSystemLabelSize,
  getFocusedSystemLabelTypography,
  getFocusDisplayLayer,
  resolveFocusLabelPosition,
  FOCUS_FRAME_EDGE,
  FOCUS_RAIL_EDGE,
  CUSHION_PANEL_HINT_INITIAL,
  CUSHION_PANEL_HINT_AFTER,
  CUSHION_FOCUS_VALUE_COLOR,
  FOCUS_FONT_FLOOR,
  FOCUS_FONT_PREFERRED,
  FOCUS_FONT_CEILING,
} from "./cushionValuePanelModel";

const modelSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "cushionValuePanelModel.ts"),
  "utf8"
);

const sampleAnchors = {
  CO: [
    { coord: { x: 80, y: -2.25 }, value: 0 },
    { coord: { x: 40, y: -2.25 }, value: 30 },
    { coord: { x: -2.25, y: -2.25 }, value: 50 },
  ],
  C3: [
    { coord: { x: 70, y: 0 }, value: 10 },
    { coord: { x: 30, y: 0 }, value: 60 },
  ],
  C4: [{ coord: { x: 20, y: 0 }, value: 40 }],
  C6: [{ coord: { x: -2.25, y: 0 }, value: 60 }],
};

describe("fixed CO~C6 matrix + availability", () => {
  it("always exposes CO C1 C3 C4 C5 C6 in fixed order", () => {
    expect([...FIXED_CUSHION_FAMILIES]).toEqual([
      "CO",
      "C1",
      "C3",
      "C4",
      "C5",
      "C6",
    ]);
  });

  it("enables only families present in labelAnchorsForRender", () => {
    const available = listAvailableFamilies(sampleAnchors);
    expect([...available].sort()).toEqual(["C3", "C4", "C6", "CO"].sort());
    const rows = buildFixedFamilyAvailability(sampleAnchors);
    expect(rows.find((r) => r.family === "C1")?.enabled).toBe(false);
  });
});

describe("Focus FRAME/RAIL display SSOT", () => {
  it("maps CO/C1/C4/C5/C6 → FRAME and C3 → RAIL", () => {
    expect(getFocusDisplayLayer("CO")).toBe("FRAME");
    expect(getFocusDisplayLayer("C1")).toBe("FRAME");
    expect(getFocusDisplayLayer("C3")).toBe("RAIL");
    expect(getFocusDisplayLayer("C4")).toBe("FRAME");
    expect(getFocusDisplayLayer("C5")).toBe("FRAME");
    expect(getFocusDisplayLayer("C6")).toBe("FRAME");
  });

  it("preserves along-axis and snaps C4 rail anchor normal to FRAME", () => {
    const r = resolveFocusLabelPosition({ x: 20, y: 0 }, "C4");
    expect(r.layer).toBe("FRAME");
    expect(r.side).toBe("bottom");
    expect(r.x).toBe(20);
    expect(r.y).toBe(FOCUS_FRAME_EDGE.bottom);
  });

  it("keeps C3 on RAIL cloth edge", () => {
    const r = resolveFocusLabelPosition({ x: 30, y: 0 }, "C3");
    expect(r.layer).toBe("RAIL");
    expect(r.x).toBe(30);
    expect(r.y).toBe(FOCUS_RAIL_EDGE.bottom);
  });

  it("keeps CO on FRAME diamond line", () => {
    const r = resolveFocusLabelPosition({ x: 40, y: -2.25 }, "CO");
    expect(r.layer).toBe("FRAME");
    expect(r.x).toBe(40);
    expect(r.y).toBe(FOCUS_FRAME_EDGE.bottom);
  });

  it("snaps LEFT-side C6 from cloth to FRAME edge", () => {
    const r = resolveFocusLabelPosition({ x: -2.25, y: 10 }, "C6");
    // y=10 closer to left than top/bottom? distLeft=0, so left
    expect(r.side).toBe("left");
    expect(r.layer).toBe("FRAME");
    expect(r.x).toBe(FOCUS_FRAME_EDGE.left);
    expect(r.y).toBe(10);
  });
});

describe("toggle + prune", () => {
  it("supports independent multi-toggle and re-tap OFF", () => {
    let sel = [];
    sel = toggleFamilyInSet(sel, "CO", true);
    sel = toggleFamilyInSet(sel, "C3", true);
    expect(sel.sort()).toEqual(["C3", "CO"]);
    sel = toggleFamilyInSet(sel, "CO", true);
    expect(sel).toEqual(["C3"]);
  });

  it("prunes stale families when anchors change", () => {
    const pruned = pruneSelectedFamilies(["CO", "C1", "C3"], sampleAnchors);
    expect(pruned.sort()).toEqual(["C3", "CO"]);
  });
});

describe("focus scale — no multi-family shrink", () => {
  it("CO-only size equals CO+C6 size on same viewport", () => {
    const argsBase = { labelAnchors: sampleAnchors, scale: 10, clientHeight: 400 };
    const coOnly = resolveFocusedSystemLabelSize({
      ...argsBase,
      selectedFamilies: ["CO"],
    });
    const coAndC6 = resolveFocusedSystemLabelSize({
      ...argsBase,
      selectedFamilies: ["CO", "C6"],
    });
    expect(coAndC6).toBe(coOnly);
    expect(coOnly).toBe(FOCUS_FONT_PREFERRED);
  });

  it("preferred ≈ 2× mobile normal without nesting to 45", () => {
    expect(resolveNormalSystemLabelSize(1.5)).toBe(15);
    expect(FOCUS_FONT_FLOOR).toBe(15);
    expect(FOCUS_FONT_CEILING).toBe(34);
    expect(getFocusedSystemLabelTypography(30, 1.5).color).toBe(
      CUSHION_FOCUS_VALUE_COLOR
    );
  });
});

describe("instruction + gate + isolation", () => {
  it("uses fixed instruction strings", () => {
    expect(resolveCushionPanelHint(false)).toBe(CUSHION_PANEL_HINT_INITIAL);
    expect(resolveCushionPanelHint(true)).toBe(CUSHION_PANEL_HINT_AFTER);
  });

  it("enables panel for USER + cushion-point on PC and Mobile; ADMIN off", () => {
    expect(shouldEnableCushionValuePanel("USER", true)).toBe(true);
    expect(shouldEnableCushionValuePanel("USER", false)).toBe(false);
    expect(shouldEnableCushionValuePanel("ADMIN", true)).toBe(false);
  });

  it("has no calculation/OpenAI imports", () => {
    expect(modelSrc).not.toMatch(/buildTrajectory|TABLE_CONFIG|Δ_sys|openai|fgToRg|FRAME_OFFSET/i);
  });
});
