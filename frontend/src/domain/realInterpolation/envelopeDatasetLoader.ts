/**
 * Read-only loader for Product-published Envelope PublishedDataset.
 *
 * Contract URL: /dataset/_published/envelope/dataset.json
 * Does not mix with PositionRecord leaf loader (datasetLoader.ts).
 * Does not mutate, regenerate, or infer Envelope geometry.
 */

import { buildPublishedEnvelopeDatasetUrl } from "../datasetPath";
import {
  buildEnvelopeIndex,
  type RawPublishedEnvelopeDataset,
} from "./envelopeJoin";

export type PublishedEnvelopeLoadResult =
  | {
      kind: "ok";
      dataset: RawPublishedEnvelopeDataset;
      url: string;
      usableCount: number;
    }
  | { kind: "empty"; url: string; message?: string }
  | { kind: "error"; url: string; message: string };

type CacheEntry =
  | { status: "ready"; result: Extract<PublishedEnvelopeLoadResult, { kind: "ok" }> }
  | { status: "empty"; result: Extract<PublishedEnvelopeLoadResult, { kind: "empty" }> };

let cache: CacheEntry | null = null;
let inflight: Promise<PublishedEnvelopeLoadResult> | null = null;

export function parsePublishedEnvelopePayload(
  raw: unknown,
  url: string
): PublishedEnvelopeLoadResult {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      kind: "error",
      url,
      message: "Envelope dataset root must be an object",
    };
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.records)) {
    return {
      kind: "error",
      url,
      message: "Envelope dataset.records must be an array",
    };
  }

  const dataset: RawPublishedEnvelopeDataset = {
    records: obj.records as RawPublishedEnvelopeDataset["records"],
  };
  const usableCount = buildEnvelopeIndex(dataset).size;
  if (usableCount === 0) {
    return {
      kind: "empty",
      url,
      message: "No usable Envelope geometry after projection",
    };
  }
  return { kind: "ok", dataset, url, usableCount };
}

/** Map loader result → dataset for RI, or null (fail-closed). */
export function publishedEnvelopeDatasetForSearch(
  result: PublishedEnvelopeLoadResult
): RawPublishedEnvelopeDataset | null {
  return result.kind === "ok" ? result.dataset : null;
}

/**
 * Single fetch/parse/validation attempt (no cache write on error).
 */
export async function fetchPublishedEnvelopeDataset(
  fetchFn: typeof fetch = fetch
): Promise<PublishedEnvelopeLoadResult> {
  const url = buildPublishedEnvelopeDatasetUrl();
  let response: Response;
  try {
    response = await fetchFn(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: "error", url, message: `Network error: ${message}` };
  }

  if (response.status === 404) {
    return { kind: "empty", url, message: "Envelope dataset not found (404)" };
  }
  if (!response.ok) {
    return { kind: "error", url, message: `HTTP ${response.status}` };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return { kind: "error", url, message: "JSON parse failed" };
  }

  return parsePublishedEnvelopePayload(raw, url);
}

/**
 * Module-level cached load. Errors are not cached (retry allowed).
 * Concurrent callers share one in-flight Promise.
 */
export async function getOrLoadPublishedEnvelopeDataset(
  options?: { force?: boolean; fetchFn?: typeof fetch }
): Promise<PublishedEnvelopeLoadResult> {
  if (!options?.force && cache) {
    return cache.result;
  }

  if (!options?.force && inflight) {
    return inflight;
  }

  const fetchFn = options?.fetchFn ?? fetch;
  inflight = (async () => {
    const result = await fetchPublishedEnvelopeDataset(fetchFn);
    if (result.kind === "ok") {
      cache = { status: "ready", result };
    } else if (result.kind === "empty") {
      // 404 / zero usable — cache empty to avoid hammering; force=true retries.
      cache = { status: "empty", result };
    }
    // error: leave cache unchanged / unset so retry works after transient failure
    return result;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Test-only */
export function __clearPublishedEnvelopeDatasetCacheForTests(): void {
  cache = null;
  inflight = null;
}
