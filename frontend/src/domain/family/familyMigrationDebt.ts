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
 * Remaining EXTERNAL flat / transport boundaries (kept intentionally):
 * - DatasetExportPayload schemaVersion 2 (legacy leaf / v2→v3 first-touch Publish)
 * - PublishOperation / PublishFamilyPayload (History Publish transport)
 * - repository positions.json may still be physical v2 until first-touch Publish
 * - workspace_history may still embed flat snapshot payloads
 *
 * Hydrated StrategyEntry may still carry Master common payload copies for
 * flat-compatible runtime consumers (TEMPORARY_COMPATIBILITY_DUPLICATION on
 * the rematerialized object — not a durable Local store).
 *
 * Ends fully when:
 * - remaining physical v2 leaves cut over via first-touch Publish (F-2+)
 * - remaining test/migration flat helpers retired (later cleanup)
 *
 * Do not treat copied sysInputs / corrections / ai / str / canonical hpT
 * on SYMMETRY / Derived / Product Members as the final SSOT.
 */
export const FAMILY_MASTER_MIGRATION_DEBT =
  "TEMPORARY — FINAL FAMILY MASTER MIGRATION TARGET";

export const TEMPORARY_COMPATIBILITY_DUPLICATION =
  "TEMPORARY_COMPATIBILITY_DUPLICATION";
