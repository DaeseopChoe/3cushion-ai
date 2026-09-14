/**
 * USER mobile circular magnifier — presentation contracts (no jsdom).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  USER_TABLE_MAGNIFIER_DIAMETER,
  USER_TABLE_MAGNIFIER_ZOOM,
  USER_TABLE_VISUAL_ID,
} from "../../config/tableConfig";
import {
  clampLensPosition,
  computeMagnifierViewBox,
  defaultLensPosition,
} from "./userTableMagnifierLayout";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const magnifierSrc = readFileSync(
  join(srcRoot, "components/user/UserTableMagnifier.jsx"),
  "utf8"
);

describe("UserTableMagnifier layout", () => {
  it("clamps lens inside host bounds", () => {
    const clamped = clampLensPosition(-10, 500, 360, 200, 96);
    expect(clamped.x).toBeGreaterThanOrEqual(4);
    expect(clamped.y).toBeLessThanOrEqual(200 - 96 - 4);
  });

  it("default lens position stays inside host", () => {
    const pos = defaultLensPosition(390, 220, 96);
    expect(pos.x + 96).toBeLessThanOrEqual(390);
    expect(pos.y).toBeGreaterThanOrEqual(4);
  });

  it("viewBox window shrinks with higher zoom (presentation coords only)", () => {
    const low = computeMagnifierViewBox(50, 25, 300, 150, 860, 460, 96, 2);
    const high = computeMagnifierViewBox(50, 25, 300, 150, 860, 460, 96, 3);
    expect(high.width).toBeLessThan(low.width);
    expect(high.height).toBeLessThan(low.height);
  });
});

describe("UserTableMagnifier component contract", () => {
  it("uses SVG use href to live table visual (no calc recompute)", () => {
    expect(magnifierSrc).toContain(`#${USER_TABLE_VISUAL_ID}`);
    expect(magnifierSrc).toMatch(/<use\b/);
    expect(magnifierSrc).not.toMatch(/buildTrajectory|TABLE_CONFIG|Fg|Rg|Δ_sys/);
    expect(magnifierSrc).not.toMatch(/setTimeout\s*\(/);
  });

  it("supports pointer drag with rAF and boundary clamp", () => {
    expect(magnifierSrc).toContain("onPointerDown");
    expect(magnifierSrc).toContain("requestAnimationFrame");
    expect(magnifierSrc).toContain("clampLensPosition");
    expect(magnifierSrc).toMatch(/aria-label=["']확대 보기["']/);
  });

  it("has no handle UI and uses circular lens styling", () => {
    expect(magnifierSrc).not.toMatch(/handle|손잡/i);
    expect(magnifierSrc).toContain("user-table-magnifier-lens");
  });

  it("uses configured zoom and diameter defaults", () => {
    expect(USER_TABLE_MAGNIFIER_ZOOM).toBeGreaterThanOrEqual(2);
    expect(USER_TABLE_MAGNIFIER_ZOOM).toBeLessThanOrEqual(2.5);
    expect(USER_TABLE_MAGNIFIER_DIAMETER).toBeGreaterThanOrEqual(80);
    expect(USER_TABLE_MAGNIFIER_DIAMETER).toBeLessThanOrEqual(110);
  });
});
