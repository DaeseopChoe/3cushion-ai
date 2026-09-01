/**
 * Step 3 — RI Strategy Slot hydrate integration (thin adapter + App wiring audit).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { StrategyEntry } from "../positionSearchEngine";
import type { RealInterpolationStrategyResult } from "./types";
import {
  positionIdFromStrategyRef,
  projectRealInterpolationResultToStrategyEntry,
  resolveRealInterpolationActivationSlotId,
  slotIdFromStrategyRef,
} from "./strategySlotHydrate";

function makeEntry(
  slot: "S1" | "S2" | "S3",
  asid: string,
  sys: Record<string, number>,
  extras?: Partial<StrategyEntry>
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
    hpT: { note: "hpt-modal" },
    str: { note: "str-modal" },
    meta: {
      impact: { x: 20, y: 18 },
      final: { x: 70, y: 40 },
      angle_ci: 1,
      angle_fs: -2,
    },
    ...extras,
  };
}

function makeResult(
  overrides: Partial<RealInterpolationStrategyResult> & {
    authoringStrategyId?: string;
    matchType?: RealInterpolationStrategyResult["matchType"];
  } = {}
): RealInterpolationStrategyResult {
  const asid = overrides.authoringStrategyId ?? "as_family_a";
  const primary =
    overrides.primaryEntry ??
    makeEntry("S1", asid, { CO_f: 20, Sn: 1 });
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
    primaryEntry: primary,
    diagnostics: overrides.diagnostics,
    interpolationLambda: overrides.interpolationLambda,
  };
}

describe("RI → Strategy Slot projection", () => {
  it("exact → activateStrategySlot-compatible entry (engine sysInputs consumed)", () => {
    const result = makeResult({
      matchType: "exact",
      sysInputs: { CO_f: 25 },
    });
    const proj = projectRealInterpolationResultToStrategyEntry(result, "S1");
    expect(proj.ok).toBe(true);
    if (!proj.ok) return;
    expect(proj.matchType).toBe("exact");
    expect(proj.slotId).toBe("S1");
    expect(proj.entry.sysInputs).toEqual({ CO_f: 25 });
    expect(proj.entry.authoringStrategyId).toBe("as_family_a");
    expect(proj.entry.ai).toEqual({ text: "lesson-modal" });
  });

  it("interpolated → consumes blended sysInputs; no Modal blend", () => {
    const primary = makeEntry("S2", "as_family_a", { CO_f: 10 }, {
      ai: { text: "keep-me" },
    });
    const result = makeResult({
      matchType: "interpolated",
      strategyRef: "pB.S2",
      sysInputs: { CO_f: 35, Sn: 3 },
      primaryEntry: primary,
      interpolationLambda: 0.5,
    });
    const proj = projectRealInterpolationResultToStrategyEntry(result, "S2");
    expect(proj.ok).toBe(true);
    if (!proj.ok) return;
    expect(proj.entry.sysInputs).toEqual({ CO_f: 35, Sn: 3 });
    expect(proj.entry.sysInputs).not.toEqual(primary.sysInputs);
    expect(proj.entry.ai).toEqual({ text: "keep-me" });
    expect(proj.entry.hpT).toEqual(primary.hpT);
    expect(proj.entry.str).toEqual(primary.str);
  });

  it("nearest → consumes engine nearest sysInputs", () => {
    const result = makeResult({
      matchType: "nearest",
      sysInputs: { CO_f: 11 },
      strategyRef: "pC.S3",
      primaryEntry: makeEntry("S3", "as_family_a", { CO_f: 11 }),
    });
    const proj = projectRealInterpolationResultToStrategyEntry(result);
    expect(proj.ok).toBe(true);
    if (!proj.ok) return;
    expect(proj.matchType).toBe("nearest");
    expect(proj.slotId).toBe("S3");
    expect(proj.entry.sysInputs.CO_f).toBe(11);
  });

  it("authoringStrategyId preserved across matchTypes", () => {
    for (const matchType of ["exact", "interpolated", "nearest"] as const) {
      const proj = projectRealInterpolationResultToStrategyEntry(
        makeResult({ matchType, authoringStrategyId: "as_keep" }),
        "S1"
      );
      expect(proj.ok).toBe(true);
      if (!proj.ok) return;
      expect(proj.authoringStrategyId).toBe("as_keep");
      expect(proj.entry.authoringStrategyId).toBe("as_keep");
    }
  });

  it("different authoringStrategyId cannot cross-hydrate", () => {
    const result = makeResult({
      authoringStrategyId: "as_family_a",
      primaryEntry: makeEntry("S1", "as_family_b", { CO_f: 1 }),
    });
    const proj = projectRealInterpolationResultToStrategyEntry(result, "S1");
    expect(proj).toEqual({
      ok: false,
      reason: "cross_family_authoringStrategyId",
    });
  });

  it("strategyRef is not treated as authoringStrategyId", () => {
    const result = makeResult({
      authoringStrategyId: "pA.S1",
      strategyRef: "pA.S1",
    });
    const proj = projectRealInterpolationResultToStrategyEntry(result, "S1");
    expect(proj.ok).toBe(false);
    if (proj.ok) return;
    expect(proj.reason).toBe("authoringStrategyId_eq_strategyRef");
  });

  it("malformed / missing identity → fail-closed", () => {
    expect(
      projectRealInterpolationResultToStrategyEntry(null)
    ).toMatchObject({ ok: false, reason: "missing_result" });

    expect(
      projectRealInterpolationResultToStrategyEntry(
        makeResult({ authoringStrategyId: "   " }),
        "S1"
      )
    ).toMatchObject({ ok: false, reason: "missing_authoringStrategyId" });

    const noEntry = makeResult();
    // @ts-expect-error intentional malformed
    noEntry.primaryEntry = null;
    expect(
      projectRealInterpolationResultToStrategyEntry(noEntry, "S1")
    ).toMatchObject({ ok: false, reason: "missing_primaryEntry" });

    const badSys = makeResult();
    // @ts-expect-error intentional malformed
    badSys.sysInputs = null;
    expect(
      projectRealInterpolationResultToStrategyEntry(badSys, "S1")
    ).toMatchObject({ ok: false, reason: "malformed_sysInputs" });
  });

  it("deterministic same-input projection", () => {
    const result = makeResult({
      matchType: "interpolated",
      sysInputs: { CO_f: 40 },
    });
    const a = projectRealInterpolationResultToStrategyEntry(result, "S1");
    const b = projectRealInterpolationResultToStrategyEntry(result, "S1");
    expect(a).toEqual(b);
  });

  it("slotHint prefers TOP3 display slot over strategyRef slot", () => {
    const result = makeResult({ strategyRef: "pA.S2" });
    expect(resolveRealInterpolationActivationSlotId(result, "S3")).toBe("S3");
    expect(slotIdFromStrategyRef("pA.S2")).toBe("S2");
    expect(positionIdFromStrategyRef("pA.S2")).toBe("pA");
  });
});

describe("no re-interpolation ownership in adapter", () => {
  it("adapter source does not import SYS/Modal interpolate or buildTrajectory", async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const text = readFileSync(join(here, "strategySlotHydrate.ts"), "utf8");
    expect(text).not.toMatch(/sysInterpolate/);
    expect(text).not.toMatch(/interpolateSys/);
    expect(text).not.toMatch(/buildTrajectory/);
    expect(text).not.toMatch(/evaluateStrategy/);
    expect(text).not.toMatch(/__ENVELOPE_PUBLISHED_DATASET__/);
  });
});

describe("App RI → activateStrategySlot wiring audit", () => {
  it("App.jsx wires projection into loadDraft + activateStrategySlot", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const text = readFileSync(join(here, "../../App.jsx"), "utf8");

    expect(text).toMatch(/projectRealInterpolationResultToStrategyEntry/);
    expect(text).toMatch(/activateRealInterpolationCandidate/);
    expect(text).toMatch(/activateStrategySlot/);
    expect(text).toMatch(/loadDraftFromStrategyEntry/);
    expect(text).toMatch(/__REAL_INTERPOLATION_ACTIVATE__/);

    // USER Search activation path preserved
    expect(text).toMatch(/applyUserSearchRecall/);
    expect(text).toMatch(
      /const slotId = resolveCanonicalUserSearchDisplaySlotId\(\s*matchedRecord/
    );

    // Step 4: App injects existing buildTrajectory DI into RI search flow
    const callIdx = text.indexOf("const { results } = runRealInterpolationSearchFlow({");
    expect(callIdx).toBeGreaterThan(-1);
    const riBlock = text.slice(callIdx, callIdx + 900);
    expect(riBlock).toMatch(/buildTrajectory/);
    expect(riBlock).toMatch(/buildTrajectoryInput/);
    expect(riBlock).toMatch(/buildRealInterpolationTrajectoryBuildInput/);

    const activateBlockStart = text.indexOf(
      "function activateRealInterpolationCandidate"
    );
    expect(activateBlockStart).toBeGreaterThan(-1);
    const activateBlock = text.slice(
      activateBlockStart,
      activateBlockStart + 1500
    );
    // Activate still uses slot contract only (no direct Builder call)
    expect(activateBlock).not.toMatch(/buildTrajectory\(/);
    expect(activateBlock).not.toMatch(/sysInterpolate/);
    expect(activateBlock).toMatch(/activateStrategySlot\(/);

    // No production Envelope window reintroduced
    expect(text).not.toMatch(/__ENVELOPE_PUBLISHED_DATASET__/);
  });

  it("USER Search activation call sites remain independent of RI activate", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const text = readFileSync(join(here, "../../App.jsx"), "utf8");
    // Shared contract still exists
    expect(text).toMatch(
      /function activateStrategySlot\(slotId\) \{[\s\S]*?hydrateSlotRuntime\(slotId\);/
    );
    // RI unavailable path clears RI only
    expect(text).toMatch(/publishedEnvelopeDatasetForSearch/);
    expect(text).toMatch(/setRealInterpolationResults\(\[\]\)/);
  });
});
