/**
 * Step 4 — RI → existing Calculator / buildTrajectory DI integration.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { applyCalculatorBridge } from "./applicationBridge";
import { runRealInterpolationSearchFlow } from "../../application/flows/realInterpolationSearchFlow";
import type { StrategyEntry } from "../positionSearchEngine";
import type { RealInterpolationStrategyResult } from "./types";
import { buildRealInterpolationTrajectoryBuildInput } from "./trajectoryBuildInput";

function makeEntry(
  slot: "S1" | "S2" | "S3",
  asid: string,
  sys: Record<string, number>
): StrategyEntry {
  return {
    slot,
    authoringStrategyId: asid,
    signature: {
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      formulaHash: "h1",
      classification: "A",
    },
    sysInputs: sys,
    ai: { text: "lesson-modal" },
    hpT: { T: "8/8", note: "hpt-modal" },
    str: { note: "str-modal" },
    meta: {
      impact: { x: 20, y: 18 },
      final: { x: 70, y: 40 },
      angle_ci: 1,
      angle_fs: -2,
    },
  };
}

function makeResult(
  overrides: Partial<RealInterpolationStrategyResult> = {}
): RealInterpolationStrategyResult {
  const asid = overrides.authoringStrategyId ?? "as_family_a";
  return {
    authoringStrategyId: asid,
    strategyRef: overrides.strategyRef ?? "pA.S1",
    matchType: overrides.matchType ?? "exact",
    confidence: overrides.confidence ?? 0.9,
    sysInputs: overrides.sysInputs ?? { CO_f: 30, Sn: 2 },
    ballsQuery: overrides.ballsQuery ?? {
      cue: { x: 20, y: 16 },
      target: { x: 20, y: 20 },
      second: { x: 60, y: 20 },
    },
    sourceKnotRefs: overrides.sourceKnotRefs ?? ["pA.S1"],
    primaryEntry:
      overrides.primaryEntry ?? makeEntry("S1", asid, { CO_f: 20 }),
    diagnostics: overrides.diagnostics,
    interpolationLambda: overrides.interpolationLambda,
  };
}

const minimalAppCtx = {
  anchors: { CO: { x: 0, y: 0 } },
  anchorsBase: null,
  rawAnchors: { CO: { x: 0, y: 0 } },
  resolveAnchorCtx: { track: "B2T_L", systemId: "5_half_system" },
  hitTolerance: 2,
  ballDiameterRg: 1.7,
  ballRadiusRg: 0.85,
  curveEps: 1e-6,
  adminState: { hpt: { T: "4/8" } },
  targetColor: "red",
  thicknessForCalc: "8/8",
  shotPattern: "default",
};

describe("buildRealInterpolationTrajectoryBuildInput", () => {
  it.each(["exact", "interpolated", "nearest"] as const)(
    "%s → Builder input consumes result.sysInputs as-is",
    (matchType) => {
      const sysInputs = { CO_f: matchType === "interpolated" ? 35 : 22, Sn: 3 };
      const result = makeResult({ matchType, sysInputs });
      const input = buildRealInterpolationTrajectoryBuildInput(
        result,
        minimalAppCtx
      );
      expect(input).not.toBeNull();
      expect(input!.balls).toEqual({
        cue: result.ballsQuery.cue,
        target: result.ballsQuery.target,
        target_center: result.ballsQuery.target,
        second: result.ballsQuery.second,
      });
      // slotRenderSys.inputs come from projected entry.sysInputs (= result.sysInputs)
      expect(input!.slotRenderSys?.inputs?.CO_f ?? input!.baseSysValues?.CO_f).toBe(
        sysInputs.CO_f
      );
      expect(input!.adminState?.hpt).toMatchObject({ T: "8/8", note: "hpt-modal" });
    }
  );

  it("interpolated sysInputs not replaced by primaryEntry.sysInputs", () => {
    const primary = makeEntry("S1", "as_family_a", { CO_f: 10 });
    const result = makeResult({
      matchType: "interpolated",
      sysInputs: { CO_f: 40 },
      primaryEntry: primary,
    });
    const input = buildRealInterpolationTrajectoryBuildInput(
      result,
      minimalAppCtx
    );
    expect(input).not.toBeNull();
    const co =
      input!.slotRenderSys?.inputs?.CO_f ?? input!.baseSysValues?.CO_f;
    expect(co).toBe(40);
    expect(co).not.toBe(primary.sysInputs.CO_f);
  });

  it("cross-family / malformed → null (no Builder input)", () => {
    expect(
      buildRealInterpolationTrajectoryBuildInput(
        makeResult({
          authoringStrategyId: "as_a",
          primaryEntry: makeEntry("S1", "as_b", { CO_f: 1 }),
        }),
        minimalAppCtx
      )
    ).toBeNull();

    expect(
      buildRealInterpolationTrajectoryBuildInput(null, minimalAppCtx)
    ).toBeNull();

    expect(
      buildRealInterpolationTrajectoryBuildInput(makeResult(), null)
    ).toBeNull();
  });

  it("strategyRef remains separate from authoringStrategyId", () => {
    const result = makeResult({
      authoringStrategyId: "as_family_a",
      strategyRef: "pA.S1",
    });
    const input = buildRealInterpolationTrajectoryBuildInput(
      result,
      minimalAppCtx
    );
    expect(input).not.toBeNull();
    expect(result.authoringStrategyId).not.toBe(result.strategyRef);
    expect(result.authoringStrategyId).toBe("as_family_a");
  });

  it("deterministic same RI input → same Builder input", () => {
    const result = makeResult({
      matchType: "interpolated",
      sysInputs: { CO_f: 33 },
    });
    const a = buildRealInterpolationTrajectoryBuildInput(result, minimalAppCtx);
    const b = buildRealInterpolationTrajectoryBuildInput(result, minimalAppCtx);
    expect(a).toEqual(b);
  });
});

describe("applyCalculatorBridge Builder DI", () => {
  const resolveEvalProfile = () => ({});

  it("exact/interpolated/nearest reach buildTrajectory with injected deps", () => {
    for (const matchType of ["exact", "interpolated", "nearest"] as const) {
      const buildTrajectory = vi.fn(() => ({ ok: true, matchType }));
      const results = applyCalculatorBridge([makeResult({ matchType })], {
        resolveEvalProfile,
        buildTrajectory,
        buildTrajectoryInput: (r) =>
          buildRealInterpolationTrajectoryBuildInput(r, minimalAppCtx),
      });
      expect(buildTrajectory).toHaveBeenCalledTimes(1);
      expect(results[0].authoringStrategyId).toBe("as_family_a");
      expect(results[0].strategyRef).toBe("pA.S1");
      expect(results[0].trajectory).toEqual({ ok: true, matchType });
      expect(results[0].matchType).toBe(matchType);
    }
  });

  it("cross-family malformed → no buildTrajectory call", () => {
    const buildTrajectory = vi.fn(() => ({ fake: true }));
    const bad = makeResult({
      authoringStrategyId: "as_a",
      primaryEntry: makeEntry("S1", "as_b", { CO_f: 1 }),
    });
    const results = applyCalculatorBridge([bad], {
      resolveEvalProfile,
      buildTrajectory,
      buildTrajectoryInput: (r) =>
        buildRealInterpolationTrajectoryBuildInput(r, minimalAppCtx),
    });
    expect(buildTrajectory).not.toHaveBeenCalled();
    expect(results[0].trajectory).toBeNull();
    expect(results[0].diagnostics?.reasons?.some((x) =>
      x.startsWith("builder_skip:")
    )).toBe(true);
  });

  it("malformed RI / missing app ctx → no buildTrajectory call", () => {
    const buildTrajectory = vi.fn(() => ({ fake: true }));
    const results = applyCalculatorBridge([makeResult()], {
      resolveEvalProfile,
      buildTrajectory,
      buildTrajectoryInput: (r) =>
        buildRealInterpolationTrajectoryBuildInput(r, null),
    });
    expect(buildTrajectory).not.toHaveBeenCalled();
    expect(results[0].trajectory).toBeNull();
  });

  it("Builder throw → diagnostic fail-closed, no fake trajectory", () => {
    const buildTrajectory = vi.fn(() => {
      throw new Error("boom");
    });
    const results = applyCalculatorBridge([makeResult()], {
      resolveEvalProfile,
      buildTrajectory,
      buildTrajectoryInput: (r) =>
        buildRealInterpolationTrajectoryBuildInput(r, minimalAppCtx),
    });
    expect(results[0].trajectory).toBeNull();
    expect(results[0].diagnostics?.reasons?.some((x) =>
      x.includes("builder_fail:boom")
    )).toBe(true);
  });

  it("Builder unavailable → no trajectory field, no fake", () => {
    const results = applyCalculatorBridge([makeResult()], {
      resolveEvalProfile,
    });
    expect(results[0].trajectory).toBeUndefined();
    expect(results[0].authoringStrategyId).toBe("as_family_a");
  });

  it("authoringStrategyId preserved through Calculator/Builder path", () => {
    const buildTrajectory = vi.fn((input) => ({
      built: true,
      co: input?.slotRenderSys?.inputs?.CO_f,
    }));
    const result = makeResult({
      authoringStrategyId: "as_keep",
      sysInputs: { CO_f: 41 },
      primaryEntry: makeEntry("S1", "as_keep", { CO_f: 10 }),
    });
    const out = applyCalculatorBridge([result], {
      resolveEvalProfile,
      buildTrajectory,
      buildTrajectoryInput: (r) =>
        buildRealInterpolationTrajectoryBuildInput(r, minimalAppCtx),
    });
    expect(out[0].authoringStrategyId).toBe("as_keep");
    expect(out[0].strategyRef).toBe("pA.S1");
    expect(out[0].authoringStrategyId).not.toBe(out[0].strategyRef);
    expect(buildTrajectory.mock.calls[0][0].slotRenderSys.inputs.CO_f).toBe(41);
  });
});

describe("RI unavailable / USER Search isolation", () => {
  it("null envelope → empty RI results; USER path conceptually unaffected", () => {
    const buildTrajectory = vi.fn();
    const { results } = runRealInterpolationSearchFlow({
      query: {
        cue: { x: 20, y: 16 },
        target: { x: 20, y: 20 },
        second: { x: 60, y: 20 },
      },
      positionRecords: [],
      envelopeDataset: null,
      resolveEvalProfile: () => ({}),
      buildTrajectory,
      buildTrajectoryInput: (r) =>
        buildRealInterpolationTrajectoryBuildInput(r, minimalAppCtx),
    });
    expect(results).toEqual([]);
    expect(buildTrajectory).not.toHaveBeenCalled();
  });
});

describe("no SYS/Modal re-interpolation in Step 4 adapter", () => {
  it("trajectoryBuildInput source has no interpolate ownership", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const text = readFileSync(join(here, "trajectoryBuildInput.ts"), "utf8");
    expect(text).not.toMatch(/sysInterpolate/);
    expect(text).not.toMatch(/interpolateSys/);
    expect(text).not.toMatch(/Modal blend|modalBlend/i);
    expect(text).toMatch(/projectRealInterpolationResultToStrategyEntry/);
    expect(text).toMatch(/strategyEntryToSlotDraftSys/);
  });
});

describe("App Step 4 wiring audit", () => {
  it("injects existing buildTrajectory DI; no new Builder/Calculator globals", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const text = readFileSync(join(here, "../../App.jsx"), "utf8");

    expect(text).toMatch(/buildRealInterpolationTrajectoryBuildInput/);
    expect(text).toMatch(/riTrajectoryContextRef/);
    expect(text).toMatch(/buildTrajectoryInput:\s*\(riResult\)\s*=>/);
    expect(text).toMatch(/runRealInterpolationSearchFlow\(\{[\s\S]*?buildTrajectory,/);

    // USER Search canonical path unchanged
    expect(text).toMatch(/applyUserSearchRecall/);
    expect(text).toMatch(/activateStrategySlot\(slotId\)/);
    expect(text).toMatch(/function hydrateSlotRuntime\(slotId\)/);

    // No new window Builder/Calculator globals
    expect(text).not.toMatch(/__BUILD_TRAJECTORY__/);
    expect(text).not.toMatch(/__RI_BUILDER__/);
    expect(text).not.toMatch(/__CALCULATOR__/);
    expect(text).not.toMatch(/__RI_TRAJECTORY__/);
    expect(text).not.toMatch(/__ENVELOPE_PUBLISHED_DATASET__/);

    // Existing selection hooks preserved (not redesigned)
    expect(text).toMatch(/__REAL_INTERPOLATION_TOP3__/);
    expect(text).toMatch(/__REAL_INTERPOLATION_ACTIVATE__/);
  });
});
