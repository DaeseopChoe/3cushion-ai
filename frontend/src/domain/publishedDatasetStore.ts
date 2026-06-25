/**
 * Published Dataset lazy cache — keyed by shotType + systemId.
 */

import {
  fetchPublishedLeaf,
  type PublishedLeafLoadResult,
} from "./datasetLoader";
import type { PositionRecord } from "./positionSearchEngine";

export type PublishedLeafKey = string;

export type PublishedLeafCacheEntry = {
  key: PublishedLeafKey;
  shotType: string;
  systemId: string;
  status: "ready" | "empty" | "error";
  records: PositionRecord[];
  url: string;
  errorMessage?: string;
  loadedAt: number;
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
      records: result.records,
      url: result.url,
      loadedAt,
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
  | { kind: "ok"; records: PositionRecord[]; url: string; fromCache: boolean }
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
      if (cached.status === "ready") {
        return {
          kind: "ok",
          records: cached.records,
          url: cached.url,
          fromCache: true,
        };
      }
      if (cached.status === "empty") {
        return { kind: "empty", url: cached.url, fromCache: true };
      }
      return {
        kind: "error",
        message: cached.errorMessage ?? "Unknown load error",
        url: cached.url,
        fromCache: true,
      };
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
