/**
 * FAMILY MASTER MIGRATION DEBT
 *
 * Phase B-1 (2026-09-21): Local WRITE SSOT = NormalizedDatasetEnvelope
 * (`normalized_dataset` single key). FamilyMaster + FamilyMember are authoritative.
 *
 * Remaining TEMPORARY_COMPATIBILITY_DUPLICATION:
 * - Flat positions_dataset = compatibility projection/cache for Search/Export/UI
 *   until Phase C/D (NOT WRITE authority).
 * - family_masters / family_members = optional best-effort shadow (NOT authority).
 * - Hydrated StrategyEntry still carries Master common payload copies for
 *   flat-compatible consumers.
 *
 * Ends fully when:
 * - Phase C Member-centric READ/Search
 * - Phase D Export/Publish leaf schema v3
 * - flat projection / two-key shadow removed
 *
 * Do not treat copied sysInputs / corrections / ai / str / canonical hpT
 * on SYMMETRY / Derived / Product Members as the final SSOT.
 */
export const FAMILY_MASTER_MIGRATION_DEBT =
  "TEMPORARY — FINAL FAMILY MASTER MIGRATION TARGET";

export const TEMPORARY_COMPATIBILITY_DUPLICATION =
  "TEMPORARY_COMPATIBILITY_DUPLICATION";
