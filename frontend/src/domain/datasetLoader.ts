/**
 * Published Dataset leaf loader — fetch positions.json, normalize, return records.
 */

import type { DatasetExportPayload } from "./datasetExport";
import { normalizeDatasetExport } from "./datasetExport";
import { buildDatasetExportPathSegments } from "./datasetPath";
import { parseManifest } from "./datasetManifest";
import type { PositionRecord } from "./positionSearchEngine";

export type PublishedLeafLoadResult =
  | { kind: "ok"; records: PositionRecord[]; url: string }
  | { kind: "empty"; url: string }
  | { kind: "error"; message: string; url: string };

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment);
}

/** Public URL for a published leaf: /dataset/{shotType}/{systemLabel}/positions.json */
export function buildPublishedLeafUrl(shotType: string, systemId: string): string {
  const segments = buildDatasetExportPathSegments(shotType, systemId);
  return `/${segments.datasetRoot}/${encodePathSegment(segments.shotTypeDir)}/${encodePathSegment(segments.systemDir)}/${segments.fileName}`;
}

export function parsePublishedLeafPayload(
  raw: unknown,
  url: string
): PublishedLeafLoadResult {
  const manifestResult = parseManifest(raw);
  if (manifestResult.kind === "invalid") {
    return {
      kind: "error",
      message: `Invalid published dataset envelope (${manifestResult.reason})`,
      url,
    };
  }
  if (manifestResult.kind === "manifest") {
    return {
      kind: "error",
      message: "Chunk manifest is not supported yet; use positions.json",
      url,
    };
  }

  const payload = normalizeDatasetExport(raw as DatasetExportPayload);
  if (!payload.records?.length) {
    return { kind: "empty", url };
  }
  return { kind: "ok", records: payload.records, url };
}

/** Fetch one published leaf (lazy). 404 → empty; parse failure → error. */
export async function fetchPublishedLeaf(
  shotType: string,
  systemId: string,
  fetchFn: typeof fetch = fetch
): Promise<PublishedLeafLoadResult> {
  const url = buildPublishedLeafUrl(shotType, systemId);
  let response: Response;
  try {
    response = await fetchFn(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: "error", message: `Network error: ${message}`, url };
  }

  if (response.status === 404) {
    return { kind: "empty", url };
  }

  if (!response.ok) {
    return {
      kind: "error",
      message: `HTTP ${response.status}`,
      url,
    };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return { kind: "error", message: "JSON parse failed", url };
  }

  return parsePublishedLeafPayload(raw, url);
}
