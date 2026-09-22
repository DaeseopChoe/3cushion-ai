/**
 * Phase C-2 — Production App corpus READ: canonical normalized only.
 *
 * Local Durable SSOT = localStorage key normalized_dataset
 *   (NormalizedDatasetEnvelope → rematerialize → PositionRecord[] memory).
 *
 * Phase C Local Search does NOT use this loader — Search reads
 * normalized_dataset Member-centrically via runNormalizedLocalMemberSearch.
 *
 * This loader rematerializes for non-Search runtime consumers
 * (SAVE working dataset mirror, Export projection inputs, UI, etc.).
 *
 * FAIL-CLOSED:
 *   - corrupt / invalid canonical → empty dataset (no flat/shadow fallback)
 *   - rematerialize failure → empty dataset (no flat/shadow fallback)
 *   - canonical absent (fresh) → empty dataset
 *
 * NEVER reads positions_dataset or family_masters / family_members as authority.
 * READ never mutates storage.
 */

import {
  loadCanonicalNormalizedCorpus,
} from "../dataset/infra/canonicalNormalizedCorpusStore";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";
import type { PositionRecord } from "../positionSearchEngine";
import type { RematerializeIssue } from "./rematerializeFamilyPartsToPositionRecords";
import type { NormalizedDatasetIssue } from "../dataset/normalizedDatasetEnvelope";

export type ProductionCompatibleReadSource = "canonical" | "empty";

export type ProductionCompatibleReadReason =
  | "canonical_rematerialized"
  | "canonical_absent_empty"
  | "canonical_invalid"
  | "rematerialize_failed";

export type LoadProductionCompatibleDatasetResult = {
  dataset: PositionRecord[];
  source: ProductionCompatibleReadSource;
  reason: ProductionCompatibleReadReason;
  /** Present when canonical parse failed. */
  issues?: NormalizedDatasetIssue[];
  /** Present when rematerialize failed. */
  rematerializeIssues?: RematerializeIssue[];
};

/**
 * Production corpus READ for App startup / reload.
 * Canonical normalized_dataset only — never writes storage.
 */
export function loadProductionCompatibleDataset(): LoadProductionCompatibleDatasetResult {
  const canonical = loadCanonicalNormalizedCorpus();

  if (!canonical.ok) {
    return {
      dataset: [],
      source: "empty",
      reason: "canonical_invalid",
      issues: canonical.issues,
    };
  }

  if (!canonical.present) {
    return {
      dataset: [],
      source: "empty",
      reason: "canonical_absent_empty",
    };
  }

  try {
    const remat = rematerializeFamilyPartsToPositionRecords({
      masters: canonical.envelope.familyMasters,
      members: canonical.envelope.familyMembers,
    });
    if (!remat.ok) {
      return {
        dataset: [],
        source: "empty",
        reason: "rematerialize_failed",
        rematerializeIssues: remat.issues,
      };
    }
    return {
      dataset: remat.dataset,
      source: "canonical",
      reason: "canonical_rematerialized",
    };
  } catch {
    return {
      dataset: [],
      source: "empty",
      reason: "rematerialize_failed",
    };
  }
}

/**
 * Rematerialize canonical corpus to PositionRecord[] for Export / History
 * legacy fallbacks. Never reads positions_dataset.
 */
export function loadRematerializedWorkingCorpus(): PositionRecord[] {
  return loadProductionCompatibleDataset().dataset;
}
