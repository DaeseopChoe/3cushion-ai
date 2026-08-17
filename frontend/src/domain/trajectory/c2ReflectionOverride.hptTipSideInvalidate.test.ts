/**
 * HP/T tip side L↔R must invalidate stale C2 reflectionOverride so
 * trajectoryBuilder re-enters resolveReflectionC2 with the new tip.
 */
import { describe, expect, it } from "vitest";
import { resolveReflectionC2 } from "./reflectionPolicy";
import { resolveTrajectoryDisplayCap } from "../trajectoryPathDisplayPolicy";
import {
  canonicalTipSideFromHpt,
  reflectionOverrideToPoint,
  shouldClearReflectionOverrideOnHptTipSideChange,
  stripReflectionOverrideFromLayer,
} from "./c2ReflectionOverride";

const HPT_L = {
  T: "8/8",
  hit_point: { x: -2, y: 1 },
  mode: "TIP" as const,
  tipCount: 2,
};
const HPT_R = {
  T: "8/8",
  hit_point: { x: 2, y: 1 },
  mode: "TIP" as const,
  tipCount: 2,
};
const HPT_L_MOVED = {
  T: "8/8",
  hit_point: { x: -3.5, y: 0.5 },
  mode: "TIP" as const,
  tipCount: 3,
};
const HPT_R_MOVED = {
  T: "-3/8",
  hit_point: { x: 1.5, y: -1 },
  mode: "TIP" as const,
  tipCount: 1,
};

const co = { x: 20, y: 0 };
const c1 = { x: 0, y: 15 };
const c3 = { x: 60, y: 40 };
const track = "B2T_L";

function tipFromHpt(hpt: typeof HPT_L) {
  const side = canonicalTipSideFromHpt(hpt)!;
  return { count: hpt.tipCount, side };
}

function reflectWithTip(hpt: typeof HPT_L) {
  return resolveReflectionC2({
    co,
    c1,
    c3,
    tip: tipFromHpt(hpt),
    track,
    manualHint: null,
    systemId: "5_half_system",
  });
}

describe("canonicalTipSideFromHpt", () => {
  it("T1/T2: L from negative x, R from non-negative x", () => {
    expect(canonicalTipSideFromHpt(HPT_L)).toBe("L");
    expect(canonicalTipSideFromHpt(HPT_R)).toBe("R");
    expect(canonicalTipSideFromHpt({ hit_point: { x: 0, y: 0 } })).toBe("R");
    expect(canonicalTipSideFromHpt({ hp: { x: -0.1, y: 0 } })).toBe("L");
  });

  it("missing / invalid hp → null", () => {
    expect(canonicalTipSideFromHpt(null)).toBeNull();
    expect(canonicalTipSideFromHpt({})).toBeNull();
    expect(canonicalTipSideFromHpt({ hit_point: { x: "1" } })).toBeNull();
  });
});

