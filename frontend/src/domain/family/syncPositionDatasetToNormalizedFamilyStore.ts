/**
 * Phase 3A-326 / 3A-333 — Shadow dual-write: positions_dataset → family_*.
 *
 * Call ONLY after successful persistPositionsDatasetWithGeneration (committed corpusGeneration).
 * Never rolls back / deletes positions_dataset on normalized failure.
 * Dual-write is independent of FAMILY_NORMALIZED_STORAGE_ENABLED.
 * Production READ uses loadProductionCompatibleDataset (gated; flag OFF → legacy).
 */

import type { PositionRecord } from "../positionSearchEngine";
import { isValidCorpusGeneration } from "../dataset/infra/positionsDatasetMeta";
import {
  migratePositionRecordsToFamilyParts,
  type FamilyMigrationIssue,
  type MigratePositionRecordsSuccess,
} from "./migratePositionRecordsToFamilyParts";
import {
  evaluateNormalizedCorpusFreshness,
  type FamilyFreshnessResult,
} from "./familyCorpusFreshness";
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
  corpusGeneration: number;
  freshness: FamilyFreshnessResult;
  validation: FamilyStoreValidationOk;
  migrated: MigratePositionRecordsSuccess;
};

export type NormalizedDualWriteFailure = {
  ok: false;
  stage: "generation" | "migrate" | "persist" | "validate" | "freshness" | "exception";
  reason: string;
  corpusGeneration?: number;
  freshness?: FamilyFreshnessResult;
  issues?: FamilyMigrationIssue[];
  storeCode?: FamilyStoreValidationFail["code"];
};

export type NormalizedDualWriteResult =
  | NormalizedDualWriteSuccess
  | NormalizedDualWriteFailure;

export type SyncNormalizedFamilyStoreOptions = {
  /** Required: generation already bumped on positions_dataset_meta. */
  corpusGeneration: number;
};

/**
 * Sync full working PositionRecord[] into family_masters / family_members.
 * Fail-closed for normalized stores; never mutates positions_dataset.
 */
export function syncPositionDatasetToNormalizedFamilyStore(
  dataset: PositionRecord[] | null | undefined,
  options?: SyncNormalizedFamilyStoreOptions
): NormalizedDualWriteResult {
  try {
    if (typeof localStorage === "undefined") {
      return {
        ok: false,
        stage: "exception",
        reason: "localStorage is not available; normalized shadow sync skipped",
      };
    }

    const corpusGeneration = options?.corpusGeneration;
    if (!isValidCorpusGeneration(corpusGeneration)) {
      return {
        ok: false,
        stage: "generation",
        reason:
          "corpusGeneration required (>= 1); bump positions_dataset_meta before shadow sync",
        corpusGeneration:
          typeof corpusGeneration === "number" ? corpusGeneration : undefined,
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
        corpusGeneration,
        issues: migrated.issues,
        freshness: evaluateNormalizedCorpusFreshness(),
      };
    }

    const persisted = persistMigratedFamilyParts({
      masters: migrated.masters,
      members: migrated.members,
      corpusGeneration,
    });
    if (!persisted.ok) {
      console.warn("[NORMALIZED_DUAL_WRITE] persist failed", persisted);
      return {
        ok: false,
        stage: "persist",
        reason: persisted.reason,
        corpusGeneration,
        storeCode: persisted.code,
        freshness: evaluateNormalizedCorpusFreshness(),
      };
    }

    const validation = validateFamilyStore();
    if (!validation.ok) {
      console.warn("[NORMALIZED_DUAL_WRITE] post-persist validate failed", validation);
      return {
        ok: false,
        stage: "validate",
        reason: validation.reason,
        corpusGeneration,
        storeCode: validation.code,
        freshness: evaluateNormalizedCorpusFreshness(),
      };
    }

    const freshness = evaluateNormalizedCorpusFreshness();
    if (!freshness.ok || !freshness.fresh) {
      console.warn("[NORMALIZED_DUAL_WRITE] post-persist freshness failed", freshness);
      return {
        ok: false,
        stage: "freshness",
        reason:
          freshness.ok === false
            ? freshness.detail ?? freshness.reason
            : "normalized shadow not fresh after persist",
        corpusGeneration,
        freshness,
      };
    }

    return {
      ok: true,
      masterCount: validation.masterCount,
      memberCount: validation.memberCount,
      skippedLegacySlots: migrated.skippedLegacySlots,
      corpusGeneration,
      freshness,
      validation,
      migrated,
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn("[NORMALIZED_DUAL_WRITE] exception", reason);
    return { ok: false, stage: "exception", reason };
  }
}
