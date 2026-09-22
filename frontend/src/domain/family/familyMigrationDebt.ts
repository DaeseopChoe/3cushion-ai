/**
 * FAMILY MASTER MIGRATION DEBT
 *
 * Phase B-1 (2026-09-21): Local WRITE SSOT = NormalizedDatasetEnvelope
 * (`normalized_dataset` single key). FamilyMaster + FamilyMember are authoritative.
 *
 * Phase C-0 (2026-09-21): Position × Strategy Slot occupancy is now an explicit
 * domain invariant — (positionId, sourceSlot) → at most one familyId.
 * Flat PositionRecord.strategies S1/S2/S3 cardinality and normalized canonical
 * cardinality are aligned (not a migration debt; domain correction).
 *
 * Phase C (2026-09-22): Local READ / Search SSOT = normalized_dataset.
 * Search unit = FamilyMember geometry; Master resolved by familyId; selected
 * Position Strategies (S1/S2/S3) rematerialized only after Member rank.
 * Local Search does NOT read positions_dataset or family_* shadow as authority.
 *
 * Phase C-2 (2026-09-22): Local persisted flat / shadow compatibility REMOVED.
 * - positions_dataset = NOT production persist / NOT App load authority
 * - family_masters / family_members = NOT production dual-write / NOT fallback
 * - App runtime PositionRecord[] = on-demand rematerialize from normalized_dataset
 * - stale browser flat/shadow keys are ignored (never promoted to authority)
 *
 * Remaining EXTERNAL flat boundaries (until Phase D / E — not Local DB):
 * - Manual Export DatasetExportPayload schemaVersion 2 (flat records[])
 * - PublishOperation / PublishFamilyPayload / repository positions.json v2
 * - Published Search reads repository leaf (unchanged)
 * - workspace_history may still embed flat snapshot payloads
 *
 * Hydrated StrategyEntry may still carry Master common payload copies for
 * flat-compatible runtime consumers (TEMPORARY_COMPATIBILITY_DUPLICATION on
 * the rematerialized object — not a durable Local store).
 *
 * Ends fully when:
 * - Phase D Export/Publish leaf schema v3
 * - Phase E Published Search normalized
 * - remaining test/migration flat helpers retired (Phase G)
 *
 * Do not treat copied sysInputs / corrections / ai / str / canonical hpT
 * on SYMMETRY / Derived / Product Members as the final SSOT.
 */
export const FAMILY_MASTER_MIGRATION_DEBT =
  "TEMPORARY — FINAL FAMILY MASTER MIGRATION TARGET";

export const TEMPORARY_COMPATIBILITY_DUPLICATION =
  "TEMPORARY_COMPATIBILITY_DUPLICATION";
