/**
 * Published Dataset lazy cache — keyed by shotType + systemId.
 *
 * Phase E-1:
 *   AUTHORITY = NormalizedDatasetEnvelope (familyMasters + familyMembers)
 *   masterByFamilyId = derived lookup (same Masters, not a second SSOT)
 *   records = TEMPORARY COMPATIBILITY PROJECTION for Published Search + RI
 *     (eager rematerialize at load; not durable; invalidate with envelope)
 */

import {
  fetchPublishedLeaf,
  type PublishedLeafLoadResult,
} from "./datasetLoader";
import type { NormalizedDatasetEnvelope } from "./dataset/normalizedDatasetEnvelope";
import type { FamilyMaster, FamilyMember } from "./family/familyNormalizedSchema";
import type { PositionRecord } from "./positionSearchEngine";

export type PublishedLeafKey = string;

export type PublishedLeafCacheEntry = {
  key: PublishedLeafKey;
  shotType: string;
  systemId: string;
  status: "ready" | "empty" | "error";
  url: string;
  errorMessage?: string;
  loadedAt: number;
  /**
   * Canonical Published leaf authority when status === "ready".
   * Absent on empty/error.
   */
  envelope?: NormalizedDatasetEnvelope;
  /** Derived from envelope.familyMasters — leaf-scoped. */
  masterByFamilyId?: Map<string, FamilyMaster>;
  familyMasters?: FamilyMaster[];
  familyMembers?: FamilyMember[];
  /**
   * TEMPORARY COMPATIBILITY PROJECTION (Search + Real Interpolation).
   * Derived from envelope only. Not authority.
   */
  records: PositionRecord[];
  /** Source on-disk schema before in-memory normalize (2|3). */
  sourceSchemaVersion?: 2 | 3;
};

const leafCache = new Map<PublishedLeafKey, PublishedLeafCacheEntry>();

export function buildPublishedLeafKey(
  shotType: string,
  systemId: string
): PublishedLeafKey {
  return `${String(shotType ?? "").trim()}::${String(systemId ?? "").trim()}`;
}

export function getPublishedLeafCacheEntry(
  shotType: string,
  systemId: string
): PublishedLeafCacheEntry | undefined {
  return leafCache.get(buildPublishedLeafKey(shotType, systemId));
}

/**
 * Invalidate published leaf cache.
 * Clears normalized authority + master lookup + compatibility records together.
 */
export function refreshPublishedDataset(
  shotType?: string,
  systemId?: string
): void {
  if (shotType != null && systemId != null) {
    leafCache.delete(buildPublishedLeafKey(shotType, systemId));
    return;
  }
  leafCache.clear();
}

function cacheFromLoadResult(
  key: PublishedLeafKey,
  shotType: string,
  systemId: string,
  result: PublishedLeafLoadResult
): PublishedLeafCacheEntry {
  const loadedAt = Date.now();
  if (result.kind === "ok") {
    return {
      key,
      shotType,
      systemId,
      status: "ready",
      url: result.url,
      loadedAt,
      envelope: result.envelope,
      masterByFamilyId: result.masterByFamilyId,
      familyMasters: result.familyMasters,
      familyMembers: result.familyMembers,
      records: result.records,
      sourceSchemaVersion: result.sourceSchemaVersion,
    };
  }
  if (result.kind === "empty") {
    return {
      key,
      shotType,
      systemId,
      status: "empty",
      records: [],
      url: result.url,
      loadedAt,
    };
  }
  return {
    key,
    shotType,
    systemId,
    status: "error",
    records: [],
    url: result.url,
    errorMessage: result.message,
    loadedAt,
  };
}

export type GetOrLoadPublishedLeafResult =
  | {
      kind: "ok";
      records: PositionRecord[];
      url: string;
      fromCache: boolean;
      envelope: NormalizedDatasetEnvelope;
      masterByFamilyId: Map<string, FamilyMaster>;
      familyMasters: FamilyMaster[];
      familyMembers: FamilyMember[];
      sourceSchemaVersion: 2 | 3;
    }
  | { kind: "empty"; url: string; fromCache: boolean }
  | { kind: "error"; message: string; url: string; fromCache: boolean };

/** Lazy load one published leaf; uses in-memory cache unless refreshed. */
export async function getOrLoadPublishedLeaf(
  shotType: string,
  systemId: string,
  options?: { force?: boolean; fetchFn?: typeof fetch }
): Promise<GetOrLoadPublishedLeafResult> {
  const key = buildPublishedLeafKey(shotType, systemId);
  if (!options?.force) {
    const cached = leafCache.get(key);
    if (cached) {
      if (cached.status === "ready" && cached.envelope && cached.masterByFamilyId) {
        return {
          kind: "ok",
          records: cached.records,
          url: cached.url,
          fromCache: true,
          envelope: cached.envelope,
          masterByFamilyId: cached.masterByFamilyId,
          familyMasters: cached.familyMasters ?? cached.envelope.familyMasters,
          familyMembers: cached.familyMembers ?? cached.envelope.familyMembers,
          sourceSchemaVersion: cached.sourceSchemaVersion ?? 3,
        };
      }
      if (cached.status === "empty") {
        return { kind: "empty", url: cached.url, fromCache: true };
      }
      if (cached.status === "error") {
        return {
          kind: "error",
          message: cached.errorMessage ?? "Unknown load error",
          url: cached.url,
          fromCache: true,
        };
      }
      // Corrupt cache entry (ready without envelope) — treat as miss.
    }
  }

  const result = await fetchPublishedLeaf(
    shotType,
    systemId,
    options?.fetchFn ?? fetch
  );
  leafCache.set(key, cacheFromLoadResult(key, shotType, systemId, result));

  if (result.kind === "ok") {
    return {
      kind: "ok",
      records: result.records,
      url: result.url,
      fromCache: false,
      envelope: result.envelope,
      masterByFamilyId: result.masterByFamilyId,
      familyMasters: result.familyMasters,
      familyMembers: result.familyMembers,
      sourceSchemaVersion: result.sourceSchemaVersion,
    };
  }
  if (result.kind === "empty") {
    return { kind: "empty", url: result.url, fromCache: false };
  }
  return {
    kind: "error",
    message: result.message,
    url: result.url,
    fromCache: false,
  };
}

/** Test-only */
export function __clearPublishedDatasetStoreForTests(): void {
  leafCache.clear();
}
