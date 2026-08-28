/**
 * Published dataset leaf key resolver — SSOT for shotType + systemId.
 * Used by ADMIN Recall and USER Search (published corpus).
 */

import shotTypesData from "../data/meta/admin/shot_types.json";

export type PublishedLeafResolveInput = {
  mode: "ADMIN" | "USER";
  shotType?: string | null;
  systemId?: string | null;
  system_id?: string | null;
};

export type CandidateLeaf = {
  shotType: string;
  systemId: string;
};

const DEFAULT_SHOT_TYPE = "뒤돌리기";
const DEFAULT_SYSTEM_ID = "5_half_system";

/** Trim; empty / whitespace / null / undefined → default shot type. */
export function resolvePublishedShotType(raw?: string | null): string {
  const trimmed = String(raw ?? "").trim();
  return trimmed || DEFAULT_SHOT_TYPE;
}

/** Prefer systemId, then legacy system_id; fallback to default. */
export function resolvePublishedSystemId(
  systemId?: string | null,
  system_id?: string | null
): string {
  const id = String(systemId ?? system_id ?? "").trim();
  return id || DEFAULT_SYSTEM_ID;
}

/**
 * Returns canonical active shot types from shot_types metadata SSOT.
 */
export function listCanonicalShotTypes(): string[] {
  const items = shotTypesData?.shot_types;
  if (!Array.isArray(items)) return ["뒤돌리기", "옆돌리기"];
  return items
    .filter(
      (it) => it.active !== false && typeof it.label === "string" && it.label.trim()
    )
    .map((it) => it.label.trim());
}

/**
 * Resolves candidate published dataset leaves to search.
 * When shotType is explicitly provided, returns a single leaf.
 * When in USER mode without an explicit shotType, returns candidate leaves
 * generated from canonical active shotTypes for the systemId.
 */
export function resolveCandidatePublishedLeaves(
  input: PublishedLeafResolveInput
): CandidateLeaf[] {
  const systemId = resolvePublishedSystemId(input.systemId, input.system_id);
  const explicitShot = input.shotType ? String(input.shotType).trim() : null;

  if (explicitShot) {
    return [{ shotType: explicitShot, systemId }];
  }

  if (input.mode === "ADMIN") {
    return [{ shotType: resolvePublishedShotType(input.shotType), systemId }];
  }

  // USER mode with missing shotType: generate candidate leaves from canonical active shot types
  const canonicalShotTypes = listCanonicalShotTypes();
  return canonicalShotTypes.map((shotType) => ({
    shotType,
    systemId,
  }));
}

export function resolvePublishedLeafKey(
  input: PublishedLeafResolveInput
): { shotType: string; systemId: string } {
  return {
    shotType: resolvePublishedShotType(input.shotType),
    systemId: resolvePublishedSystemId(input.systemId, input.system_id),
  };
}
