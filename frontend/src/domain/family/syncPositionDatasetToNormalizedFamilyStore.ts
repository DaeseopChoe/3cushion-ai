/**
 * Phase 3A-326 — Shadow dual-write: positions_dataset corpus → family_* stores.
 *
 * Call ONLY after successful legacy positions_dataset persistence.
 * Never rolls back / deletes positions_dataset on normalized failure.
 * Production READ remains legacy (FAMILY_NORMALIZED_STORAGE_ENABLED = false).
 */

import type { PositionRecord } from "../positionSearchEngine";
import {
  migratePositionRecordsToFamilyParts,
  type FamilyMigrationIssue,
  type MigratePositionRecordsSuccess,
} from "./migratePositionRecordsToFamilyParts";
import {
  persistMigratedFamilyParts,
  validateFamilyStore,
  type FamilyStoreValidationFail,
  type FamilyStoreValidationOk,
} from "./familyNormalizedStore";

export type NormalizedDualWriteSuccess = {
  ok: true;
  masterCount: number;
  memberCount: number;
  skippedLegacySlots: number;
  validation: FamilyStoreValidationOk;
  migrated: MigratePositionRecordsSuccess;
};

export type NormalizedDualWriteFailure = {
  ok: false;
  stage: "migrate" | "persist" | "validate" | "exception";
  reason: string;
  issues?: FamilyMigrationIssue[];
  storeCode?: FamilyStoreValidationFail["code"];
};

export type NormalizedDualWriteResult =
  | NormalizedDualWriteSuccess
  | NormalizedDualWriteFailure;

/**
 * Sync full working PositionRecord[] into family_masters / family_members.
 * Fail-closed for normalized stores; never mutates positions_dataset.
 */
export function syncPositionDatasetToNormalizedFamilyStore(
  dataset: PositionRecord[] | null | undefined
): NormalizedDualWriteResult {
  try {
    if (typeof localStorage === "undefined") {
      return {
        ok: false,
        stage: "exception",
        reason: "localStorage is not available; normalized shadow sync skipped",
      };
    }
    const records = Array.isArray(dataset) ? dataset : [];
    const migrated = migratePositionRecordsToFamilyParts(records);
    if (!migrated.ok) {
      const reason =
        migrated.issues[0]?.reason ??
        `migration failed (${migrated.issues.length} issue(s))`;
      console.warn("[NORMALIZED_DUAL_WRITE] migrate failed", migrated.issues);
      return {
        ok: false,
        stage: "migrate",
        reason,
        issues: migrated.issues,
      };
    }

    const persisted = persistMigratedFamilyParts({
      masters: migrated.masters,
      members: migrated.members,
    });
    if (!persisted.ok) {
      console.warn("[NORMALIZED_DUAL_WRITE] persist failed", persisted);
      return {
        ok: false,
        stage: "persist",
        reason: persisted.reason,
        storeCode: persisted.code,
      };
    }

    const validation = validateFamilyStore();
    if (!validation.ok) {
      console.warn("[NORMALIZED_DUAL_WRITE] post-persist validate failed", validation);
      return {
        ok: false,
        stage: "validate",
        reason: validation.reason,
        storeCode: validation.code,
      };
    }

    return {
      ok: true,
      masterCount: validation.masterCount,
      memberCount: validation.memberCount,
      skippedLegacySlots: migrated.skippedLegacySlots,
      validation,
      migrated,
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn("[NORMALIZED_DUAL_WRITE] exception", reason);
    return { ok: false, stage: "exception", reason };
  }
}
