/**
 * Published Dataset manifest types (Chunk not implemented — legacy positions.json only).
 */

import { DATASET_EXPORT_FILENAME } from "./datasetPath";

/** Future chunk reference (not loaded in Phase 2). */
export type DatasetChunkRef = {
  file: string;
  recordCount?: number;
};

/** Future manifest envelope — design only. */
export type PublishedDatasetManifest = {
  schemaVersion: number;
  shotType: string;
  systemId: string;
  systemLabel?: string;
  chunks?: DatasetChunkRef[];
  legacyPositionsFile?: string;
};

export type ManifestParseResult =
  | { kind: "manifest"; manifest: PublishedDatasetManifest }
  | { kind: "legacy" }
  | { kind: "invalid"; reason: string };

/** Detect manifest vs legacy single-file layout. Chunk loading is not implemented. */
export function parseManifest(raw: unknown): ManifestParseResult {
  if (raw == null || typeof raw !== "object") {
    return { kind: "invalid", reason: "not-an-object" };
  }
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.chunks) && obj.chunks.length > 0) {
    const manifest: PublishedDatasetManifest = {
      schemaVersion: Number(obj.schemaVersion) || 2,
      shotType: String(obj.shotType ?? "").trim(),
      systemId: String(obj.systemId ?? "").trim(),
      ...(obj.systemLabel ? { systemLabel: String(obj.systemLabel) } : {}),
      chunks: obj.chunks as DatasetChunkRef[],
      legacyPositionsFile: String(
        obj.legacyPositionsFile ?? DATASET_EXPORT_FILENAME
      ),
    };
    return { kind: "manifest", manifest };
  }
  if (Array.isArray(obj.records)) {
    return { kind: "legacy" };
  }
  return { kind: "invalid", reason: "unknown-envelope" };
}

/** Phase 2: always resolve to legacy positions.json leaf (manifest chunks not loaded). */
export function resolveLegacyPositionsFilename(
  _manifestResult: ManifestParseResult
): string {
  return DATASET_EXPORT_FILENAME;
}
