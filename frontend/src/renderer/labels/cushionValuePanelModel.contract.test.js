/**
 * Cushion value panel model — pure SSOT grouping contracts (no jsdom).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCushionToggleCatalog,
  pruneSelectedToggleKeys,
  resolveCushionPanelHint,
  shouldEnableCushionValuePanel,
  toggleKeyInSet,
  CUSHION_PANEL_HINT_INITIAL,
  CUSHION_PANEL_HINT_AFTER,
  railsForLabelPoint,
} from "./cushionValuePanelModel";

const modelSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "cushionValuePanelModel.ts"),
  "utf8"
);

/** Mirrors 5_half B2T_R-style BOTTOM CO + LEFT CO + BOTTOM C3 */
const sampleAnchors = {
  CO: [
    { coord: { x: 80, y: -2.25 }, value: 0 },
    { coord: { x: 40, y: -2.25 }, value: 30 },
    { coord: { x: -2.25, y: -2.25 }, value: 50 },
    { coord: { x: -2.25, y: 10 }, value: 60 },
    { coord: { x: -2.25, y: 30 }, value: 90 },
  ],
  C3: [
    { coord: { x: 70, y: 0 }, value: 10 },
    { coord: { x: 30, y: 0 }, value: 60 },
  ],
  C6: [{ coord: { x: -2.25, y: 0 }, value: 60 }],
};

describe("buildCushionToggleCatalog", () => {
  it("groups by rail+family from labelAnchors without inventing families", () => {
    const catalog = buildCushionToggleCatalog(sampleAnchors);
    expect(catalog.byKey["bottom:CO"]).toBeTruthy();
    expect(catalog.byKey["left:CO"]).toBeTruthy();
    expect(catalog.byKey["bottom:C3"]).toBeTruthy();
    expect(catalog.byKey["left:C6"]).toBeTruthy();
    expect(catalog.byKey["top:C1"]).toBeUndefined();
  });

  it("keeps physical order on BOTTOM (fgX ascending)", () => {
    const catalog = buildCushionToggleCatalog(sampleAnchors);
    const vals = catalog.byKey["bottom:CO"].points.map((p) => p.value);
    expect(vals).toEqual([50, 30, 0]); // x: -2.25, 40, 80 → wait ascending x: -2.25(50), 40(30), 80(0)
  });

  it("keeps physical order on LEFT (fgY descending = top→bottom)", () => {
    const catalog = buildCushionToggleCatalog(sampleAnchors);
    const vals = catalog.byKey["left:CO"].points.map((p) => p.value);
    expect(vals).toEqual([90, 60, 50]); // y 30, 10, -2.25
  });

  it("shares corner CO across bottom + left (dual-bucket)", () => {
    expect(railsForLabelPoint("CO", -2.25, -2.25).sort()).toEqual([
      "bottom",
      "left",
    ]);
    const catalog = buildCushionToggleCatalog(sampleAnchors);
    const bottomHas50 = catalog.byKey["bottom:CO"].points.some(
      (p) => p.value === 50
    );
    const leftHas50 = catalog.byKey["left:CO"].points.some((p) => p.value === 50);
    expect(bottomHas50 && leftHas50).toBe(true);
  });

  it("selected values equal SSOT values", () => {
    const catalog = buildCushionToggleCatalog(sampleAnchors);
    expect(catalog.byKey["bottom:C3"].points.map((p) => p.value)).toEqual([
      60, 10,
    ]);
  });
});

describe("toggle state helpers", () => {
  it("supports multi-toggle and re-tap off without auto-clearing others", () => {
    let sel = [];
    sel = toggleKeyInSet(sel, "bottom:CO");
    sel = toggleKeyInSet(sel, "left:CO");
    sel = toggleKeyInSet(sel, "bottom:C3");
    expect(sel.sort()).toEqual(["bottom:C3", "bottom:CO", "left:CO"]);
    sel = toggleKeyInSet(sel, "bottom:CO");
    expect(sel.sort()).toEqual(["bottom:C3", "left:CO"]);
  });

  it("prunes stale keys on catalog change and keeps overlapping", () => {
    const catalog = buildCushionToggleCatalog(sampleAnchors);
    const pruned = pruneSelectedToggleKeys(
      ["bottom:CO", "top:C1", "left:CO"],
      catalog
    );
    expect(pruned.sort()).toEqual(["bottom:CO", "left:CO"]);
  });
});

describe("instruction + gate", () => {
  it("uses fixed instruction strings", () => {
    expect(resolveCushionPanelHint(false)).toBe(CUSHION_PANEL_HINT_INITIAL);
    expect(resolveCushionPanelHint(true)).toBe(CUSHION_PANEL_HINT_AFTER);
    expect(CUSHION_PANEL_HINT_INITIAL).toBe("확대하려는 값을 터치하세요.");
    expect(CUSHION_PANEL_HINT_AFTER).toBe(
      "보고 싶은 값을 각각 켜고 끌 수 있습니다."
    );
  });

  it("enables panel only for USER + mobile + cushion-point active", () => {
    expect(shouldEnableCushionValuePanel("USER", true, true)).toBe(true);
    expect(shouldEnableCushionValuePanel("USER", true, false)).toBe(false);
    expect(shouldEnableCushionValuePanel("USER", false, true)).toBe(false);
    expect(shouldEnableCushionValuePanel("ADMIN", true, true)).toBe(false);
  });

  it("model has no calculation imports", () => {
    expect(modelSrc).not.toMatch(/buildTrajectory|TABLE_CONFIG|Δ_sys|openai/i);
    expect(modelSrc).toContain("detectAxisSideFromFg");
  });
});
