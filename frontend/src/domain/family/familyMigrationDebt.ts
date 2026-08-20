/**
 * FAMILY MASTER MIGRATION DEBT
 *
 * Phase 2 / Phase 3A compatibility persistence duplicates Family-common payload
 * across StrategyEntry Members, including 4-track base members and
 * Cue→Impact Derived members until a real Family Master exists.
 *
 * Phase 3A-321 Phase A added physical FamilyMaster / FamilyMember schemas +
 * stores (`family_masters` / `family_members`) and hydrate/split adapters.
 * Feature flag remains OFF — SAVE / Approval / Search still write
 * positions_dataset with TEMPORARY_COMPATIBILITY_DUPLICATION on StrategyEntry.
 *
 * This duplication is TEMPORARY — FINAL FAMILY MASTER MIGRATION TARGET.
 *
 * Final Family DB migration MUST:
 * - move common payload to Family Master
 * - remove duplicate Member copies
 * - terminate compatibility duplication write
 * - resolve runtime data from Master + Member
 * - preserve legacy migration compatibility
 * - remove obsolete compatibility code after validation
 *
 * Do not treat copied sysInputs / corrections / ai / str / canonical hpT
 * on SYMMETRY / future Derived Members as the final SSOT.
 */
export const FAMILY_MASTER_MIGRATION_DEBT =
  "TEMPORARY — FINAL FAMILY MASTER MIGRATION TARGET";

export const TEMPORARY_COMPATIBILITY_DUPLICATION =
  "TEMPORARY_COMPATIBILITY_DUPLICATION";
