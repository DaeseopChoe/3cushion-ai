/**
 * USER mobile label scale + cushion panel gate — contracts (no jsdom).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MEDIA_USER_MOBILE_TABLE,
  SYS_LABEL_PHONE_LANDSCAPE_SCALE,
} from "../../config/tableConfig";
import { resolveSysLabelScale } from "./labelScalePolicy";
import { shouldEnableCushionValuePanel } from "./cushionValuePanelModel";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const appSrc = readFileSync(join(srcRoot, "App.jsx"), "utf8");
const configSrc = readFileSync(join(srcRoot, "config/tableConfig.ts"), "utf8");

describe("labelScalePolicy", () => {
  it("uses coarse-pointer mobile landscape MQ (desktop mouse excluded)", () => {
    expect(MEDIA_USER_MOBILE_TABLE).toMatch(/pointer:\s*coarse/);
    expect(MEDIA_USER_MOBILE_TABLE).toMatch(/orientation:\s*landscape/);
  });

  it("resolveSysLabelScale returns 1.5 on mobile table, 1 on desktop", () => {
    expect(resolveSysLabelScale(true)).toBe(SYS_LABEL_PHONE_LANDSCAPE_SCALE);
    expect(resolveSysLabelScale(false)).toBe(1);
  });

  it("cushion panel gate is USER + mobile + cushion-point", () => {
    expect(shouldEnableCushionValuePanel("USER", true, true)).toBe(true);
    expect(shouldEnableCushionValuePanel("ADMIN", true, true)).toBe(false);
  });

  it("App wires CushionValuePanel; magnifier fully removed", () => {
    expect(appSrc).toContain("CushionValuePanel");
    expect(appSrc).toContain("shouldEnableCushionValuePanel");
    expect(appSrc).toContain("cushionFocusFamilies");
    expect(appSrc).toContain("focusFamilies=");
    expect(appSrc).not.toContain("UserTableMagnifier");
    expect(appSrc).not.toContain("shouldEnableUserTableMagnifier");
    expect(configSrc).not.toContain("USER_TABLE_MAGNIFIER");
    expect(configSrc).not.toContain("USER_TABLE_VISUAL_ID");
  });
});
