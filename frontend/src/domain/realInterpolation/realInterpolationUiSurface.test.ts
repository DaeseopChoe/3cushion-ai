/**
 * Step 5 — RI UI surface (matchType / confidence / Top-3) tests.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { StrategyEntry } from "../positionSearchEngine";
import type { RealInterpolationStrategyResult } from "./types";
import {
  buildRealInterpolationUiSurface,
  formatRiConfidenceLabel,
  formatRiMatchTypeLabel,
} from "./uiSurface";

function makeEntry(
  asid: string,
  shotType: string,
  slot: "S1" | "S2" | "S3" = "S1"
): StrategyEntry {
  return {
    slot,
    authoringStrategyId: asid,
    signature: {
      shotType,
      systemId: "5_half_system",
      formulaHash: "h1",
      classification: "A",
    },
    sysInputs: { CO_f: 30 },
    meta: {
      impact: { x: 1, y: 1 },
      final: { x: 2, y: 2 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
}

function makeResult(
  overrides: Partial<RealInterpolationStrategyResult> & {
    authoringStrategyId: string;
    matchType: RealInterpolationStrategyResult["matchType"];
    confidence: number;
    shotType?: string;
  }
): RealInterpolationStrategyResult {
  const asid = overrides.authoringStrategyId;
  const shotType = overrides.shotType ?? "뒤돌리기";
  return {
    authoringStrategyId: asid,
    strategyRef: overrides.strategyRef ?? `${asid}.S1`,
    matchType: overrides.matchType,
    confidence: overrides.confidence,
    sysInputs: overrides.sysInputs ?? { CO_f: 30 },
    ballsQuery: overrides.ballsQuery ?? {
      cue: { x: 20, y: 16 },
      target: { x: 20, y: 20 },
      second: { x: 60, y: 20 },
    },
    sourceKnotRefs: overrides.sourceKnotRefs ?? [`${asid}.S1`],
    primaryEntry:
      overrides.primaryEntry ?? makeEntry(asid, shotType),
  };
}

describe("buildRealInterpolationUiSurface", () => {
  it("exact / interpolated / nearest display pass-through", () => {
    for (const matchType of ["exact", "interpolated", "nearest"] as const) {
      const surface = buildRealInterpolationUiSurface([
        makeResult({
          authoringStrategyId: `as_${matchType}`,
          matchType,
          confidence: matchType === "exact" ? 100 : 72,
        }),
      ]);
      expect(surface.candidates).toHaveLength(1);
      expect(surface.candidates[0].matchType).toBe(matchType);
      expect(formatRiMatchTypeLabel(surface.candidates[0].matchType)).toBe(
        matchType
      );
    }
  });

  it("confidence equals engine result (no recompute)", () => {
    const surface = buildRealInterpolationUiSurface([
      makeResult({
        authoringStrategyId: "as_c",
        matchType: "interpolated",
        confidence: 82,
      }),
    ]);
    expect(surface.primary?.confidence).toBe(82);
    expect(formatRiConfidenceLabel(surface.primary!.confidence)).toBe("82");
  });

  it("Top-3 max 3 and preserves engine order", () => {
    const results = [
      makeResult({
        authoringStrategyId: "as_1",
        matchType: "exact",
        confidence: 100,
        shotType: "A",
      }),
      makeResult({
        authoringStrategyId: "as_2",
        matchType: "interpolated",
        confidence: 90,
        shotType: "B",
      }),
      makeResult({
        authoringStrategyId: "as_3",
        matchType: "nearest",
        confidence: 80,
        shotType: "C",
      }),
      makeResult({
        authoringStrategyId: "as_4",
        matchType: "nearest",
        confidence: 70,
        shotType: "D",
      }),
    ];
    const surface = buildRealInterpolationUiSurface(results);
    expect(surface.candidates).toHaveLength(3);
    expect(surface.candidates.map((c) => c.authoringStrategyId)).toEqual([
      "as_1",
      "as_2",
      "as_3",
    ]);
    expect(surface.candidates.map((c) => c.confidence)).toEqual([100, 90, 80]);
  });

  it("same display name with different authoringStrategyId is not deduped", () => {
    const surface = buildRealInterpolationUiSurface([
      makeResult({
        authoringStrategyId: "as_alpha",
        matchType: "exact",
        confidence: 100,
        shotType: "뒤돌리기",
      }),
      makeResult({
        authoringStrategyId: "as_beta",
        matchType: "interpolated",
        confidence: 88,
        shotType: "뒤돌리기",
      }),
    ]);
    expect(surface.candidates).toHaveLength(2);
    expect(surface.candidates[0].displayName).toBe("뒤돌리기");
    expect(surface.candidates[1].displayName).toBe("뒤돌리기");
    expect(surface.candidates[0].authoringStrategyId).toBe("as_alpha");
    expect(surface.candidates[1].authoringStrategyId).toBe("as_beta");
  });

  it("RI empty → empty/hidden surface", () => {
    expect(buildRealInterpolationUiSurface([])).toEqual({
      candidates: [],
      primary: null,
    });
    expect(buildRealInterpolationUiSurface(null)).toEqual({
      candidates: [],
      primary: null,
    });
  });

  it("skips malformed candidates without inventing matchType/confidence", () => {
    const good = makeResult({
      authoringStrategyId: "as_ok",
      matchType: "nearest",
      confidence: 55,
    });
    const badAsid = {
      ...makeResult({
        authoringStrategyId: "as_bad",
        matchType: "exact",
        confidence: 100,
      }),
      authoringStrategyId: "   ",
    };
    const surface = buildRealInterpolationUiSurface([badAsid, good]);
    expect(surface.candidates.map((c) => c.authoringStrategyId)).toEqual([
      "as_ok",
    ]);
  });
});

describe("App Step 5 UI wiring audit", () => {
  it("uses App state surface + existing RI activate path", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const appText = readFileSync(join(here, "../../App.jsx"), "utf8");
    const panelText = readFileSync(
      join(here, "../../components/user/RealInterpolationPanel.jsx"),
      "utf8"
    );

    expect(appText).toMatch(/buildRealInterpolationUiSurface/);
    expect(appText).toMatch(/RealInterpolationPanel/);
    expect(appText).toMatch(/handleRealInterpolationUiSelect/);
    expect(appText).toMatch(
      /activateRealInterpolationCandidate\(result,\s*slotHint\)/
    );

    // Step 3 / Step 4 contracts preserved
    expect(appText).toMatch(/projectRealInterpolationResultToStrategyEntry/);
    expect(appText).toMatch(/activateStrategySlot\(/);
    expect(appText).toMatch(/buildRealInterpolationTrajectoryBuildInput/);
    expect(appText).toMatch(
      /const \{ results \} = runRealInterpolationSearchFlow\(\{[\s\S]*?buildTrajectory,/
    );

    // Fail-closed / no Envelope window / no new production globals
    expect(appText).not.toMatch(/__ENVELOPE_PUBLISHED_DATASET__/);
    expect(appText).not.toMatch(/__RI_UI__/);
    expect(appText).not.toMatch(/__BUILD_TRAJECTORY__/);
    expect(appText).not.toMatch(/__RI_TRAJECTORY__/);

    // Existing hooks kept (not redesigned away)
    expect(appText).toMatch(/__REAL_INTERPOLATION_TOP3__/);
    expect(appText).toMatch(/__REAL_INTERPOLATION_ACTIVATE__/);

    // Panel is display + click only
    expect(panelText).toMatch(/data-ri-ui-surface/);
    expect(panelText).toMatch(/data-ri-top3/);
    expect(panelText).not.toMatch(/sysInterpolate|buildTrajectory|evaluateStrategy/);
    expect(panelText).not.toMatch(/activateStrategySlot/);
  });

  it("loader failure / empty RI does not invent UI values (source contract)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const appText = readFileSync(join(here, "../../App.jsx"), "utf8");
    expect(appText).toMatch(/publishedEnvelopeDatasetForSearch/);
    expect(appText).toMatch(/setRealInterpolationResults\(\[\]\)/);
    expect(appText).toMatch(/setRiUiSelectedIndex\(null\)/);
  });
});
