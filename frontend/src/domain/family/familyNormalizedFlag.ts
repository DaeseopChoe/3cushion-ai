/**
 * Phase 3A-321 Phase A — normalized Family storage feature flag.
 *
 * Phase 3A-349: production default ON for gated normalized READ.
 * Phase 3A-326+: SAVE / Approval / Import perform normalized shadow sync
 * regardless of this flag (dual-write is NOT gated by the flag).
 * Phase 3A-342+: flag gates optional normalized production READ projection only
 *   (flag ∧ freshness ∧ rematerialize OK → else legacy positions_dataset).
 * Flag OFF remains instant READ rollback to legacy (no migration required).
 */

/** Compile-time default for normalized production READ (not dual-write). */
export const FAMILY_NORMALIZED_STORAGE_ENABLED = true;

/** Test-only override. null = use compile-time default. Never set in production. */
let testForceEnabled: boolean | null = null;

export function forceFamilyNormalizedStorageEnabledForTests(
  enabled: boolean | null
): void {
  testForceEnabled = enabled;
}

export function clearFamilyNormalizedStorageEnabledForTests(): void {
  testForceEnabled = null;
}

export function isFamilyNormalizedStorageEnabled(): boolean {
  if (testForceEnabled != null) return testForceEnabled === true;
  return FAMILY_NORMALIZED_STORAGE_ENABLED === true;
}
