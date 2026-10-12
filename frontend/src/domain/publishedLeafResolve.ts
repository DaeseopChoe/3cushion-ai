/**
 * Published dataset leaf key resolver — SSOT for shotType + systemId.
 * Used by ADMIN Recall and USER Search (published corpus).
 */

import shotTypesData from "../data/meta/admin/shot_types.json";
import { listRegisteredSystemIds } from "../runtime/registry/systemRegistry";
import { listSystemNameKoIds } from "../utils/aiPlayStrategyBuilder";
import { buildDatasetExportPathSegments, systemIdToFolderLabel } from "./datasetPath";

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

export type PublishedLeafHint = {
  shotType?: string | null;
  systemId?: string | null;
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
 * Every systemId a Published leaf can be written for: runtime system packages
 * plus the SYS overlay ids. Default system first, the rest sorted (fixed order).
 */
export function listCanonicalPublishedSystemIds(): string[] {
  const ids = new Set<string>([...listRegisteredSystemIds(), ...listSystemNameKoIds()]);
  ids.delete(DEFAULT_SYSTEM_ID);
  return [DEFAULT_SYSTEM_ID, ...[...ids].sort()];
}

function leafFolderKey(shotType: string, systemId: string): string {
  const s = buildDatasetExportPathSegments(shotType, systemId);
  return `${s.shotTypeDir}/${s.systemDir}`;
}

function trimmedOrNull(raw: unknown): string | null {
  const t = String(raw ?? "").trim();
  return t ? t : null;
}

/**
 * All Published leaves (canonical shot types × canonical systems), one per folder.
 * Order is the tie-break priority: leaves matching the hint first, then the fixed
 * canonical order (default system first). The hint only reorders — it never drops a leaf.
 */
export function resolveAllPublishedLeafCandidates(
  hint?: PublishedLeafHint | null
): CandidateLeaf[] {
  const hintShot = trimmedOrNull(hint?.shotType);
  const hintSystem = trimmedOrNull(hint?.systemId);

  const leaves: CandidateLeaf[] = [];
  const seen = new Set<string>();
  const add = (shotType: string, systemId: string) => {
    const key = leafFolderKey(shotType, systemId);
    if (seen.has(key)) return;
    seen.add(key);
    leaves.push({ shotType, systemId });
  };

  if (hintShot) add(hintShot, hintSystem ?? DEFAULT_SYSTEM_ID);
  const shotTypes = listCanonicalShotTypes();
  for (const systemId of listCanonicalPublishedSystemIds()) {
    for (const shotType of shotTypes) add(shotType, systemId);
  }
  if (hintSystem) {
    for (const shotType of shotTypes) add(shotType, hintSystem);
  }

  if (!hintShot && !hintSystem) return leaves;
  const hintShotDir = hintShot ? leafFolderKey(hintShot, DEFAULT_SYSTEM_ID).split("/")[0] : null;
  const hintSystemDir = hintSystem ? systemIdToFolderLabel(hintSystem) : null;
  const mismatch = (leaf: CandidateLeaf) => {
    const [shotDir, systemDir] = leafFolderKey(leaf.shotType, leaf.systemId).split("/");
    return (
      (hintShotDir && shotDir !== hintShotDir ? 1 : 0) +
      (hintSystemDir && systemDir !== hintSystemDir ? 1 : 0)
    );
  };
  return leaves
    .map((leaf, index) => ({ leaf, index, rank: mismatch(leaf) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.leaf);
}

/** "옆돌리기 · 파이브앤하프" — shot type and Published system folder of a leaf. */
export function formatPublishedLeafSource(leaf: CandidateLeaf): string {
  return `${leaf.shotType} · ${systemIdToFolderLabel(leaf.systemId)}`;
}

/**
 * Resolves candidate published dataset leaves to search.
 * ADMIN: every Published leaf; shotType/systemId only set the priority order.
 * USER with an explicit shotType: that single leaf.
 * USER without a shotType: canonical active shotTypes for the systemId.
 */
export function resolveCandidatePublishedLeaves(
  input: PublishedLeafResolveInput
): CandidateLeaf[] {
  if (input.mode === "ADMIN") {
    return resolveAllPublishedLeafCandidates({
      shotType: input.shotType,
      systemId: input.systemId ?? input.system_id,
    });
  }

  const systemId = resolvePublishedSystemId(input.systemId, input.system_id);
  const explicitShot = input.shotType ? String(input.shotType).trim() : null;

  if (explicitShot) {
    return [{ shotType: explicitShot, systemId }];
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
