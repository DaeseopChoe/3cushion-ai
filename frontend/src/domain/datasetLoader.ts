/**
 * Published Dataset leaf loader — fetch positions.json → normalized authority.
 *
 * Phase E-1:
 *   v2 → in-memory convertFlatDatasetExportToNormalizedLeaf (no disk rewrite)
 *   v3 → parseNormalizedDatasetEnvelope
 *   AUTHORITY = NormalizedDatasetEnvelope (Masters + Members)
 *   PositionRecord[] = TEMPORARY COMPATIBILITY PROJECTION for Search / RI
 *     (derived via rematerializeFamilyPartsToPositionRecords; not durable SSOT)
 * Invalid v3 never falls back to flat (authority inversion forbidden).
 */

import type { DatasetExportPayload } from "./datasetExport";
import { normalizeDatasetExport } from "./datasetExport";
import { buildDatasetExportPathSegments } from "./datasetPath";
import {
  isNormalizedDataset,
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
} from "./dataset/normalizedDatasetEnvelope";
import type { FamilyMaster, FamilyMember } from "./family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "./family/rematerializeFamilyPartsToPositionRecords";
import { parseManifest } from "./datasetManifest";
import {
  convertFlatDatasetExportToNormalizedLeaf,
  detectPublishedLeafKind,
} from "./publishedLeafPrepare";
import type { PositionRecord } from "./positionSearchEngine";

export type PublishedLeafLoadOk = {
  kind: "ok";
  /** Canonical load authority (Phase E-1). */
  envelope: NormalizedDatasetEnvelope;
  /** Derived lookup — not a separate authority. */
  masterByFamilyId: Map<string, FamilyMaster>;
  familyMasters: FamilyMaster[];
  familyMembers: FamilyMember[];
  /**
   * TEMPORARY COMPATIBILITY PROJECTION for existing Published Search + RI.
   * Derived only from `envelope` via rematerializeFamilyPartsToPositionRecords.
   * Not Published durable/search authority (E-2 will search Members directly).
   */
  records: PositionRecord[];
  url: string;
  /** Disk/source schema before in-memory normalize (debug/tests only; not Search branch). */
  sourceSchemaVersion: 2 | 3;
};

export type PublishedLeafLoadResult =
  | PublishedLeafLoadOk
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

function buildMasterByFamilyId(
  masters: FamilyMaster[]
): Map<string, FamilyMaster> {
  return new Map(masters.map((m) => [m.familyId, m]));
}

/**
 * Eager whole-leaf rematerialize — TEMPORARY COMPATIBILITY PROJECTION owner.
 * Single rematerialization site for Published load (Search/RI until E-2/E-3).
 */
function projectCompatibilityRecords(
  envelope: NormalizedDatasetEnvelope,
  url: string
): PublishedLeafLoadResult {
  if (
    envelope.familyMasters.length === 0 &&
    envelope.familyMembers.length === 0
  ) {
    return { kind: "empty", url };
  }
  const remat = rematerializeFamilyPartsToPositionRecords({
    masters: envelope.familyMasters,
    members: envelope.familyMembers,
  });
  if (!remat.ok) {
    return {
      kind: "error",
      message: `Normalized leaf rematerialize failed (${
        remat.issues[0]?.code ?? "rematerialize"
      }: ${remat.issues[0]?.reason ?? "unknown"})`,
      url,
    };
  }
  if (!remat.dataset.length) {
    return { kind: "empty", url };
  }
  return {
    kind: "ok",
    envelope,
    masterByFamilyId: buildMasterByFamilyId(envelope.familyMasters),
    familyMasters: envelope.familyMasters,
    familyMembers: envelope.familyMembers,
    records: remat.dataset,
    url,
    sourceSchemaVersion: 3,
  };
}

function parseV3NormalizedLeaf(
  raw: unknown,
  url: string
): PublishedLeafLoadResult {
  const parsed = parseNormalizedDatasetEnvelope(raw);
  if (!parsed.ok) {
    return {
      kind: "error",
      message: `Invalid normalized published leaf (${
        parsed.issues[0]?.code ?? "validation"
      }: ${parsed.issues[0]?.reason ?? "unknown"})`,
      url,
    };
  }
  const projected = projectCompatibilityRecords(parsed.envelope, url);
  if (projected.kind === "ok") {
    return { ...projected, sourceSchemaVersion: 3 };
  }
  return projected;
}

function parseV2FlatLeaf(raw: unknown, url: string): PublishedLeafLoadResult {
  let flat: DatasetExportPayload;
  try {
    flat = normalizeDatasetExport(raw as DatasetExportPayload);
  } catch (e) {
    return {
      kind: "error",
      message: `Invalid published dataset envelope (${
        e instanceof Error ? e.message : String(e)
      })`,
      url,
    };
  }

  // Preserve empty-leaf UX: zero records → empty (not conversion error).
  if (!flat.records?.length) {
    return { kind: "empty", url };
  }

  const converted = convertFlatDatasetExportToNormalizedLeaf(flat);
  if (!converted.ok) {
    return {
      kind: "error",
      message: `Legacy v2 published leaf conversion failed (${converted.reason}: ${
        converted.issues[0] ?? "unknown"
      })`,
      url,
    };
  }

  const projected = projectCompatibilityRecords(converted.envelope, url);
  if (projected.kind === "ok") {
    return { ...projected, sourceSchemaVersion: 2 };
  }
  return projected;
}

/**
 * Parse published leaf JSON into normalized authority + compatibility records.
 * v2/v3 branching stays at this load boundary only.
 */
export function parsePublishedLeafPayload(
  raw: unknown,
  url: string
): PublishedLeafLoadResult {
  // Phase E-1 / D-2: normalized v3 first — never flat-fallback on invalid v3.
  if (isNormalizedDataset(raw)) {
    return parseV3NormalizedLeaf(raw, url);
  }

  const kind = detectPublishedLeafKind(raw);
  if (kind === "v3") {
    // schemaVersion 3 shape that failed isNormalizedDataset discriminator → still try parse
    return parseV3NormalizedLeaf(raw, url);
  }

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

  if (kind === "v2" || kind === "invalid") {
    // Flat / legacy records[] path — fail-closed via convertFlat when non-empty.
    // "invalid" with records[] still goes through normalize+convert (isFlatLegacyDataset).
    if (kind === "invalid") {
      // Non-object / non-flat: reject before convert.
      if (
        raw == null ||
        typeof raw !== "object" ||
        Array.isArray(raw) ||
        !Array.isArray((raw as Record<string, unknown>).records)
      ) {
        return {
          kind: "error",
          message: "Invalid published dataset envelope (unsupported-shape)",
          url,
        };
      }
    }
    return parseV2FlatLeaf(raw, url);
  }

  return {
    kind: "error",
    message: "Invalid published dataset envelope (absent-or-unknown)",
    url,
  };
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