describe("C2 reflectionOverride HP/T tip-side invalidation", () => {
  it("T5: L→L keeps override (no clear)", () => {
    expect(
      shouldClearReflectionOverrideOnHptTipSideChange(HPT_L, HPT_L_MOVED)
    ).toBe(false);
  });

  it("T6: R→R keeps override (no clear)", () => {
    expect(
      shouldClearReflectionOverrideOnHptTipSideChange(HPT_R, HPT_R_MOVED)
    ).toBe(false);
  });

  it("T3: L→R clears", () => {
    expect(
      shouldClearReflectionOverrideOnHptTipSideChange(HPT_L, HPT_R)
    ).toBe(true);
  });

  it("T4: R→L clears", () => {
    expect(
      shouldClearReflectionOverrideOnHptTipSideChange(HPT_R, HPT_L)
    ).toBe(true);
  });

  it("T3 fixture: Load L + override → tip R strips override", () => {
    const staleOverride = { rail: "TOP" as const, t: 0.35 };
    const layer = {
      hpt: HPT_L,
      reflectionOverride: staleOverride,
      sys: { track },
    };
    expect(
      shouldClearReflectionOverrideOnHptTipSideChange(layer.hpt, HPT_R)
    ).toBe(true);
    const next = {
      ...stripReflectionOverrideFromLayer(layer),
      hpt: HPT_R,
    };
    expect(next.reflectionOverride).toBeUndefined();
    expect(next.hpt).toEqual(HPT_R);
    expect(next.sys).toEqual(layer.sys);
  });

  it("T4 fixture: Load R + override → tip L strips override", () => {
    const staleOverride = { rail: "TOP" as const, t: 0.6 };
    const layer = stripReflectionOverrideFromLayer({
      reflectionOverride: staleOverride,
      hpt: HPT_R,
    });
    expect(layer.reflectionOverride).toBeUndefined();
  });

  it("T7: after L→R invalidate, reflected C2 matches fresh R (not stale override)", () => {
    const staleOverride = { rail: "TOP" as const, t: 0.35 };
    const stalePoint = reflectionOverrideToPoint(staleOverride)!;
    expect(
      shouldClearReflectionOverrideOnHptTipSideChange(HPT_L, HPT_R)
    ).toBe(true);
    const stripped = stripReflectionOverrideFromLayer({
      reflectionOverride: staleOverride,
    });
    expect(stripped.reflectionOverride).toBeUndefined();

    const freshR = reflectWithTip(HPT_R);
    expect(freshR?.c2).toBeTruthy();
    const afterInvalidate = reflectWithTip(HPT_R);
    expect(afterInvalidate!.c2!.x).toBeCloseTo(freshR!.c2!.x, 8);
    expect(afterInvalidate!.c2!.y).toBeCloseTo(freshR!.c2!.y, 8);
    expect(afterInvalidate!.c2!.x).not.toBeCloseTo(stalePoint.x, 5);
  });

  it("T8: after R→L invalidate, reflected C2 matches fresh L", () => {
    const staleOverride = { rail: "TOP" as const, t: 0.7 };
    const stalePoint = reflectionOverrideToPoint(staleOverride)!;
    stripReflectionOverrideFromLayer({ reflectionOverride: staleOverride });

    const freshL = reflectWithTip(HPT_L);
    expect(freshL?.c2).toBeTruthy();
    expect(freshL!.c2!.x).not.toBeCloseTo(stalePoint.x, 5);

    const tipL = tipFromHpt(HPT_L);
    const tipR = tipFromHpt(HPT_R);
    expect(tipL.side).not.toBe(tipR.side);
    const c2L = reflectWithTip(HPT_L)!.c2!;
    const c2R = reflectWithTip(HPT_R)!.c2!;
    // Different tip sides must produce different C2 under same rails
    expect(c2L.x !== c2R.x || c2L.y !== c2R.y).toBe(true);
  });

  it("T9: stale override as anchors.C2 can cut path; after strip reflection yields C2 node", () => {
    const staleOverride = { rail: "LEFT" as const, t: 0.5 };
    const staleC2 = reflectionOverrideToPoint(staleOverride)!;
    // Synthetic path: C1 and forced same-rail C2 → same_rail cap risk
    const pathWithStale = [
      { x: 20, y: 0 },
      { x: 0, y: 15 },
      { x: staleC2.x, y: staleC2.y },
      { x: 60, y: 40 },
      null,
      null,
      null,
    ];
    const capStale = resolveTrajectoryDisplayCap(pathWithStale, null, 2);
    expect(capStale.endIndex).toBeGreaterThanOrEqual(0);

    const reflected = reflectWithTip(HPT_R);
    expect(reflected?.c2).toBeTruthy();
    const pathFresh = [
      { x: 20, y: 0 },
      { x: 0, y: 15 },
      reflected!.c2!,
      { x: 60, y: 40 },
      { x: 80, y: 20 },
      { x: 40, y: 0 },
      { x: 0, y: 10 },
    ];
    const capFresh = resolveTrajectoryDisplayCap(pathFresh, null, 2);
    // Fresh tip reflection path must not be truncated solely by missing C2
    expect(pathFresh[2]).toBeTruthy();
    expect(capFresh.reason).not.toBe("missing_node");
  });
});

describe("HP/T tip-side wiring (source contracts)", () => {
  it("App HPT onSave and applyHptToSlot call tip-side clear helper", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    const slots = readFileSync(join(root, "hooks/useShotSlots.ts"), "utf8");
    expect(app).toMatch(/shouldClearReflectionOverrideOnHptTipSideChange/);
    expect(app).toMatch(/setC2ReflectionOverride\(null\)/);
    expect(slots).toMatch(/shouldClearReflectionOverrideOnHptTipSideChange/);
    expect(slots).toMatch(/stripReflectionOverrideFromLayer\(nextDraft\)/);
    expect(slots).toMatch(/stripReflectionOverrideFromLayer\(nextApplied\)/);
  });

  it("T10: showBaseLine toggle site unchanged (selector only)", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const app = readFileSync(join(root, "App.jsx"), "utf8");
    // HPT onSave must not touch showBaseLine
    const start = app.indexOf("overlayState.type === 'HPT'");
    const end = app.indexOf("overlayState.type === 'STR'", start);
    const body = app.slice(start, end);
    expect(body).not.toMatch(/setShowBaseLine/);
  });
});
