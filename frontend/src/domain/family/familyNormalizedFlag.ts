/**
 * Phase 3A-321 Phase A — normalized Family storage feature flag.
 *
 * Default OFF: SAVE / Derived Approval / Search / History keep using
 * positions_dataset + WorkspaceSnapshot only.
 * Store APIs and hydrate/split are available for unit tests and later dual-write.
 */

/** Compile-time Phase A readiness gate (dual-write not activated). */
export const FAMILY_NORMALIZED_STORAGE_ENABLED = false;

export function isFamilyNormalizedStorageEnabled(): boolean {
  return FAMILY_NORMALIZED_STORAGE_ENABLED === true;
}
