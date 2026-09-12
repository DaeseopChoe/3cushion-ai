/**
 * History restore display contract:
 * - layers ON → trajectory/sys labels can resolve (view)
 * - Load/History → immediately editable (Undo/Recall model)
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

  it("T2: History onLoad enables layers on success; session true (editable)", () => {
    const app = readSrc("App.jsx");
    const settings = readSrc("hooks/useSettings.js");

    expect(app).toMatch(
      /if\s*\(\s*handleLoadWorkspaceSnapshot\(id\)\s*\)\s*\{\s*setAdminTableLayersVisible\(true\)/
    );
    expect(settings).toMatch(/return true;/);
    expect(settings).toMatch(/return false;/);

    const loadBody = settings.slice(
      settings.indexOf("handleLoadWorkspaceSnapshot"),
      settings.indexOf("clearEditSourceContext")
    );
    expect(loadBody).not.toMatch(/beginAdminInputSession/);
    expect(loadBody).toMatch(/setIsAdminInputSessionActive\(true\)/);
    expect(loadBody).not.toMatch(/setIsAdminInputSessionActive\(false\)/);
    expect(loadBody).not.toMatch(/setAdminTableLayersVisible/);
    expect(loadBody).not.toMatch(/commitDraftSys|handleAdminWorkReset/);
  });

  it("T3: ADMIN Undo/Recall UI present; Reset button removed", () => {
    const app = readSrc("App.jsx");
    expect(app).toMatch(/useAdminEditHistory/);
    expect(app).toMatch(/handleAdminUndo/);
    expect(app).toMatch(/handleAdminRecall/);
    expect(app).toMatch(/\n\s*Recall\s*\n/);
    expect(app).not.toMatch(/\n\s*Reset\s*\n/);
    expect(app).not.toMatch(/handleAdminWorkReset/);
    expect(app.includes("되돌리기")).toBe(true);
  });

  it("T3d: Recall restores Origin directly without confirm dialog", () => {
    const app = readSrc("App.jsx");
    const start = app.indexOf("const handleAdminRecall");
    expect(start).toBeGreaterThan(-1);
    const end = app.indexOf("}, [", start);
    const body = app.slice(start, end);
    expect(body).toMatch(/recallToOrigin/);
    expect(body).not.toMatch(/window\.confirm/);
    expect(body).not.toMatch(/불러왔던 원본 상태로 되돌리시겠습니까/);
  });

  it("T3b: LocalDB match keeps editable session (no session false after begin)", () => {
    const localDb = readSrc("application/flows/adminLocalDbFlow.ts");
    expect(localDb).not.toMatch(/setIsAdminInputSessionActive\(false\)/);
    expect(localDb).toMatch(/hydrateAdminRecallTarget/);
    expect(localDb).toMatch(/resolveAdminRecallTargetMeta/);
    expect(localDb).toMatch(/beginAdminInputSession/);
  });

  it("T3c: Target dblclick guard retained for layers-on + session-off edge", () => {
    const app = readSrc("App.jsx");
    expect(app).toMatch(/shouldBlockTargetDblclickEditSession/);
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
    const modalIdx = app.lastIndexOf("<LazyWorkspaceHistoryModal");
    expect(modalIdx).toBeGreaterThan(-1);
    const onLoad = app.slice(modalIdx, modalIdx + 500);
    expect(onLoad).toMatch(/handleLoadWorkspaceSnapshot\(id\)/);
    expect(onLoad).toMatch(/setAdminTableLayersVisible\(true\)/);
    expect(onLoad).not.toMatch(/runSaveStrategy|runCanonicalSave|beginAdminInputSession/);
  });
});
