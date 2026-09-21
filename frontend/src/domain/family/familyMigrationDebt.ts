/**
 * FAMILY MASTER MIGRATION DEBT
 *
 * Phase 2 / Phase 3A compatibility persistence duplicates Family-common payload
 * across StrategyEntry Members, including 4-track base members and
 * Cue→Impact Derived members until production WRITE uses Family Master as SSOT.
 *
 * Ownership SSOT (2026-09-20): conceptual owner of signature/sysInputs/corrections/
 * ai/str/canonical hpT is FamilyMaster. Flat StrategyEntry copies are
 * TEMPORARY_COMPATIBILITY_DUPLICATION only — not Member strategy authority.
 *
 * Phase 3A-321 Phase A added physical FamilyMaster / FamilyMember schemas +
 * stores (`family_masters` / `family_members`) and hydrate/split adapters.
 * Dual-write runs after positions persist. Gated normalized READ may rematerialize
 * (flag default ON). Production WRITE SSOT remains positions_dataset.
 *
 * Phase A (2026-09-21): Canonical NormalizedDatasetEnvelope (schemaVersion 3) +
 * validator exist as contract only — LIVE Export/Publish still flat records[].
 * TEMPORARY_COMPATIBILITY_DUPLICATION ends only after later WRITE cutover.
 *
 * This duplication is TEMPORARY — FINAL FAMILY MASTER MIGRATION TARGET.
 *
 * Final Family DB migration MUST:
 * - move common payload to Family Master
 * - remove duplicate Member copies from flat WRITE
 * - terminate compatibility duplication write
 * - resolve runtime data from Master + Member (hydrate rebuilds meta)
 * - preserve legacy migration compatibility
 * - remove obsolete compatibility code after validation
 *
 * Do not treat copied sysInputs / corrections / ai / str / canonical hpT
 * on SYMMETRY / Derived / Product Members as the final SSOT.
 */
export const FAMILY_MASTER_MIGRATION_DEBT =
  "TEMPORARY — FINAL FAMILY MASTER MIGRATION TARGET";

export const TEMPORARY_COMPATIBILITY_DUPLICATION =
  "TEMPORARY_COMPATIBILITY_DUPLICATION";
