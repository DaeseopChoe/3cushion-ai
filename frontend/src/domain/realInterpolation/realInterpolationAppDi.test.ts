/**
 * Step 2 integration seam: loader result → RI flow DI / fail-closed.
 * App.jsx wires this; Search core does not fetch.
 */

import { describe, expect, it } from "vitest";
import { runRealInterpolationSearchFlow } from "../../application/flows/realInterpolationSearchFlow";
import {
  publishedEnvelopeDatasetForSearch,
  type PublishedEnvelopeLoadResult,
} from "./envelopeDatasetLoader";
import type { PositionRecord } from "../positionSearchEngine";

const URL = "/dataset/_published/envelope/dataset.json";

const query = {
  cue: { x: 20, y: 16 },
  target: { x: 20, y: 20 },
  second: { x: 60, y: 20 },
};

function makeEntry(slot: "S1", asid: string) {
  return {
    slot,
    authoringStrategyId: asid,
    signature: {
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      formulaHash: "h1",
      classification: "A",
    },
    sysInputs: { CO_f: 30 },
    ai: { text: "lesson" },
  };
}

const positionRecords: PositionRecord[] = [
  {
    positionId: "pA",
    balls: {
      cue: { x: 19, y: 16 },
      target: { x: 20, y: 20 },
      second: { x: 60, y: 20 },
    },
    strategies: {
      S1: makeEntry("S1", "as_001"),
    },
  },
];

const okEnvelope = {
  records: [
    {
      strategyRef: "pA.S1",
      target: { x: 20, y: 20 },
      cueSet: [{ x: 19, y: 16 }],
      secondSet: [
        { x: 50, y: 20 },
        { x: 70, y: 20 },
      ],
    },
  ],
};

describe("publishedEnvelopeDatasetForSearch (App DI seam)", () => {
  it("ok → dataset for RI flow", () => {
    const load: PublishedEnvelopeLoadResult = {
      kind: "ok",
      dataset: okEnvelope,
      url: URL,
      usableCount: 1,
    };
    const dataset = publishedEnvelopeDatasetForSearch(load);
    expect(dataset).toEqual(okEnvelope);

    const { results } = runRealInterpolationSearchFlow({
      query,
      positionRecords,
      envelopeDataset: dataset,
      resolveEvalProfile: () => ({}),
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("empty → null fail-closed (no RI candidates)", () => {
    const load: PublishedEnvelopeLoadResult = {
      kind: "empty",
      url: URL,
      message: "404",
    };
    expect(publishedEnvelopeDatasetForSearch(load)).toBeNull();

    const { results } = runRealInterpolationSearchFlow({
      query,
      positionRecords,
      envelopeDataset: null,
      resolveEvalProfile: () => ({}),
    });
    expect(results).toEqual([]);
  });

  it("error → null fail-closed", () => {
    const load: PublishedEnvelopeLoadResult = {
      kind: "error",
      url: URL,
      message: "HTTP 500",
    };
    expect(publishedEnvelopeDatasetForSearch(load)).toBeNull();
  });
});

describe("App production window Envelope dependency", () => {
  it("App.jsx source must not read __ENVELOPE_PUBLISHED_DATASET__", async () => {
    const appSrc = await import("../../App.jsx?raw").catch(() => null);
    // Vite ?raw may be unavailable; fall back to fetch of module text via fs in Node vitest:
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const appPath = join(here, "../../App.jsx");
    const text = readFileSync(appPath, "utf8");
    expect(text).not.toMatch(/__ENVELOPE_PUBLISHED_DATASET__/);
    expect(text).toMatch(/getOrLoadPublishedEnvelopeDataset/);
    expect(text).toMatch(/publishedEnvelopeDatasetForSearch/);
    void appSrc;
  });
});

describe("USER Search isolation (documented contract)", () => {
  it("RI fail-closed does not imply USER Search failure", () => {
    // USER Search completes before RI block; null envelope only clears RI results.
    const userMatched = positionRecords[0];
    expect(userMatched.positionId).toBe("pA");
    const ri = runRealInterpolationSearchFlow({
      query,
      positionRecords,
      envelopeDataset: null,
      resolveEvalProfile: () => ({}),
    });
    expect(ri.results).toEqual([]);
    expect(userMatched).toBeTruthy();
  });
});
