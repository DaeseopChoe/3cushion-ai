/**
 * Phase 3A-342 — Gated production READ boundary.
 *
 * Durable WRITE SSOT remains positions_dataset.
 * Normalized family_* is an optional READ projection when:
 *   flag ON ∧ corpus fresh ∧ compatible hydration succeeds.
 * Otherwise always fall back to loadWorkingDataset().
 *
 * READ never mutates positions, meta, or family stores.
 * Phase 3A-349: production default flag ON; eligibility gate unchanged.
 */

import { loadWorkingDataset } from "../dataset/infra/datasetStorage";
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

export type ProductionCompatibleReadSource = "legacy" | "normalized";

export type ProductionCompatibleReadReason =
  | "flag_off"
  | "freshness_ineligible"
  | "hydration_failed"
  | "hydration_exception"
  | "normalized_eligible";

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
 * Never writes storage. Failures → legacy positions_dataset (or empty catch of loader).
 */
export function loadProductionCompatibleDataset(): LoadProductionCompatibleDatasetResult {
  const legacy = loadWorkingDataset();

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
