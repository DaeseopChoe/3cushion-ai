/**
 * USER mobile label readability — presentation contracts (no jsdom).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYS_LABEL_BASE_FONT_SIZE,
  SYS_LABEL_PHONE_LANDSCAPE_SCALE,
} from "../../config/tableConfig";
import {
  buildSvgLabelReadabilityStyle,
  isLabelReadabilityEnhanced,
} from "./labelReadabilityStyle";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const labelTextSrc = readFileSync(
  join(srcRoot, "components/table/LabelText.jsx"),
  "utf8"
);
const sysLabelsSrc = readFileSync(
  join(srcRoot, "components/table/SystemValueLabels.jsx"),
  "utf8"
);

describe("Phase USER mobile label readability", () => {
  it("applies ~1.5x mobile scale via existing labelScale SSOT", () => {
    expect(SYS_LABEL_PHONE_LANDSCAPE_SCALE).toBe(1.5);
    expect(SYS_LABEL_BASE_FONT_SIZE * SYS_LABEL_PHONE_LANDSCAPE_SCALE).toBe(15);
  });

  it("enables stroke/shadow readability only when labelScale is mobile-enhanced", () => {
    expect(isLabelReadabilityEnhanced(1)).toBe(false);
    expect(isLabelReadabilityEnhanced(1.5)).toBe(true);
    const desktop = buildSvgLabelReadabilityStyle(false);
    const mobile = buildSvgLabelReadabilityStyle(true);
    expect(desktop.stroke).toBeUndefined();
    expect(mobile.paintOrder).toBe("stroke fill");
    expect(mobile.strokeWidth).toBeGreaterThan(0);
    expect(mobile.filter).toMatch(/drop-shadow/);
  });

  it("LabelText wires readabilityScale from labelScale", () => {
    expect(labelTextSrc).toContain("readabilityScale");
    expect(labelTextSrc).toContain("buildSvgLabelReadabilityStyle");
  });

  it("SystemValueLabels scales mark labels and passes readabilityScale to LabelText", () => {
    expect(sysLabelsSrc).toContain("MARK_LABEL_BASE_FONT_SIZE");
    expect(sysLabelsSrc).toContain("readabilityScale=");
    expect(sysLabelsSrc).toMatch(/readabilityScale=\{(labelScale|readabilityScale)\}/);
    expect(sysLabelsSrc).toContain("buildSvgLabelReadabilityStyle");
  });
});
