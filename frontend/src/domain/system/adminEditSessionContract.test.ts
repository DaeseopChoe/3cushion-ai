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

  it("C: Recall → Reset → unlock + Target=NONE + session true", () => {
    const recalled = simulateAdminRecallViewOnlyState({
      recordTargetBall: "red",
    });
    const after = applyAdminWorkResetSession({
      appMode: "ADMIN",
      targetColor: recalled.targetColor,
      slotTargetBall: recalled.targetColor,
    });
    expect(after.isTargetSelected).toBe(false);
    expect(after.targetColor).toBeNull();
    expect(after.isAdminInputSessionActive).toBe(true);
    // Target is UNSELECTED until user explicitly double-clicks a target ball
    expect(after.canUseSystemControls).toBe(false);

    // Explicit double-click target selection enables system controls
    const withExplicitTarget = canUseAdminSystemControls({
      appMode: "ADMIN",
      isAdminInputSessionActive: after.isAdminInputSessionActive,
      targetReadyBall: resolveAdminTargetReadyBall({
        isTargetSelected: true,
        targetColor: "red",
      }),
    });
    expect(withExplicitTarget).toBe(true);
  });

  it("D: Recall → Target dblclick (blocked) → Reset still deterministic", () => {
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
    expect(after.isTargetSelected).toBe(false);
    expect(after.targetColor).toBeNull();
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
      expect(after.isTargetSelected).toBe(false);
      expect(after.targetColor).toBeNull();
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
    expect(after.isTargetSelected).toBe(false);
    expect(after.targetColor).toBeNull();
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

  it("resolveAdminResetTargetMeta returns null (Target NONE)", () => {
    expect(
      resolveAdminResetTargetMeta({
        targetColor: "yellow",
        slotTargetBall: "red",
      })
    ).toBeNull();
    expect(
      resolveAdminResetTargetMeta({
        targetColor: null,
        slotTargetBall: "red",
      })
    ).toBeNull();
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
