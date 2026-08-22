/**
 * Phase 3A-333 — Normalized shadow freshness / generation eligibility.
 *
 * schema-valid ≠ fresh. referentially-valid ≠ current generation.
 * Used by loadProductionCompatibleDataset eligibility (flag ∧ fresh ∧ rematerialize).
 * Does not mutate storage. Flag OFF still forces legacy READ regardless of freshness.
 */

import {
  isValidCorpusGeneration,
  loadPositionsDatasetCorpusGeneration,
} from "../dataset/infra/positionsDatasetMeta";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMastersEnvelope,
  type FamilyMembersEnvelope,
} from "./familyNormalizedSchema";
import {
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
  validateFamilyStore,
  type FamilyStoreValidationFail,
} from "./familyNormalizedStore";

export type FamilyFreshnessReason =
  | "LEGACY_MARKER_MISSING"
  | "MASTER_MARKER_MISSING"
  | "MEMBER_MARKER_MISSING"
  | "GENERATION_MISMATCH"
  | "NORMALIZED_MISSING"
  | "NORMALIZED_PARTIAL"
  | "NORMALIZED_INVALID"
  | "SCHEMA_MISMATCH";

export type FamilyFreshnessSuccess = {
  ok: true;
  fresh: true;
  corpusGeneration: number;
  masterCount: number;
  memberCount: number;
};

export type FamilyFreshnessFailure = {
  ok: false;
  fresh: false;
  reason: FamilyFreshnessReason;
  detail?: string;
  legacyGeneration?: number | null;
  masterGeneration?: number | null;
  memberGeneration?: number | null;
  storeCode?: FamilyStoreValidationFail["code"];
};

export type FamilyFreshnessResult =
  | FamilyFreshnessSuccess
  | FamilyFreshnessFailure;

function readRawKeyPresent(key: string): boolean {
  try {
    return localStorage.getItem(key) != null;
  } catch {
    return false;
  }
}

function envelopeGeneration(
  env: FamilyMastersEnvelope | FamilyMembersEnvelope
): number | null {
  return isValidCorpusGeneration(env.corpusGeneration)
    ? env.corpusGeneration
    : null;
}

/**
 * Durable freshness predicate for normalized shadow vs positions_dataset_meta.
 * Never mutates storage. Safe to call while production READ is legacy-only.
 */
export function evaluateNormalizedCorpusFreshness(): FamilyFreshnessResult {
  const legacyGeneration = loadPositionsDatasetCorpusGeneration();
  if (legacyGeneration == null) {
    return {
      ok: false,
      fresh: false,
      reason: "LEGACY_MARKER_MISSING",
      legacyGeneration: null,
    };
  }

  const mastersPresent = readRawKeyPresent(FAMILY_MASTERS_STORAGE_KEY);
  const membersPresent = readRawKeyPresent(FAMILY_MEMBERS_STORAGE_KEY);

  if (!mastersPresent && !membersPresent) {
    return {
      ok: false,
      fresh: false,
      reason: "NORMALIZED_MISSING",
      legacyGeneration,
    };
  }
  if (!mastersPresent || !membersPresent) {
    return {
      ok: false,
      fresh: false,
      reason: "NORMALIZED_PARTIAL",
      detail: !mastersPresent
        ? "family_masters missing"
        : "family_members missing",
      legacyGeneration,
    };
  }

  const mastersEnv = loadFamilyMastersEnvelope();
  const membersEnv = loadFamilyMembersEnvelope();

  if (
    mastersEnv.schemaVersion !== FAMILY_NORMALIZED_SCHEMA_VERSION ||
    membersEnv.schemaVersion !== FAMILY_NORMALIZED_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      fresh: false,
      reason: "SCHEMA_MISMATCH",
      detail: `expected schemaVersion ${FAMILY_NORMALIZED_SCHEMA_VERSION}, got masters=${mastersEnv.schemaVersion} members=${membersEnv.schemaVersion}`,
      legacyGeneration,
      masterGeneration: envelopeGeneration(mastersEnv),
      memberGeneration: envelopeGeneration(membersEnv),
    };
  }

  const masterGeneration = envelopeGeneration(mastersEnv);
  if (masterGeneration == null) {
    return {
      ok: false,
      fresh: false,
      reason: "MASTER_MARKER_MISSING",
      legacyGeneration,
      masterGeneration: null,
      memberGeneration: envelopeGeneration(membersEnv),
    };
  }

  const memberGeneration = envelopeGeneration(membersEnv);
  if (memberGeneration == null) {
    return {
      ok: false,
      fresh: false,
      reason: "MEMBER_MARKER_MISSING",
      legacyGeneration,
      masterGeneration,
      memberGeneration: null,
    };
  }

  if (
    masterGeneration !== memberGeneration ||
    masterGeneration !== legacyGeneration
  ) {
    return {
      ok: false,
      fresh: false,
      reason: "GENERATION_MISMATCH",
      detail: `legacy=${legacyGeneration} masters=${masterGeneration} members=${memberGeneration}`,
      legacyGeneration,
      masterGeneration,
      memberGeneration,
    };
  }

  const validation = validateFamilyStore(mastersEnv, membersEnv);
  if (!validation.ok) {
    return {
      ok: false,
      fresh: false,
      reason: "NORMALIZED_INVALID",
      detail: validation.reason,
      storeCode: validation.code,
      legacyGeneration,
      masterGeneration,
      memberGeneration,
    };
  }

  return {
    ok: true,
    fresh: true,
    corpusGeneration: legacyGeneration,
    masterCount: validation.masterCount,
    memberCount: validation.memberCount,
  };
}

/** Convenience: true only when evaluateNormalizedCorpusFreshness().fresh. */
export function isNormalizedCorpusFresh(): boolean {
  return evaluateNormalizedCorpusFreshness().fresh === true;
}
