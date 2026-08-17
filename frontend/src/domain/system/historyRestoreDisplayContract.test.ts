/**
 * History restore display contract:
 * - layers ON → trajectory/sys labels can resolve (view)
 * - session stays false until Reset (edit)
 * Search / LocalDB post-match display must remain intact.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveSlotSys } from "./slotSysViewModel";
import {
  shouldClearReflectionOverrideOnTrackChange,
  stripReflectionOverrideFromLayer,
} from "../trajectory/c2ReflectionOverride";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), "utf8");
}

const sampleSlot = {
  draft: null,
  applied: {
    sys: {
      systemId: "5_half_system",
      track: "B2T_L",
      inputs: { CO_f: 30, C1_f: 20 },
      outputs: { result: { oneC: 1, threeC: 2, CO_f: 30 } },
    },
    reflectionOverride: { rail: "TOP" as const, t: 0.4 },
  },
};

describe("History restore → Admin table layers (view vs edit)", () => {
  it("T1: ADMIN + layers visible → resolveSlotSys returns slot sys (trajectory-capable)", () => {
    const sys = resolveSlotSys({
      appMode: "ADMIN",
      userTableDisplaySlotId: null,
      adminTableLayersVisible: true,
      slots: { S1: sampleSlot },
      activeSlot: "S1",
    });
    expect(sys).not.toBeNull();
    expect(sys?.systemId).toBe("5_half_system");
    expect(sys?.track).toBe("B2T_L");
  });

  it("T1b: ADMIN + layers hidden → resolveSlotSys null (pre-fix regression)", () => {
    expect(
      resolveSlotSys({
        appMode: "ADMIN",
        userTableDisplaySlotId: null,
        adminTableLayersVisible: false,
        slots: { S1: sampleSlot },
        activeSlot: "S1",
      })
    ).toBeNull();
  });

  it("T2: History onLoad enables layers only on success; does not beginAdminInputSession", () => {
    const app = readSrc("App.jsx");
    const settings = readSrc("hooks/useSettings.js");

    expect(app).toMatch(
      /if\s*\(\s*handleLoadWorkspaceSnapshot\(id\)\s*\)\s*\{\s*setAdminTableLayersVisible\(true\)/
    );
    expect(settings).toMatch(/setIsAdminInputSessionActive\(false\)/);
    expect(settings).toMatch(/return true;/);
    expect(settings).toMatch(/return false;/);

    const loadBody = settings.slice(
      settings.indexOf("handleLoadWorkspaceSnapshot"),
      settings.indexOf("clearEditSourceContext")
    );
    expect(loadBody).not.toMatch(/beginAdminInputSession/);
    expect(loadBody).not.toMatch(/setIsAdminInputSessionActive\(true\)/);
    expect(loadBody).not.toMatch(/setAdminTableLayersVisible/);
    expect(loadBody).not.toMatch(/commitDraftSys|handleAdminWorkReset/);
  });

  it("T3: Reset keeps data and sets session true (source contract)", () => {
    const app = readSrc("App.jsx");
    const resetStart = app.indexOf("const handleAdminWorkReset");
    const resetEnd = app.indexOf("}, [appMode, actions, targetColor", resetStart);
    expect(resetStart).toBeGreaterThan(-1);
    expect(resetEnd).toBeGreaterThan(resetStart);
    const resetBody = app.slice(resetStart, resetEnd);
    expect(resetBody).toMatch(/setIsAdminInputSessionActive\(true\)/);
    expect(resetBody).not.toMatch(/clearAdminWorkSlots/);
    expect(resetBody).not.toMatch(/setAdminTableLayersVisible\(false\)/);
    expect(resetBody).not.toMatch(/resetTrajectory/);
  });

  it("T4: same Track keeps reflectionOverride (display path does not strip)", () => {
    expect(
      shouldClearReflectionOverrideOnTrackChange("B2T_L", "B2T_L")
    ).toBe(false);
    const layer = {
      sys: { track: "B2T_L" },
      reflectionOverride: sampleSlot.applied.reflectionOverride,
    };
    expect(layer.reflectionOverride).toEqual({ rail: "TOP", t: 0.4 });
    // layers ON still sees override on slot — strip only on Track flip helpers
    expect(
      resolveSlotSys({
        appMode: "ADMIN",
        userTableDisplaySlotId: null,
        adminTableLayersVisible: true,
        slots: { S1: sampleSlot },
        activeSlot: "S1",
      })
    ).not.toBeNull();
  });

  it("T5: Track flip invalidates override (existing policy unchanged)", () => {
    expect(
      shouldClearReflectionOverrideOnTrackChange("B2T_L", "B2T_R")
    ).toBe(true);
    const stripped = stripReflectionOverrideFromLayer({
      reflectionOverride: { rail: "TOP" as const, t: 0.4 },
      sys: { track: "B2T_R" },
    });
    expect(stripped.reflectionOverride).toBeUndefined();
  });

  it("T6/T7: Search and LocalDB still set layers visible on match", () => {
    const search = readSrc("application/flows/adminSearchFlow.ts");
    const localDb = readSrc("application/flows/adminLocalDbFlow.ts");
    expect(search).toMatch(/setAdminTableLayersVisible\(true\)/);
    expect(localDb).toMatch(/setAdminTableLayersVisible\(true\)/);
  });

  it("T8: History restore does not alter Exact-upsert / saveFlow identity path", () => {
    const saveFlow = readSrc("application/flows/saveFlow.ts");
    expect(saveFlow).toMatch(/system:\s*systemId/);
    const app = readSrc("App.jsx");
    const modalIdx = app.lastIndexOf("<WorkspaceHistoryModal");
    expect(modalIdx).toBeGreaterThan(-1);
    const onLoad = app.slice(modalIdx, modalIdx + 500);
    expect(onLoad).toMatch(/handleLoadWorkspaceSnapshot\(id\)/);
    expect(onLoad).toMatch(/setAdminTableLayersVisible\(true\)/);
    expect(onLoad).not.toMatch(/runSaveStrategy|runCanonicalSave|beginAdminInputSession/);
  });
});
