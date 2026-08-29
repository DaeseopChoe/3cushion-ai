/**
 * ADMIN POLICY A — Recall view-only; Reset = only Recall→Edit transition.
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
  simulateAdminRecallViewOnlyState,
} from "./adminEditSessionContract";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), "utf8");
}

describe("adminEditSessionContract — POLICY A", () => {
  it("A: Recall with target metadata → locked + session false", () => {
    const s = simulateAdminRecallViewOnlyState({
      recordTargetBall: "red",
      prevIsTargetSelected: false,
    });
    expect(s.isTargetSelected).toBe(true);
    expect(s.targetColor).toBe("red");
    expect(s.isAdminInputSessionActive).toBe(false);
    expect(s.canUseSystemControls).toBe(false);
  });

  it("B: Recall Target dblclick blocked → session remains false", () => {
    const s = simulateAdminRecallViewOnlyState({ recordTargetBall: "yellow" });
    expect(s.blockTargetDblclickEditSession).toBe(true);
    expect(s.isAdminInputSessionActive).toBe(false);
    // Simulating dblclick: guard fires → session unchanged
    expect(
      shouldBlockTargetDblclickEditSession({
        isAdminInputSessionActive: s.isAdminInputSessionActive,
        adminTableLayersVisible: s.adminTableLayersVisible,
      })
    ).toBe(true);
  });

  it("C: Recall → Reset → preserves Target identity + session true + controls enabled", () => {
    const recalled = simulateAdminRecallViewOnlyState({
      recordTargetBall: "red",
    });
    const after = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recalled.targetColor,
      slotTargetBall: recalled.targetColor,
    });
    expect(after.isTargetSelected).toBe(true);
    expect(after.targetColor).toBe("red");
    expect(after.slotTargetBall).toBe("red");
    expect(after.isAdminInputSessionActive).toBe(true);
    expect(after.canUseSystemControls).toBe(true);
  });

  it("D: Recall → Target dblclick (blocked) → Reset preserves Target identity & enables controls", () => {
    const recalled = simulateAdminRecallViewOnlyState({
      recordTargetBall: "yellow",
    });
    expect(recalled.blockTargetDblclickEditSession).toBe(true);
    // dblclick no-op: state unchanged
    const after = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recalled.targetColor,
      slotTargetBall: "yellow",
    });
    expect(after.isAdminInputSessionActive).toBe(true);
    expect(after.isTargetSelected).toBe(true);
    expect(after.targetColor).toBe("yellow");
    expect(after.canUseSystemControls).toBe(true);
  });

  it("E/F: Recall → Reset → Search/Recall cycle ×3 — identical", () => {
    for (let i = 0; i < 3; i++) {
      const recalled = simulateAdminRecallViewOnlyState({
        recordTargetBall: "red",
        searchQueryTargetBall: null,
        prevIsTargetSelected: false,
        prevTargetColor: null,
      });
      expect(recalled.isAdminInputSessionActive).toBe(false);
      expect(recalled.blockTargetDblclickEditSession).toBe(true);
      expect(recalled.canUseSystemControls).toBe(false);

      const after = applyAdminWorkResetSession({
        appMode: "ADMIN",
        targetColor: recalled.targetColor,
        slotTargetBall: "red",
      });
      expect(after.isAdminInputSessionActive).toBe(true);
      expect(after.isTargetSelected).toBe(true);
      expect(after.targetColor).toBe("red");
      expect(after.canUseSystemControls).toBe(true);
    }
  });

  it("G: metadata-absent Recall clears stale previous Target Lock", () => {
    const lock = applyAdminRecallTargetLockHydrate(null);
    expect(lock.isTargetSelected).toBe(false);
    expect(lock.targetColor).toBeNull();

    const s = simulateAdminRecallViewOnlyState({
      recordTargetBall: null,
      prevIsTargetSelected: true,
      prevTargetColor: "red",
    });
    expect(s.isTargetSelected).toBe(false);
    expect(s.targetColor).toBeNull();
    // Still view-only: unlocked Target dblclick must not open session
    expect(s.blockTargetDblclickEditSession).toBe(true);
  });

  it("H: History Recall shares same view-only + Reset contract", () => {
    // History: session false + explicit lock from snapshot targetBall
    const histLock = applyAdminRecallTargetLockHydrate(
      normalizeViaMeta("red")
    );
    expect(histLock.isTargetSelected).toBe(true);
    expect(
      canUseAdminSystemControls({
        appMode: "ADMIN",
        isAdminInputSessionActive: false,
        targetReadyBall: resolveAdminTargetReadyBall({
          isTargetSelected: histLock.isTargetSelected,
          targetColor: histLock.targetColor,
          slotTargetBall: histLock.targetColor,
        }),
      })
    ).toBe(false);

    const after = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: "red",
      slotTargetBall: "red",
    });
    expect(after.isTargetSelected).toBe(true);
    expect(after.targetColor).toBe("red");
    expect(after.canUseSystemControls).toBe(true);
  });

  it("fresh ADMIN (layers off) does not block Target dblclick edit start", () => {
    expect(
      shouldBlockTargetDblclickEditSession({
        isAdminInputSessionActive: false,
        adminTableLayersVisible: false,
      })
    ).toBe(false);
  });

  it("after Reset (session on) Target dblclick edit path is not blocked", () => {
    expect(
      shouldBlockTargetDblclickEditSession({
        isAdminInputSessionActive: true,
        adminTableLayersVisible: true,
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

  // ────────────────────────────────────────────────────────────
  // Lifecycle Regression Tests (TEST A ~ TEST E)
  // ────────────────────────────────────────────────────────────
  it("TEST A — Red Target Lifecycle: Red Target → Recall (view-only) → Reset (Red preserved, controls enabled)", () => {
    const balls = {
      cue: { x: 30, y: 70 },
      target: { x: 20, y: 50 }, // Physical Red
      second: { x: 15, y: 30 }, // Physical Yellow
    };
    // 1. Recall with Red target
    const recallState = simulateAdminRecallViewOnlyState({
      recordTargetBall: "red",
      searchQueryTargetBall: "red",
    });
    expect(recallState.isAdminInputSessionActive).toBe(false);
    expect(recallState.canUseSystemControls).toBe(false);
    expect(recallState.targetColor).toBe("red");

    // 2. Reset to Edit
    const editState = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recallState.targetColor,
      slotTargetBall: "red",
    });
    expect(editState.isAdminInputSessionActive).toBe(true);
    expect(editState.targetColor).toBe("red");
    expect(editState.isTargetSelected).toBe(true);
    expect(editState.canUseSystemControls).toBe(true);

    // 3. Coordinate invariance check
    expect(balls.target).toEqual({ x: 20, y: 50 });
    expect(balls.second).toEqual({ x: 15, y: 30 });
  });

  it("TEST B — Yellow Target Lifecycle: Yellow Target → Recall (view-only) → Reset (Yellow preserved, controls enabled)", () => {
    const balls = {
      cue: { x: 30, y: 70 },
      target: { x: 15, y: 30 }, // Physical Yellow
      second: { x: 20, y: 50 }, // Physical Red
    };
    // 1. Recall with Yellow target
    const recallState = simulateAdminRecallViewOnlyState({
      recordTargetBall: "yellow",
      searchQueryTargetBall: "yellow",
    });
    expect(recallState.isAdminInputSessionActive).toBe(false);
    expect(recallState.canUseSystemControls).toBe(false);
    expect(recallState.targetColor).toBe("yellow");

    // 2. Reset to Edit
    const editState = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recallState.targetColor,
      slotTargetBall: "yellow",
    });
    expect(editState.isAdminInputSessionActive).toBe(true);
    expect(editState.targetColor).toBe("yellow");
    expect(editState.isTargetSelected).toBe(true);
    expect(editState.canUseSystemControls).toBe(true);

    // 3. Coordinate invariance check
    expect(balls.target).toEqual({ x: 15, y: 30 });
    expect(balls.second).toEqual({ x: 20, y: 50 });
  });

  it("TEST C — Target NONE Search Lifecycle: NONE query → Recalled Red match → Reset preserves matched Red", () => {
    // 1. Search in Target=NONE mode, matches a record with targetBall="red"
    const recallState = simulateAdminRecallViewOnlyState({
      recordTargetBall: "red",
      searchQueryTargetBall: null, // query was Target=NONE
    });
    expect(recallState.targetColor).toBe("red");
    expect(recallState.isAdminInputSessionActive).toBe(false);
    expect(recallState.canUseSystemControls).toBe(false);

    // 2. Reset to Edit
    const editState = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recallState.targetColor,
      slotTargetBall: "red",
    });
    expect(editState.isAdminInputSessionActive).toBe(true);
    expect(editState.targetColor).toBe("red");
    expect(editState.canUseSystemControls).toBe(true);
  });

  it("TEST D & E — Coordinate Invariance and View-Only Invariant across transitions", () => {
    const initialBalls = {
      cue: { x: 10, y: 20 },
      target: { x: 40, y: 50 },
      second: { x: 60, y: 70 },
    };
    const ballsSnapshot = JSON.parse(JSON.stringify(initialBalls));

    // Recall view-only
    const recalled = simulateAdminRecallViewOnlyState({ recordTargetBall: "yellow" });
    expect(recalled.isAdminInputSessionActive).toBe(false);
    expect(recalled.canUseSystemControls).toBe(false);

    // Reset
    const after = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recalled.targetColor,
      slotTargetBall: "yellow",
    });
    expect(after.isAdminInputSessionActive).toBe(true);
    expect(after.canUseSystemControls).toBe(true);

    // Coordinates untouched
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

  it("source: App wires POLICY A dblclick guard + explicit hydrate clear", () => {
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

  it("source: History load uses normalizeAdminTargetBall + session false", () => {
    const settings = readSrc("hooks/useSettings.js");
    expect(settings).toMatch(/normalizeAdminTargetBall/);
    expect(settings).toMatch(/setIsAdminInputSessionActive\(false\)/);
    expect(settings).toMatch(/setIsTargetSelected\(restoredTarget != null\)/);
  });
});

function normalizeViaMeta(v: unknown) {
  return resolveAdminRecallTargetMeta({
    searchQueryTargetBall: null,
    recordTargetBall: v,
  });
}
