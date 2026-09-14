/**
 * CushionValuePanel component source contracts (no jsdom).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "CushionValuePanel.jsx"),
  "utf8"
);

describe("CushionValuePanel source", () => {
  it("uses catalog SSOT helpers and fixed hint strings", () => {
    expect(src).toContain("buildCushionToggleCatalog");
    expect(src).toContain("resolveCushionPanelHint");
    expect(src).toContain("labelAnchors");
    expect(src).not.toMatch(/buildTrajectory|openai|TABLE_CONFIG/);
  });

  it("has independent chip toggles and value lanes", () => {
    expect(src).toContain("aria-pressed");
    expect(src).toContain("cushion-value-panel__lane");
    expect(src).toContain("cushion-value-panel__chip");
  });
});
