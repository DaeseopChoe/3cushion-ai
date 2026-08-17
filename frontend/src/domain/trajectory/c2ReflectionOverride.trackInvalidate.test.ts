/**
 * Track flip must invalidate stale C2 reflectionOverride so trajectoryBuilder
 * re-enters resolveReflectionC2 (no new C2 formula — existing geometry reuse).
 */
import { describe, expect, it } from "vitest";
import { resolveReflectionC2 } from "./reflectionPolicy";
import {
  normalizeTrackId,
  reflectionOverrideToPoint,
  shouldClearReflectionOverrideOnTrackChange,
  stripReflectionOverrideFromLayer,
} from "./c2ReflectionOverride";

describe("C2 reflectionOverride track invalidation", () => {
  it("keeps override when track is unchanged (incl. default normalize)", () => {
    expect(shouldClearReflectionOverrideOnTrackChange("B2T_L", "B2T_L")).toBe(
      false
    );
    expect(shouldClearReflectionOverrideOnTrackChange(null, "B2T_L")).toBe(
      false
    );
    expect(shouldClearReflectionOverrideOnTrackChange("B2T_R", "B2T_R")).toBe(
      false
    );
    expect(normalizeTrackId(undefined)).toBe("B2T_L");
  });

  it("clears override on Track L→R and R→L", () => {
    expect(shouldClearReflectionOverrideOnTrackChange("B2T_L", "B2T_R")).toBe(
      true
    );
    expect(shouldClearReflectionOverrideOnTrackChange("B2T_R", "B2T_L")).toBe(
      true
    );
  });

  it("stripReflectionOverrideFromLayer removes override and keeps other fields", () => {
    const layer = {
      sys: { track: "B2T_L", systemId: "5_half_system" },
      reflectionOverride: { rail: "TOP" as const, t: 0.4 },
      hpt: { T: "8/8" },
    };
    const stripped = stripReflectionOverrideFromLayer(layer);
    expect(stripped.reflectionOverride).toBeUndefined();
    expect(stripped.sys).toEqual(layer.sys);
    expect(stripped.hpt).toEqual(layer.hpt);
    // same track strip is a no-op path for callers that skip strip
    expect(stripReflectionOverrideFromLayer({ sys: { track: "B2T_L" } })).toEqual({
      sys: { track: "B2T_L" },
    });
  });

  it("Track L→R: old override point must not win over resolveReflectionC2", () => {
    const staleOverride = { rail: "TOP" as const, t: 0.35 };
    const stalePoint = reflectionOverrideToPoint(staleOverride);
    expect(stalePoint).not.toBeNull();

    // After Track flip, override is stripped → builder uses reflection (anchors.C2 absent)
    const layer = stripReflectionOverrideFromLayer({
      reflectionOverride: staleOverride,
      sys: { track: "B2T_R" },
    });
    expect(layer.reflectionOverride).toBeUndefined();

    const co = { x: 20, y: 0 };
    const c1 = { x: 0, y: 15 };
    const c3 = { x: 60, y: 40 };
    const reflected = resolveReflectionC2({
      co,
      c1,
      c3,
      tip: null,
      track: "B2T_R",
      manualHint: null,
      systemId: "5_half_system",
    });
    expect(reflected?.c2).toBeTruthy();
    const c2 = reflected!.c2!;
    // Stale was TOP t=0.35 → x≈28; must not reuse that override point (y may share TOP rail)
    expect(c2.x).not.toBeCloseTo(stalePoint!.x, 5);
    expect(
      shouldClearReflectionOverrideOnTrackChange("B2T_L", "B2T_R")
    ).toBe(true);
  });

  it("Track R→L: reflection path used when override cleared", () => {
    const staleOverride = { rail: "BOTTOM" as const, t: 0.7 };
    const stalePoint = reflectionOverrideToPoint(staleOverride)!;
    const layer = stripReflectionOverrideFromLayer({
      reflectionOverride: staleOverride,
    });
    expect(layer.reflectionOverride).toBeUndefined();

    const reflected = resolveReflectionC2({
      co: { x: 55, y: 0 },
      c1: { x: 80, y: 12 },
      c3: { x: 30, y: 40 },
      tip: null,
      track: "B2T_L",
      manualHint: null,
      systemId: "5_half_system",
    });
    expect(reflected?.c2).toBeTruthy();
    expect(reflected!.c2!.x).not.toBeCloseTo(stalePoint.x, 5);
    expect(reflected!.c2!.y).not.toBeCloseTo(stalePoint.y, 5);
  });

  it("same-track Apply keeps override point available for anchors.C2 injection", () => {
    const override = { rail: "RIGHT" as const, t: 0.5 };
    expect(shouldClearReflectionOverrideOnTrackChange("B2T_L", "B2T_L")).toBe(
      false
    );
    const kept = { reflectionOverride: override, sys: { track: "B2T_L" } };
    // no strip when track unchanged
    expect(kept.reflectionOverride).toEqual(override);
    const pt = reflectionOverrideToPoint(kept.reflectionOverride);
    expect(pt?.x).toBe(80);
  });
});

describe("commitDraftSys track-flip integration (slot draft shape)", () => {
  it("simulates draft spread: track flip omits override; same track keeps it", () => {
    const draftWithOverride = {
      sys: { track: "B2T_L", systemId: "5_half_system", inputs: {} },
      reflectionOverride: { rail: "TOP" as const, t: 0.2 },
      ai: { text: "" },
    };

    // same track — KEEP
    if (
      !shouldClearReflectionOverrideOnTrackChange(
        draftWithOverride.sys.track,
        "B2T_L"
      )
    ) {
      expect(draftWithOverride.reflectionOverride).toBeTruthy();
    }

    // flip — CLEAR via strip (mirrors buildSlotDraftWithUpdatedSys)
    const next =
      shouldClearReflectionOverrideOnTrackChange(
        draftWithOverride.sys.track,
        "B2T_R"
      )
        ? {
            ...stripReflectionOverrideFromLayer(draftWithOverride),
            sys: { ...draftWithOverride.sys, track: "B2T_R" },
          }
        : draftWithOverride;

    expect(next.reflectionOverride).toBeUndefined();
    expect(next.sys.track).toBe("B2T_R");
    expect(next.ai).toEqual({ text: "" });
  });
});
