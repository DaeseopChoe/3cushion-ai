/**
 * USER mobile label scale + magnifier gate — contracts (no jsdom).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MEDIA_USER_MOBILE_TABLE,
  SYS_LABEL_PHONE_LANDSCAPE_SCALE,
} from "../../config/tableConfig";
import {
  resolveSysLabelScale,
  shouldEnableUserTableMagnifier,
} from "./labelScalePolicy";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const appSrc = readFileSync(join(srcRoot, "App.jsx"), "utf8");

describe("labelScalePolicy", () => {
  it("uses coarse-pointer mobile landscape MQ (desktop mouse excluded)", () => {
    expect(MEDIA_USER_MOBILE_TABLE).toMatch(/pointer:\s*coarse/);
    expect(MEDIA_USER_MOBILE_TABLE).toMatch(/orientation:\s*landscape/);
  });

  it("resolveSysLabelScale returns 1.5 on mobile table, 1 on desktop", () => {
    expect(resolveSysLabelScale(true)).toBe(SYS_LABEL_PHONE_LANDSCAPE_SCALE);
    expect(resolveSysLabelScale(false)).toBe(1);
  });

  it("magnifier enabled only for USER + mobile table", () => {
    expect(shouldEnableUserTableMagnifier("USER", true)).toBe(true);
    expect(shouldEnableUserTableMagnifier("USER", false)).toBe(false);
    expect(shouldEnableUserTableMagnifier("ADMIN", true)).toBe(false);
  });

  it("App wires magnifier without pulling ADMIN lazy modules", () => {
    expect(appSrc).toContain("UserTableMagnifier");
    expect(appSrc).toContain("shouldEnableUserTableMagnifier");
    expect(appSrc).toContain('id={USER_TABLE_VISUAL_ID}');
    expect(appSrc).not.toMatch(/import\s+.*SysOverlay[^L]/);
  });
});
