/**
 * CushionValuePanel — compact selector contracts (no mini table / value lane).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, "CushionValuePanel.jsx"), "utf8");
const css = readFileSync(
  join(dir, "../../styles/user-cushion-value-panel.css"),
  "utf8"
);

describe("CushionValuePanel source", () => {
  it("uses fixed family matrix helpers and new hint strings", () => {
    expect(src).toContain("FIXED_CUSHION_FAMILIES");
    expect(src).toContain("buildFixedFamilyAvailability");
    expect(src).toContain("resolveCushionPanelHint");
    expect(src).toContain("toggleFamilyInSet");
    expect(src).toContain("selectedFamilies");
    expect(src).not.toMatch(/buildTrajectory|openai|TABLE_CONFIG/);
  });

  it("renders fixed buttons with aria-pressed and no mini/lane markup", () => {
    expect(src).toContain("aria-pressed");
    expect(src).toContain("ucvp-btn");
    expect(src).toContain("내공 출발값");
    expect(src).not.toContain("cushion-value-panel__lane");
    expect(src).not.toContain("cushion-value-panel__chip");
    expect(src).not.toContain("mini");
    expect(src).not.toMatch(/value.?lane/i);
    expect(src).not.toMatch(/magnifier/i);
  });

  it("CSS is compact card without wood/cloth imitation", () => {
    expect(css).toContain("ucvp-card");
    expect(css).toContain("min-height: 48px");
    expect(css).not.toMatch(/wood|cloth|cushion-lane|mini-table/i);
  });
});
