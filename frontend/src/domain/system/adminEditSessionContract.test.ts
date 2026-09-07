/**
 * ADMIN edit-session — Load immediately editable + Undo/Recall model.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyAdminRecallTargetLockHydrate,
  applyAdminWorkResetSession,
  canUseAdminSystemControls,
  resolveAdminRecallTargetMeta,
  resolveAdminResetTargetMeta,
  resolveAdminTargetReadyBall,
  shouldBlockTargetDblclickEditSession,
  simulateAdminRecallLoadedEditableState,
  simulateAdminRecallViewOnlyState,
} from "./adminEditSessionContract";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), "utf8");
}

describe("adminEditSessionContract — Load editable / Undo-Recall", () => {
  it("A: Load with target metadata → locked + session true + controls enabled", () => {
    const s = simulateAdminRecallLoadedEditableState({
      recordTargetBall: "red",
      prevIsTargetSelected: false,
    });
    expect(s.isTargetSelected).toBe(true);
    expect(s.targetColor).toBe("red");
    expect(s.isAdminInputSessionActive).toBe(true);
    expect(s.canUseSystemControls).toBe(true);
    expect(s.blockTargetDblclickEditSession).toBe(false);
  });

  it("B: after Load, Target dblclick edit path is not blocked", () => {
    const s = simulateAdminRecallLoadedEditableState({ recordTargetBall: "yellow" });
    expect(
      shouldBlockTargetDblclickEditSession({
        isAdminInputSessionActive: s.isAdminInputSessionActive,
        adminTableLayersVisible: s.adminTableLayersVisible,
      })
    ).toBe(false);
  });

  it("C: Target Ready helper preserves identity + enables controls", () => {
    const loaded = simulateAdminRecallLoadedEditableState({
      recordTargetBall: "red",
    });
    const after = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: loaded.targetColor,
      slotTargetBall: loaded.targetColor,
    });
    expect(after.isTargetSelected).toBe(true);
    expect(after.targetColor).toBe("red");
    expect(after.isAdminInputSessionActive).toBe(true);
    expect(after.canUseSystemControls).toBe(true);
  });

  it("D: layers-on + session-off edge still blocks Target dblclick (legacy guard)", () => {
    const edge = simulateAdminRecallViewOnlyState({ recordTargetBall: "yellow" });
    expect(edge.blockTargetDblclickEditSession).toBe(true);
    expect(edge.isAdminInputSessionActive).toBe(false);
  });

  it("E/F: Load cycle ×3 — identical editable Ready", () => {
    for (let i = 0; i < 3; i++) {
      const loaded = simulateAdminRecallLoadedEditableState({
        recordTargetBall: "red",
        searchQueryTargetBall: null,
      });
      expect(loaded.isAdminInputSessionActive).toBe(true);
      expect(loaded.canUseSystemControls).toBe(true);
      expect(loaded.targetColor).toBe("red");
    }
  });

  it("G: metadata-absent Load clears stale previous Target Lock", () => {
    const lock = applyAdminRecallTargetLockHydrate(null);
    expect(lock.isTargetSelected).toBe(false);
    expect(lock.targetColor).toBeNull();

    const s = simulateAdminRecallLoadedEditableState({
      recordTargetBall: null,
      prevIsTargetSelected: true,
      prevTargetColor: "red",
    });
    expect(s.isTargetSelected).toBe(false);
    expect(s.targetColor).toBeNull();
    expect(s.isAdminInputSessionActive).toBe(true);
    expect(s.canUseSystemControls).toBe(false);
  });

  it("H: History Load shares editable + Target Lock contract", () => {
    const histLock = applyAdminRecallTargetLockHydrate(
      normalizeViaMeta("red")
    );
    expect(histLock.isTargetSelected).toBe(true);
    expect(
      canUseAdminSystemControls({
        appMode: "ADMIN",
        isAdminInputSessionActive: true,
        targetReadyBall: resolveAdminTargetReadyBall({
          isTargetSelected: histLock.isTargetSelected,
          targetColor: histLock.targetColor,
          slotTargetBall: histLock.targetColor,
        }),
      })
    ).toBe(true);
  });

  it("fresh ADMIN (layers off) does not block Target dblclick edit start", () => {
    expect(
      shouldBlockTargetDblclickEditSession({
        isAdminInputSessionActive: false,
        adminTableLayersVisible: false,
      })
    ).toBe(false);
  });

  it("resolveAdminResetTargetMeta preserves active slot or targetColor metadata", () => {
    expect(
      resolveAdminResetTargetMeta({
        targetColor: "yellow",
        slotTargetBall: "red",
      })
    ).toBe("red");
    expect(
      resolveAdminResetTargetMeta({
        targetColor: "yellow",
        slotTargetBall: null,
      })
    ).toBe("yellow");
    expect(
      resolveAdminResetTargetMeta({
        targetColor: null,
        slotTargetBall: null,
      })
    ).toBeNull();
  });

  it("TEST A — Red Target Load → immediately editable", () => {
    const balls = {
      cue: { x: 30, y: 70 },
      target: { x: 20, y: 50 },
      second: { x: 15, y: 30 },
    };
    const recallState = simulateAdminRecallLoadedEditableState({
      recordTargetBall: "red",
      searchQueryTargetBall: "red",
    });
    expect(recallState.isAdminInputSessionActive).toBe(true);
    expect(recallState.canUseSystemControls).toBe(true);
    expect(recallState.targetColor).toBe("red");
    expect(balls.target).toEqual({ x: 20, y: 50 });
    expect(balls.second).toEqual({ x: 15, y: 30 });
  });

  it("TEST B — Yellow Target Load → immediately editable", () => {
    const balls = {
      cue: { x: 30, y: 70 },
      target: { x: 15, y: 30 },
      second: { x: 20, y: 50 },
    };
    const recallState = simulateAdminRecallLoadedEditableState({
      recordTargetBall: "yellow",
      searchQueryTargetBall: "yellow",
    });
    expect(recallState.isAdminInputSessionActive).toBe(true);
    expect(recallState.targetColor).toBe("yellow");
    expect(recallState.canUseSystemControls).toBe(true);
    expect(balls.target).toEqual({ x: 15, y: 30 });
    expect(balls.second).toEqual({ x: 20, y: 50 });
  });

  it("TEST C — Target NONE query → matched Red → Ready Red + editable", () => {
    const recallState = simulateAdminRecallLoadedEditableState({
      recordTargetBall: "red",
      searchQueryTargetBall: null,
    });
    expect(recallState.targetColor).toBe("red");
    expect(recallState.isAdminInputSessionActive).toBe(true);
    expect(recallState.canUseSystemControls).toBe(true);
  });

  it("TEST D — Coordinate invariance across Load editable transition", () => {
    const initialBalls = {
      cue: { x: 10, y: 20 },
      target: { x: 40, y: 50 },
      second: { x: 60, y: 70 },
    };
    const ballsSnapshot = JSON.parse(JSON.stringify(initialBalls));
    const loaded = simulateAdminRecallLoadedEditableState({
      recordTargetBall: "yellow",
    });
    expect(loaded.isAdminInputSessionActive).toBe(true);
    expect(initialBalls).toEqual(ballsSnapshot);
  });

  it("resolveAdminRecallTargetMeta prefers query lock then record", () => {
    expect(
      resolveAdminRecallTargetMeta({
        searchQueryTargetBall: "red",
        recordTargetBall: "yellow",
      })
    ).toBe("red");
  });

  it("source: App wires dblclick guard + explicit hydrate clear", () => {
    const app = readSrc("App.jsx");
    expect(app).toMatch(/shouldBlockTargetDblclickEditSession/);
    expect(app).toMatch(/setIsTargetSelected\(false\)/);
    expect(app).toMatch(/hydrateAdminRecallTarget/);
    const hydrateStart = app.indexOf("hydrateAdminRecallTarget:");
    const hydrateEnd = app.indexOf("},", hydrateStart);
    const body = app.slice(hydrateStart, hydrateEnd);
    expect(body).toMatch(/setIsTargetSelected\(false\)/);
    expect(body).toMatch(/setTargetColor\(null\)/);
  });

  it("source: History load uses normalizeAdminTargetBall + session true", () => {
    const settings = readSrc("hooks/useSettings.js");
    expect(settings).toMatch(/normalizeAdminTargetBall/);
    expect(settings).toMatch(/setIsAdminInputSessionActive\(true\)/);
    expect(settings).toMatch(/setIsTargetSelected\(restoredTarget != null\)/);
    const loadBody = settings.slice(
      settings.indexOf("handleLoadWorkspaceSnapshot"),
      settings.indexOf("clearEditSourceContext")
    );
    expect(loadBody).toMatch(/setIsAdminInputSessionActive\(true\)/);
    expect(loadBody).not.toMatch(/setIsAdminInputSessionActive\(false\)/);
  });

  it("source: LocalDB match keeps session editable (no session false after begin)", () => {
    const localDb = readSrc("application/flows/adminLocalDbFlow.ts");
    expect(localDb).toMatch(/beginAdminInputSession/);
    expect(localDb).not.toMatch(/setIsAdminInputSessionActive\(false\)/);
  });
});

function normalizeViaMeta(v: unknown) {
  return resolveAdminRecallTargetMeta({
    searchQueryTargetBall: null,
    recordTargetBall: v,
  });
}
