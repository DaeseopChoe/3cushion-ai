/**
 * CushionValuePanel — Overlay-aligned table-relative responsive selector contracts.
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
  it("uses fixed family matrix helpers and hint strings", () => {
    expect(src).toContain("FIXED_CUSHION_FAMILIES");
    expect(src).toContain("buildFixedFamilyAvailability");
    expect(src).toContain("resolveCushionPanelHint");
    expect(src).toContain("내공 출발값");
    expect(src).not.toMatch(/buildTrajectory|openai|TABLE_CONFIG/);
  });

  it("CSS centers on table without transform:scale", () => {
    expect(css).toContain("left: 50%");
    expect(css).toContain("top: 50%");
    expect(css).toContain("translate(-50%, -50%)");
    expect(css).toMatch(/rgba\(\s*255,\s*255,\s*255,\s*0\.7\s*\)/);
    expect(css).not.toMatch(/\.ucvp-card\s*\{[^}]*\bopacity\s*:/s);
    expect(css).not.toContain("transform: scale(");
  });
});

describe("selector Overlay-aligned continuous scale", () => {
  it("uses size container for cqw + cqh (width + height axes)", () => {
    expect(css).toContain("container-type: size");
    expect(css).toContain("--ucvp-body");
    expect(css).toContain("--ucvp-note");
    expect(css).toContain("--ucvp-gap");
    expect(css).toMatch(/4\.08cqh/);
  });

  it("raises former hard ceilings (360 / 16 / 48)", () => {
    expect(css).not.toMatch(/clamp\(\s*168px,\s*42cqw,\s*360px\s*\)/);
    expect(css).not.toMatch(/clamp\(\s*13px,\s*2\.8cqw,\s*16px\s*\)/);
    expect(css).not.toMatch(/clamp\(\s*40px,\s*8cqw,\s*48px\s*\)/);
    expect(css).toMatch(/clamp\(\s*200px,\s*52cqw,\s*560px\s*\)/);
    expect(css).toMatch(/clamp\(\s*13px,\s*4\.08cqh,\s*32px\s*\)/);
    expect(css).toMatch(/max\(\s*40px,\s*calc\(\s*var\(--ucvp-body\)\s*\*\s*1\.48\s*\)\s*\)/);
  });

  it("scales panel chrome + typography from shared tokens", () => {
    expect(css).toMatch(/\.ucvp-btn[\s\S]*font-size:\s*var\(--ucvp-body\)/);
    expect(css).toMatch(/\.ucvp-hint[\s\S]*font-size:\s*var\(--ucvp-note\)/);
    expect(css).toMatch(/\.ucvp-abbr[\s\S]*font-size:\s*max\(/);
    expect(css).toMatch(/\.ucvp-card[\s\S]*gap:\s*var\(--ucvp-gap\)/);
    expect(css).toMatch(/\.ucvp-card[\s\S]*padding:\s*var\(--ucvp-pad-v\)\s+var\(--ucvp-pad-h\)/);
  });

  it("preserves small touch floor and 2×3 grid", () => {
    expect(css).toMatch(/max\(\s*40px/);
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(src).toMatch(/FIXED_CUSHION_FAMILIES\.slice\(0,\s*3\)/);
    expect(src).toMatch(/FIXED_CUSHION_FAMILIES\.slice\(3\)/);
  });

  it("does not add JS ResizeObserver / App metrics coupling", () => {
    expect(src).not.toMatch(/ResizeObserver|computeOverlayLayoutMetrics|UserCalcToolbar/);
    expect(css).not.toMatch(/media\s*\(\s*min-width:\s*1024px/);
  });
});
