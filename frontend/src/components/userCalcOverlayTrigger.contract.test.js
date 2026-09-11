/**
 * USER 계산: mode entry vs overlay open trigger separation.
 * Source contracts — no OpenAI / no calc engine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stage = readFileSync(join(__dirname, "./Stage.jsx"), "utf8");
const app = readFileSync(join(__dirname, "../App.jsx"), "utf8");
const toolbar = readFileSync(
  join(__dirname, "./user/UserCalcToolbar.jsx"),
  "utf8"
);

describe("USER calc mode vs overlay trigger", () => {
  it("calc overlay visibility defaults closed (base table first)", () => {
    expect(stage).toMatch(
      /const \[calcOverlayVisible,\s*setCalcOverlayVisible\]\s*=\s*useState\(false\)/
    );
    expect(app).toMatch(/calcOverlayVisible\s*=\s*false/);
  });

  it("[계산] enter sets trajectory mode and forces overlay closed", () => {
    expect(stage).toContain('setUserTableDisplayMode("trajectory")');
    expect(stage).toContain("setCalcOverlayVisible(false)");
    expect(stage).toContain('setCurrentButtonId("TRAJECTORY")');
    // Must not auto-open on enter
    expect(stage).not.toMatch(
      /setUserTableDisplayMode\("trajectory"\);\s*setCalcOverlayVisible\(true\)/
    );
  });

  it("reset / leave calc mode leaves overlay closed for next entry", () => {
    expect(stage).toMatch(
      /setTrajectoryCardOffset\(\{ x: 0, y: 0 \}\);\s*[\s\S]*?setCalcOverlayVisible\(false\)/
    );
  });

  it("Shell opens CALC overlay only when calcOverlayVisible is true", () => {
    expect(app).toContain(
      '(overlayContent !== "CALC" || calcOverlayVisible)'
    );
    expect(app).toContain('setOverlayContent("CALC")');
  });

  it("[계산 보기]/[계산 감추기] toggles overlay visibility only", () => {
    expect(toolbar).toContain(
      "onClick={() => onCalcOverlayVisibleChange?.(!calcOverlayVisible)}"
    );
    expect(toolbar).toContain(
      '{calcOverlayVisible ? "계산 감추기" : "계산 보기"}'
    );
  });

  it("CALC overlay close hides panel without exiting calc mode wiring", () => {
    expect(app).toMatch(
      /overlayContent === "CALC"\s*\?\s*\(\)\s*=>\s*onCalcOverlayVisibleChange\?\.\(false\)/
    );
    expect(app).toContain('userTableDisplayMode === "trajectory"');
  });
});
