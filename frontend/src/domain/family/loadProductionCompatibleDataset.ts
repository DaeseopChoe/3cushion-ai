/**
 * Phase 3A-342 / B-1 — Production READ boundary.
 *
 * Phase B-1 WRITE SSOT = canonical NormalizedDatasetEnvelope
 *   (localStorage key: normalized_dataset).
 *
 * READ preference:
 *   1. Canonical envelope → rematerialize (when possible)
 *   2. Else flat positions_dataset compatibility projection
 *   3. Else gated family_* shadow rematerialize (legacy freshness path)
 *
 * Search algorithm unchanged — still consumes PositionRecord[].
 * READ never mutates storage.
 */

import { loadWorkingDataset } from "../dataset/infra/datasetStorage";
import {
  loadCanonicalNormalizedCorpus,
} from "../dataset/infra/canonicalNormalizedCorpusStore";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";
import type { PositionRecord } from "../positionSearchEngine";
import { isFamilyNormalizedStorageEnabled } from "./familyNormalizedFlag";
import {
  evaluateNormalizedCorpusFreshness,
  type FamilyFreshnessResult,
} from "./familyCorpusFreshness";
import {
  loadFamilyCompatibleDataset,
  type LoadFamilyCompatibleDatasetResult,
} from "./loadFamilyCompatibleDataset";

export type ProductionCompatibleReadSource =
  | "legacy"
  | "normalized"
  | "canonical";

export type ProductionCompatibleReadReason =
  | "flag_off"
  | "freshness_ineligible"
  | "hydration_failed"
  | "hydration_exception"
  | "normalized_eligible"
  | "canonical_rematerialized"
  | "canonical_present_flat_fallback"
  | "canonical_absent_legacy";

export type LoadProductionCompatibleDatasetResult = {
  dataset: PositionRecord[];
  source: ProductionCompatibleReadSource;
  reason: ProductionCompatibleReadReason;
  /** Present when freshness was evaluated (flag ON path). */
  freshness?: FamilyFreshnessResult;
  /** Present when hydration was attempted. */
  hydration?: LoadFamilyCompatibleDatasetResult;
};

/**
 * Production corpus READ for App startup / reload.
 * Never writes storage.
 */
export function loadProductionCompatibleDataset(): LoadProductionCompatibleDatasetResult {
  const legacy = loadWorkingDataset();

  // Prefer canonical single-key corpus when present and rematerializable.
  try {
    const canonical = loadCanonicalNormalizedCorpus();
    if (canonical.ok && canonical.present) {
      const remat = rematerializeFamilyPartsToPositionRecords({
        masters: canonical.envelope.familyMasters,
        members: canonical.envelope.familyMembers,
      });
      if (remat.ok) {
        return {
          dataset: remat.dataset,
          source: "canonical",
          reason: "canonical_rematerialized",
        };
      }
      // SLOT_COLLISION etc. — flat compatibility may still serve Search until Phase C.
      return {
        dataset: legacy,
        source: "legacy",
        reason: "canonical_present_flat_fallback",
      };
    }
  } catch {
    /* fall through to legacy / shadow paths */
  }

  if (!isFamilyNormalizedStorageEnabled()) {
    return {
      dataset: legacy,
      source: "legacy",
      reason: "flag_off",
    };
  }

  let freshness: FamilyFreshnessResult;
  try {
    freshness = evaluateNormalizedCorpusFreshness();
  } catch {
    return {
      dataset: legacy,
      source: "legacy",
      reason: "freshness_ineligible",
    };
  }

  if (!freshness.fresh) {
    return {
      dataset: legacy,
      source: "legacy",
      reason: "freshness_ineligible",
      freshness,
    };
  }

  let hydration: LoadFamilyCompatibleDatasetResult;
  try {
    hydration = loadFamilyCompatibleDataset();
  } catch {
    return {
      dataset: legacy,
      source: "legacy",
      reason: "hydration_exception",
      freshness,
    };
  }

  if (!hydration.ok) {
    return {
      dataset: legacy,
      source: "legacy",
      reason: "hydration_failed",
      freshness,
      hydration,
    };
  }

  return {
    dataset: hydration.dataset,
    source: "normalized",
    reason: "normalized_eligible",
    freshness,
    hydration,
  };
}
