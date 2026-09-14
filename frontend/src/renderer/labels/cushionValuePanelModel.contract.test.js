/**
 * Cushion value panel model — family availability + focus scale contracts.
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
  minNeighborSpacingPx,
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

/** Mirrors 5_half B2T_R-style: CO / C3 / C4 / C6 present; no C1/C5 */
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
    const rows = buildFixedFamilyAvailability(sampleAnchors);
    expect(rows.map((r) => r.family)).toEqual([...FIXED_CUSHION_FAMILIES]);
  });

  it("enables only families present in labelAnchorsForRender", () => {
    const available = listAvailableFamilies(sampleAnchors);
    expect([...available].sort()).toEqual(["C3", "C4", "C6", "CO"].sort());
    const rows = buildFixedFamilyAvailability(sampleAnchors);
    expect(rows.find((r) => r.family === "CO")?.enabled).toBe(true);
    expect(rows.find((r) => r.family === "C1")?.enabled).toBe(false);
    expect(rows.find((r) => r.family === "C5")?.enabled).toBe(false);
    expect(rows.find((r) => r.family === "C6")?.enabled).toBe(true);
  });

  it("does not hardcode system-specific family lists", () => {
    expect(modelSrc).not.toMatch(/5_half|B2T_|system_id\s*===/);
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

  it("ignores toggle on disabled family", () => {
    expect(toggleFamilyInSet(["CO"], "C1", false)).toEqual(["CO"]);
  });

  it("prunes stale families when anchors change", () => {
    const pruned = pruneSelectedFamilies(["CO", "C1", "C3"], sampleAnchors);
    expect(pruned.sort()).toEqual(["C3", "CO"]);
  });
});

describe("focus scale", () => {
  it("preferred ≈ 2× mobile normal without nesting 1.5×2 as desktop×3", () => {
    const normalMobile = resolveNormalSystemLabelSize(1.5);
    expect(normalMobile).toBe(15);
    expect(FOCUS_FONT_PREFERRED).toBe(30);
    expect(FOCUS_FONT_FLOOR).toBe(15);
    expect(FOCUS_FONT_CEILING).toBe(34);
    const size = resolveFocusedSystemLabelSize({
      labelAnchors: { CO: [{ coord: { x: 10, y: -2.25 }, value: 1 }] },
      selectedFamilies: ["CO"],
      scale: 10,
      clientHeight: 400,
    });
    expect(size).toBeGreaterThanOrEqual(FOCUS_FONT_FLOOR);
    expect(size).toBeLessThanOrEqual(FOCUS_FONT_CEILING);
    expect(size).toBeLessThanOrEqual(FOCUS_FONT_PREFERRED);
    // Must not be 10*1.5*2 = 30 via nested multipliers of base alone as 45
    expect(size).not.toBe(45);
  });

  it("scales down under dense neighbor spacing", () => {
    const dense = {
      C3: [
        { coord: { x: 10, y: 0 }, value: 1 },
        { coord: { x: 12, y: 0 }, value: 2 },
        { coord: { x: 14, y: 0 }, value: 3 },
      ],
    };
    const spacing = minNeighborSpacingPx(dense, ["C3"], 10);
    expect(spacing).toBe(20); // Δ2 * scale 10
    const size = resolveFocusedSystemLabelSize({
      labelAnchors: dense,
      selectedFamilies: ["C3"],
      scale: 10,
      clientHeight: 400,
    });
    expect(size).toBeLessThan(FOCUS_FONT_PREFERRED);
    expect(size).toBeGreaterThanOrEqual(FOCUS_FONT_FLOOR);
  });
});

describe("instruction + gate + isolation", () => {
  it("uses fixed instruction strings", () => {
    expect(resolveCushionPanelHint(false)).toBe(CUSHION_PANEL_HINT_INITIAL);
    expect(resolveCushionPanelHint(true)).toBe(CUSHION_PANEL_HINT_AFTER);
    expect(CUSHION_PANEL_HINT_INITIAL).toBe("보시려는 값의 버튼을 누르세요.");
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

  it("uses unified focus color and has no calculation/OpenAI imports", () => {
    expect(CUSHION_FOCUS_VALUE_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(modelSrc).not.toMatch(/buildTrajectory|TABLE_CONFIG|Δ_sys|openai|fgToRg|FRAME_OFFSET/i);
    expect(modelSrc).not.toMatch(/_f|_r/);
  });
});
