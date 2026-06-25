/**
 * Published dataset leaf key resolver — SSOT for shotType + systemId.
 * Used by ADMIN Recall and USER Search (published corpus).
 */

export type PublishedLeafResolveInput = {
  mode: "ADMIN" | "USER";
  shotType?: string | null;
  systemId?: string | null;
  system_id?: string | null;
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

export function resolvePublishedLeafKey(
  input: PublishedLeafResolveInput
): { shotType: string; systemId: string } {
  return {
    shotType: resolvePublishedShotType(input.shotType),
    systemId: resolvePublishedSystemId(input.systemId, input.system_id),
  };
}
